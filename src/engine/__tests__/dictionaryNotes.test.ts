import { describe, expect, it } from 'vitest'
import { dismissLookup, emptyNotes, lookupSuggestions, mergeNotes, noteLookup, parseMeanings, setFix } from '../dictionaryNotes'

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
