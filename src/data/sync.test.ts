import { describe, expect, it } from 'vitest'
import type { Backup } from './db'
import type { LabData } from '../engine/labProgress'
import { generateSyncCode, mergeBackups, mergeLab, normalizeCode, open, seal, syncIdOf } from './sync'

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
    expect(m.deleted).toEqual([{ id: 'fr:chien', at: '2026-10-02T12:00:00.000Z' }])
    // Merging the result again changes nothing.
    expect(mergeBackups(m, phone).events.length).toBe(2)
  })

  it('keeps a word added again after its deletion, but not an old copy of it', () => {
    const added = (id: string, at: string) => ({ ...word(id), addedAt: new Date(at) }) as Backup['vocabulary'][number]
    const phone = base('2026-10-02T12:00:00Z', { deleted: [{ id: 'fr:chien', at: '2026-10-02T11:00:00Z' }] })
    // Laptop never synced since: still has the old copy. Tablet added the word again later.
    const laptop = base('2026-10-02T13:00:00Z', { vocabulary: [added('fr:chien', '2026-09-01T00:00:00Z')] })
    expect(mergeBackups(laptop, phone).vocabulary).toEqual([])
    const tablet = base('2026-10-02T14:00:00Z', { vocabulary: [added('fr:chien', '2026-10-02T13:30:00Z')] })
    expect(mergeBackups(tablet, phone).vocabulary.map((v) => v.id)).toEqual(['fr:chien'])
  })

  it('honours an undo (alive again) over the deletion, and deletes reading texts too', () => {
    const text = { id: 't1', language: 'fr', title: 'x', text: 'x', addedAt: '2026-09-01T00:00:00Z', history: [] }
    const a = base('2026-10-02T12:00:00Z', { vocabulary: [word('fr:chat')], deleted: [{ id: 'fr:chat', at: '2026-10-02T11:00:00Z', alive: true }] })
    const b = base('2026-10-02T11:30:00Z', { deleted: ['fr:chat', { id: 't1', at: '2026-10-02T11:10:00Z' }], reading: { known: {}, encounters: {}, library: [text as never] } })
    const m = mergeBackups(a, b)
    expect(m.vocabulary.map((v) => v.id)).toEqual([])
    // The bare legacy id counts from its snapshot (11:30), after the undo (11:00): deleted.
    const undoLater = base('2026-10-02T12:00:00Z', { vocabulary: [word('fr:chat')], deleted: [{ id: 'fr:chat', at: '2026-10-02T11:45:00Z', alive: true }] })
    expect(mergeBackups(undoLater, b).vocabulary.map((v) => v.id)).toEqual(['fr:chat'])
    expect(m.reading?.library).toEqual([])
  })

  it('merges word lists: the later rename wins, a deleted list stays deleted', () => {
    const list = (id: string, name: string, updatedAt: string) => ({ id, language: 'fr' as const, name, createdAt: '2026-10-01T10:00:00Z', updatedAt })
    const a = base('2026-10-02T10:00:00Z', { lists: [list('l1', 'Seyahat', '2026-10-02T09:00:00Z'), list('l2', 'İş', '2026-10-01T10:00:00Z')] })
    const b = base('2026-10-02T11:00:00Z', { lists: [list('l1', 'Yolculuk', '2026-10-01T12:00:00Z')], deleted: [{ id: 'l2', at: '2026-10-02T10:30:00Z', alive: false }] })
    expect(mergeBackups(a, b).lists).toEqual([list('l1', 'Seyahat', '2026-10-02T09:00:00Z')])
  })
})

describe('the verb lab across devices', () => {
  const rec = (ok: number, wrong: number, last: string) => ({ ok, wrong, points: ok * 10, card: { last_review: new Date(last) } }) as unknown as LabData['records'][string]
  const lab = (over: Partial<LabData>): LabData => ({ favorites: [], recent: [], records: {}, ...over })

  it('joins favourites and recent verbs, newest device first', () => {
    const m = mergeLab(lab({ favorites: ['comer'], recent: ['comer', 'ir'] }), lab({ favorites: ['hablar'], recent: ['hablar', 'comer'] }))!
    expect(m.favorites).toEqual(['hablar', 'comer'])
    expect(m.recent).toEqual(['hablar', 'comer', 'ir'])
  })

  it('each form keeps the record with more answers; counts keep the larger', () => {
    const m = mergeLab(
      lab({ records: { 'comer|presente': rec(2, 0, '2026-10-01T10:00:00Z'), 'ir|presente': rec(1, 0, '2026-10-01T10:00:00Z') }, tally: { 'presente|0': { ok: 3, wrong: 1 } }, kinds: { accent: 2 } }),
      lab({ records: { 'comer|presente': rec(5, 1, '2026-10-02T10:00:00Z') }, tally: { 'presente|0': { ok: 2, wrong: 4 } }, kinds: { accent: 1, person: 3 } }),
    )!
    expect(m.records['comer|presente'].ok).toBe(5)
    expect(m.records['ir|presente'].ok).toBe(1)
    expect(m.tally!['presente|0']).toEqual({ ok: 3, wrong: 4 })
    expect(m.kinds).toEqual({ accent: 2, person: 3 })
  })

  it('answers per day keep the larger count from either device', () => {
    const m = mergeLab(lab({ days: { '2026-10-06': { ok: 4, wrong: 1 }, '2026-10-07': { ok: 1, wrong: 0 } } }), lab({ days: { '2026-10-07': { ok: 3, wrong: 2 } } }))!
    expect(m.days).toEqual({ '2026-10-06': { ok: 4, wrong: 1 }, '2026-10-07': { ok: 3, wrong: 2 } })
  })

  it('a device that never used the lab changes nothing', () => {
    const l = lab({ favorites: ['comer'] })
    expect(mergeLab(undefined, l)).toBe(l)
    expect(mergeLab(l, undefined)).toBe(l)
  })

  it('travels in the merged backup, with the game records (the larger of each)', () => {
    const a = base('2026-10-02T10:00:00Z', { lab: { es: lab({ favorites: ['comer'] }) }, records: { 'verbtimed:es:easy': 80, 'match:es': 10 } })
    const b = base('2026-10-03T10:00:00Z', { lab: { es: lab({ favorites: ['hablar'] }) }, records: { 'verbtimed:es:easy': 60, 'blitz:es': 7 } })
    const m = mergeBackups(a, b)
    expect(m.lab?.es?.favorites).toEqual(['hablar', 'comer'])
    expect(m.records).toEqual({ 'verbtimed:es:easy': 80, 'match:es': 10, 'blitz:es': 7 })
  })
})
