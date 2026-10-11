import { describe, expect, it } from 'vitest'
import { addEntry, dismissLookup, emptyNotes, findAdded, removeEntry, lookupSuggestions, mergeNotes, noteLookup, parseMeanings, setFix } from '../dictionaryNotes'

const T1 = '2026-10-01T10:00:00Z'
const T2 = '2026-10-07T10:00:00Z'

describe('dictionary corrections', () => {
  it('reads what the learner typed as meanings', () => {
    expect(parseMeanings(' ev,  konut ; yuva\nev ')).toEqual(['ev', 'konut', 'yuva'])
    expect(parseMeanings(' , ')).toEqual([])
  })

  it('sets a correction and clears it with no meanings', () => {
    const fixed = setFix(emptyNotes(), 'maison', ['ev', 'yuva'], T1)
    expect(fixed.fixes.maison).toEqual({ t: ['ev', 'yuva'], at: T1 })
    expect(setFix(fixed, 'maison', [], T2).fixes).toEqual({})
  })
})

describe('look-ups', () => {
  it('counts look-ups and offers the words looked up twice that are not in the list', () => {
    let n = emptyNotes()
    n = noteLookup(n, 'maison', T1)
    n = noteLookup(n, 'maison', T2)
    n = noteLookup(n, 'décider', T1)
    n = noteLookup(n, 'décider', T1)
    n = noteLookup(n, 'décider', T2)
    n = noteLookup(n, 'chat', T2)
    n = noteLookup(n, 'livre', T1)
    n = noteLookup(n, 'livre', T2)
    expect(n.looked.maison).toEqual({ n: 2, at: T2 })
    // livre is in the list; chat was looked up once.
    expect(lookupSuggestions(n, (w) => w === 'livre')).toEqual([
      { word: 'décider', n: 3 },
      { word: 'maison', n: 2 },
    ])
  })

  it('stops offering a word the learner turned down', () => {
    const n = dismissLookup(noteLookup(noteLookup(emptyNotes(), 'maison', T1), 'maison', T2), 'maison')
    expect(lookupSuggestions(n, () => false)).toEqual([])
    // Looking it up again keeps the "no".
    expect(lookupSuggestions(noteLookup(n, 'maison', T2), () => false)).toEqual([])
  })
})

describe('two devices', () => {
  it('keeps the later correction, the larger count and a "no"', () => {
    const a = { fixes: { maison: { t: ['ev'], at: T1 } }, looked: { maison: { n: 3, at: T1 }, chat: { n: 1, at: T1, dismissed: true } } }
    const b = { fixes: { maison: { t: ['yuva'], at: T2 }, livre: { t: ['kitap'], at: T1 } }, looked: { maison: { n: 2, at: T2 }, chat: { n: 4, at: T2 } } }
    expect(mergeNotes(a, b)).toEqual({
      fixes: { maison: { t: ['yuva'], at: T2 }, livre: { t: ['kitap'], at: T1 } },
      looked: { maison: { n: 3, at: T2 }, chat: { n: 4, at: T2, dismissed: true } },
    })
    expect(mergeNotes(undefined, b)).toBe(b)
  })

  it('handles Date objects and plain {} objects defensively', () => {
    const notes = {
      fixes: {
        chat: { t: ['kedi'], at: new Date('2026-10-05T10:00:00Z') as unknown as string },
        chien: { t: ['köpek'], at: {} as unknown as string },
      },
      looked: {
        chat: { n: 2, at: new Date('2026-10-05T10:00:00Z') as unknown as string },
        chien: { n: 2, at: {} as unknown as string },
      },
    }
    expect(() => lookupSuggestions(notes, () => false)).not.toThrow()
    const suggestions = lookupSuggestions(notes, () => false)
    expect(suggestions.map((s) => s.word)).toEqual(['chat', 'chien'])
    expect(() => mergeNotes(notes, notes)).not.toThrow()
  })
})

describe('saved words (what the pack lacks)', () => {
  it('saves a word under its lower-case key, replaces it on a second save, and takes it out', () => {
    let n = addEntry(emptyNotes(), '  Gribouiller ', ['karalamak'], T1, 'deepl', 'fr')
    expect(n.added).toEqual({ gribouiller: { t: ['karalamak'], at: T1, from: 'deepl' } })
    n = addEntry(n, 'gribouiller', ['çiziktirmek'], T2, 'own', 'fr')
    expect(n.added!.gribouiller.t).toEqual(['çiziktirmek'])
    expect(removeEntry(n, 'gribouiller').added).toEqual({})
    // Nothing to save without a word or a meaning.
    expect(addEntry(emptyNotes(), 'mot', [], T1, 'own', 'fr')).toEqual(emptyNotes())
    expect(addEntry(emptyNotes(), '  ', ['x'], T1, 'own', 'fr')).toEqual(emptyNotes())
  })

  it('finds a saved word by the word, its start or a Turkish meaning, the exact word first', () => {
    let n = addEntry(emptyNotes(), 'gribouiller', ['karalamak'], T1, 'deepl', 'fr')
    n = addEntry(n, 'gribouillis', ['karalama'], T1, 'deepl', 'fr')
    expect(findAdded(n, 'gribouiller', 'fr').map((e) => [e.word, e.exact])).toEqual([['gribouiller', true]])
    expect(findAdded(n, 'gribouill', 'fr').map((e) => e.word)).toEqual(['gribouiller', 'gribouillis'])
    expect(findAdded(n, 'karala', 'fr').map((e) => e.word)).toEqual(['gribouiller', 'gribouillis'])
    expect(findAdded(n, 'maison', 'fr')).toEqual([])
    expect(findAdded(n, '', 'fr')).toEqual([])
  })

  it('matches a Turkish meaning only from three letters, so one or two typed letters do not list everything', () => {
    const n = addEntry(emptyNotes(), 'lumière', ['ışık'], T1, 'own', 'fr')
    expect(findAdded(n, 'ı', 'fr')).toEqual([])
    expect(findAdded(n, 'ış', 'fr')).toEqual([])
    expect(findAdded(n, 'ışı', 'fr').map((e) => e.word)).toEqual(['lumière'])
  })

  it('finds a saved word without its accents, and a Turkish meaning typed with a capital dotless I', () => {
    const n = addEntry(addEntry(emptyNotes(), 'école', ['okul'], T1, 'own', 'fr'), 'lumière', ['ışık'], T1, 'own', 'fr')
    expect(findAdded(n, 'ecole', 'fr').map((e) => [e.word, e.exact])).toEqual([['école', true]])
    expect(findAdded(n, 'Işık', 'fr').map((e) => e.word)).toEqual(['lumière'])
    expect(findAdded(n, 'isik', 'fr').map((e) => e.word)).toEqual([])
  })

  it('merges two devices: both words kept, the later save of one word wins', () => {
    const a = addEntry(addEntry(emptyNotes(), 'un', ['bir'], T1, 'own', 'fr'), 'deux', ['iki'], T1, 'own', 'fr')
    const b = addEntry(emptyNotes(), 'deux', ['ikili'], T2, 'deepl', 'fr')
    expect(mergeNotes(a, b)!.added).toEqual({ un: { t: ['bir'], at: T1, from: 'own' }, deux: { t: ['ikili'], at: T2, from: 'deepl' } })
  })
})
