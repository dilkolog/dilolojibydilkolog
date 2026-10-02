import { describe, expect, it } from 'vitest'
import type { Backup } from './db'
import { generateSyncCode, mergeBackups, normalizeCode, open, seal, syncIdOf } from './sync'

const base = (exportedAt: string, over: Partial<Backup> = {}): Backup => ({
  app: 'kelime-koc',
  version: 3,
  exportedAt,
  vocabulary: [],
  wordStates: [],
  events: [],
  mistakes: [],
  ...over,
})

const word = (id: string, gloss = 'x') => ({ id, lemma: id, senses: [{ id: `${id}#1`, gloss, examples: [] }] }) as unknown as Backup['vocabulary'][number]
const state = (entryId: string, last: string, reviews: number) => ({ entryId, lastReviewAt: new Date(last), stats: { reviews } }) as unknown as Backup['wordStates'][number]
const event = (id: string, entryId: string) => ({ id, entryId }) as unknown as Backup['events'][number]

describe('sync', () => {
  it('makes readable codes and a stable, code-independent-looking id', async () => {
    const code = generateSyncCode()
    expect(code).toMatch(/^[A-Z2-9]{5}(-[A-Z2-9]{5}){3}$/)
    expect(await syncIdOf(code)).toBe(await syncIdOf(code.toLowerCase().replace(/-/g, ' ')))
    expect(await syncIdOf(code)).toMatch(/^[0-9a-f]{64}$/)
    expect(normalizeCode('ab-cd 12')).toBe('ABCD12')
  })

  it('seals and opens data, and a wrong code cannot open it', async () => {
    const data = new TextEncoder().encode('{"hello":"dünya"}'.repeat(50))
    const sealed = await seal(data, 'AAAAA-BBBBB')
    expect(sealed.length).toBeLessThan(data.length)
    expect(new TextDecoder().decode(await open(sealed, 'aaaaa bbbbb'))).toBe(new TextDecoder().decode(data))
    await expect(open(sealed, 'CCCCC-DDDDD')).rejects.toThrow()
  }, 20_000) // key derivation is deliberately slow

  it('merges two devices without losing answers, keeping the latest state and honouring deletions', () => {
    const laptop = base('2026-10-02T10:00:00Z', {
      vocabulary: [word('fr:chat', 'kedi'), word('fr:chien')],
      wordStates: [state('fr:chat', '2026-10-02T09:00:00Z', 5)],
      events: [event('e1', 'fr:chat'), event('e2', 'fr:chien')],
      deleted: [],
    })
    const phone = base('2026-10-02T12:00:00Z', {
      vocabulary: [word('fr:chat', 'kedi, pisi'), word('fr:maison')],
      wordStates: [state('fr:chat', '2026-10-01T09:00:00Z', 3), state('fr:maison', '2026-10-02T11:00:00Z', 1)],
      events: [event('e1', 'fr:chat'), event('e3', 'fr:maison')],
      deleted: ['fr:chien'],
    })
    const m = mergeBackups(laptop, phone)
    expect(m.vocabulary.map((v) => v.id).sort()).toEqual(['fr:chat', 'fr:maison'])
    expect(m.vocabulary.find((v) => v.id === 'fr:chat')!.senses[0].gloss).toBe('kedi, pisi')
    expect(m.wordStates.find((s) => s.entryId === 'fr:chat')!.stats.reviews).toBe(5)
    expect(m.events.map((e) => e.id).sort()).toEqual(['e1', 'e3'])
    expect(m.deleted).toEqual(['fr:chien'])
    // Merging the result again changes nothing.
    expect(mergeBackups(m, phone).events.length).toBe(2)
  })
})
