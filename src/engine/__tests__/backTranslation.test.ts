import { describe, expect, it } from 'vitest'
import { backTranslationItems, loopItems, loopReady } from '../backTranslation'
import type { SentenceCard } from '../sentences'
import type { TranslationEntry } from '../translationMemory'

const entry = (text: string, translation: string, from: TranslationEntry['from'], to: TranslationEntry['to']): TranslationEntry => ({ text, translation, from, to, at: '2026-10-09T10:00:00Z' })

describe('backTranslationItems', () => {
  it('takes sentences either way between the language and Turkish, not single words, other languages or carded ones', () => {
    const memory = [
      entry('Le chat dort sur le canapé.', 'Kedi kanepede uyuyor.', 'fr', 'tr'),
      entry('Yarın erken yola çıkıyoruz.', 'Nous partons tôt demain.', 'tr', 'fr'),
      entry('maison', 'ev', 'fr', 'tr'),
      entry('The cat sleeps on the sofa.', 'Kedi kanepede uyuyor.', 'en', 'tr'),
      entry('Il fait très beau  aujourd’hui.', 'Bugün hava çok güzel.', 'fr', 'tr'),
    ]
    const cards = [{ language: 'fr', text: 'Il fait très beau aujourd’hui.' }] as SentenceCard[]
    expect(backTranslationItems(memory, cards, 'fr')).toEqual([
      { text: 'Le chat dort sur le canapé.', turkish: 'Kedi kanepede uyuyor.', at: '2026-10-09T10:00:00Z' },
      { text: 'Nous partons tôt demain.', turkish: 'Yarın erken yola çıkıyoruz.', at: '2026-10-09T10:00:00Z' },
    ])
  })
})

describe('the loop', () => {
  const item = (at: string) => ({ text: 'a b c', turkish: 'x', at })
  const now = new Date('2026-10-10T10:00:00Z')

  it('takes back a translation after half a day, not before', () => {
    expect(loopReady(item('2026-10-09T10:00:00Z'), now)).toBe(true)
    expect(loopReady(item('2026-10-09T22:30:00Z'), now)).toBe(false)
    expect(loopReady(item('2026-10-10T09:00:00Z'), now)).toBe(false)
  })

  it('keeps the order of the sentences that have rested, and reads a stored Date too', () => {
    const items = [item('2026-10-10T09:00:00Z'), item('2026-10-08T09:00:00Z'), { ...item('x'), at: new Date('2026-10-09T01:00:00Z') as unknown as string }]
    expect(loopItems(items, now)).toEqual(items.slice(1))
  })
})
