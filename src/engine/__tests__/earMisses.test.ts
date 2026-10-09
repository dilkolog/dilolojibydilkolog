import { describe, expect, it } from 'vitest'
import { mergeEarLogs, recordDictation, topMisses } from '../earMisses'
import { wordDiff } from '../wordDiff'

const at = (d: string) => new Date(`2026-10-${d}T10:00:00Z`)

describe('ear misses', () => {
  it('notes the words not written, counts them written right later, and ranks those still missed', () => {
    let log = recordDictation({}, 'fr', 'Il fait beau.', wordDiff('Il fait', 'Il fait beau.'), at('01'))
    log = recordDictation(log, 'fr', 'Je le vois.', wordDiff('Je vois', 'Je le vois.'), at('02'))
    log = recordDictation(log, 'fr', "C'est le jour.", wordDiff("C'est jour", "C'est le jour."), at('03'))
    log = recordDictation(log, 'fr', 'Il fait beau ici.', wordDiff('Il fait beau ici', 'Il fait beau ici.'), at('04'))
    expect(log.fr!.le).toEqual({ n: 2, ok: 0, last: at('03').toISOString(), sentence: "C'est le jour." })
    // "beau" was missed once and written right once: no longer in the ones to train.
    expect(log.fr!.beau).toMatchObject({ n: 1, ok: 1 })
    expect(topMisses(log, 'fr').map((t) => t.word)).toEqual(['le'])
    // Words written right that were never missed are not noted.
    expect(log.fr!.il).toBeUndefined()
  })
  it('merges two devices: larger counts, newer sentence', () => {
    const a = { fr: { le: { n: 2, ok: 0, last: '2026-10-01', sentence: 'A le.' } } }
    const b = { fr: { le: { n: 1, ok: 1, last: '2026-10-05', sentence: 'B le.' }, de: { n: 1, ok: 0, last: '2026-10-02', sentence: 'C de.' } } }
    expect(mergeEarLogs(a, b)).toEqual({ fr: { le: { n: 2, ok: 1, last: '2026-10-05', sentence: 'B le.' }, de: { n: 1, ok: 0, last: '2026-10-02', sentence: 'C de.' } } })
  })
  it('handles Date objects and plain {} objects defensively', () => {
    const raw = {
      fr: {
        chat: { n: 3, ok: 0, last: new Date('2026-10-05T10:00:00Z') as unknown as string, sentence: 'Un chat.' },
        chien: { n: 3, ok: 0, last: {} as unknown as string, sentence: 'Un chien.' },
      },
    }
    expect(() => topMisses(raw, 'fr')).not.toThrow()
    const misses = topMisses(raw, 'fr')
    expect(misses.map((m) => m.word)).toEqual(['chat', 'chien'])
    const merged = mergeEarLogs(raw, {})
    expect(merged.fr!.chat.n).toBe(3)
  })
})
