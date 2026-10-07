// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { fillParallel } from './corpus'
import { KelimeDB } from './db'
import { originOf, withSources } from './provenance'
import { createEntry } from './wordInput'
import type { Example } from '../engine/types'

const sentence = (id: number, text: string, extra: Partial<Example> = {}): Example => ({ text, translation: '', form: 'maison', source: { kind: 'tatoeba', id }, ...extra })

/** Tatoeba's single-sentence answers by id; records the ids asked. */
function stubTatoeba(answers: Record<number, number | { lang: string; text: string; is_direct?: boolean }[]>) {
  const asked: number[] = []
  vi.stubGlobal('fetch', async (url: string) => {
    const u = new URL(url)
    const id = Number(u.pathname.split('/').pop())
    asked.push(id)
    expect(u.searchParams.get('showtrans:lang')).toBe('eng,spa')
    const a = answers[id]
    if (typeof a === 'number') return new Response('', { status: a })
    return new Response(JSON.stringify({ data: { id, text: 'x', translations: a ?? [] } }))
  })
  return asked
}

afterEach(() => vi.unstubAllGlobals())

describe('filling in the other languages of saved sentences', () => {
  it('adds them to the sentences that lack them, keeps the list and its source note, and marks the ones with none', async () => {
    const db = new KelimeDB('t-parallel-1')
    const e = withSources(
      {
        ...createEntry({ word: 'maison', meaning: 'ev', partOfSpeech: 'noun' }, 'fr', new Date()),
        corpus: [sentence(1, 'La maison est grande.'), sentence(2, 'Une maison bleue.', { parallel: { en: 'A blue house.' } }), sentence(3, 'Ma maison.'), sentence(4, 'Sa maison.')],
      },
      { corpus: 'tatoeba' },
    )
    await db.vocabulary.put(e)
    const asked = stubTatoeba({ 1: [{ lang: 'eng', text: 'The house is big.' }, { lang: 'spa', text: 'La casa es grande.', is_direct: true }], 3: [], 4: 404 })
    expect(await fillParallel(db, 'fr')).toBe(1)
    // The one that already had them is not asked again.
    expect(asked).toEqual([1, 3, 4])
    const saved = (await db.vocabulary.get(e.id))!
    expect(saved.corpus!.map((x) => x.text)).toEqual(e.corpus!.map((x) => x.text))
    expect(saved.corpus!.map((x) => x.parallel)).toEqual([{ en: 'The house is big.', es: 'La casa es grande.' }, { en: 'A blue house.' }, {}, {}])
    expect(originOf(saved, 'corpus')).toMatchObject({ kind: 'tatoeba' })
    // Nothing left to ask.
    expect(await fillParallel(db, 'fr')).toBe(0)
  })

  it('stops for this run when Tatoeba is busy or down, keeping what it found', async () => {
    const db = new KelimeDB('t-parallel-2')
    const e = { ...createEntry({ word: 'maison', meaning: 'ev', partOfSpeech: 'noun' }, 'fr', new Date()), corpus: [sentence(1, 'A maison.'), sentence(2, 'B maison.'), sentence(3, 'C maison.')] }
    await db.vocabulary.put(e)
    const asked = stubTatoeba({ 1: [{ lang: 'eng', text: 'A house.' }], 2: 429 })
    await fillParallel(db, 'fr')
    expect(asked).toEqual([1, 2])
    const saved = (await db.vocabulary.get(e.id))!
    expect(saved.corpus!.map((x) => x.parallel)).toEqual([{ en: 'A house.' }, undefined, undefined])
  })

  it('asks at most its budget per run', async () => {
    const db = new KelimeDB('t-parallel-3')
    const many = Array.from({ length: 10 }, (_, i) => sentence(i + 1, `Maison ${i}.`))
    await db.vocabulary.put({ ...createEntry({ word: 'maison', meaning: 'ev', partOfSpeech: 'noun' }, 'fr', new Date()), corpus: many })
    const asked = stubTatoeba({})
    await fillParallel(db, 'fr', 4)
    expect(asked).toHaveLength(4)
  })
})
