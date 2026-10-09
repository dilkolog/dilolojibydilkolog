import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from './instance'
import { createEntry } from './wordInput'
import { newSentence } from '../engine/sentences'
import { createScheduler } from '../engine/scheduler'
import { fillTranslations, missingTranslations } from './fillTranslations'
import { translate } from './translate'

const at = new Date('2026-10-09T10:00:00')

describe('filling missing translations', () => {
  let asked: string[]
  const server = (answer: (text: string) => Response) => {
    asked = []
    vi.stubGlobal('fetch', async (url: string) => {
      const text = new URL(url, 'https://app.test').searchParams.get('text') ?? ''
      asked.push(text)
      return answer(text)
    })
  }
  beforeEach(async () => {
    await Promise.all([db.vocabulary.clear(), db.meta.delete('sentences'), db.meta.delete('translations')])
    await db.vocabulary.put(createEntry({ word: 'le chat', meaning: 'kedi', example: 'Le chat dort.' }, 'fr', at))
    await db.vocabulary.put(createEntry({ word: 'la mer', meaning: 'deniz', example: 'La mer est belle.', exampleTranslation: 'Deniz güzel.' }, 'fr', at))
    await db.saveSentence(newSentence({ language: 'fr', text: 'Il pleut beaucoup.' }, createScheduler({ fuzz: false }), at))
  })
  afterEach(() => vi.unstubAllGlobals())

  it('finds the sentences without Turkish, fills them, and keeps the translations in the memory', async () => {
    expect((await missingTranslations()).map((m) => m.text).sort()).toEqual(['Il pleut beaucoup.', 'Le chat dort.'])
    server((t) => Response.json({ translation: { 'Le chat dort.': 'Kedi uyuyor.', 'Il pleut beaucoup.': 'Çok yağmur yağıyor.' }[t] }))
    const progress: number[] = []
    const r = await fillTranslations((done) => progress.push(done))
    expect(r).toEqual({ filled: 2, total: 2 })
    expect(progress).toEqual([1, 2])
    expect((await db.vocabulary.get('fr:chat'))!.senses[0].examples[0].translation).toBe('Kedi uyuyor.')
    expect((await db.getSentences())[0].translation).toBe('Çok yağmur yağıyor.')
    expect(await missingTranslations()).toEqual([])
    // Kept in the memory (written in the background): asked again, no request goes out.
    await new Promise((r) => setTimeout(r, 50))
    expect((await db.getTranslations()).map((t) => t.text).sort()).toEqual(['Il pleut beaucoup.', 'Le chat dort.'])
  })

  it('a text in the memory is answered from it, without the server', async () => {
    await db.saveTranslations([{ text: 'Bonjour à tous.', translation: 'Herkese merhaba.', from: 'fr', to: 'tr', at: '2026-10-01T00:00:00Z' }])
    server(() => Response.json({ translation: '?' }))
    expect(await translate('Bonjour à tous.', 'fr')).toBe('Herkese merhaba.')
    expect(asked).toEqual([])
  })

  it('stops at a month used up and says why', async () => {
    // A sentence never translated before (the others are remembered from the first test).
    await db.vocabulary.put(createEntry({ word: 'le loup', meaning: 'kurt', example: 'Le loup court vite.' }, 'fr', at))
    server(() => Response.json({ error: 'quota' }, { status: 429 }))
    const r = await fillTranslations(() => {})
    expect(r.stopped).toMatch(/kotası doldu/)
    expect(r.filled).toBeLessThan(r.total)
    expect((await db.vocabulary.get('fr:loup'))!.senses[0].examples[0].translation).toBe('')
  })
})
