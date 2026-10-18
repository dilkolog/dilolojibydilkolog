import { describe, expect, it } from 'vitest'
import { mergeShared, sameWord, shareIdOf, shareLink, withoutOldMarks, type SharedWord } from '../sharedSet'

const w = (key: string, meaning: string, at: string, extra: Partial<SharedWord> = {}): SharedWord => ({ key, word: key, meaning, at, ...extra })

describe('mergeShared', () => {
  it('the later write wins per word; words only one side has are kept', () => {
    const m = mergeShared([w('a', 'eski', '2026-10-12T10:00:00Z'), w('b', 'b', '2026-10-12T10:00:00Z')], [w('a', 'yeni', '2026-10-12T11:00:00Z'), w('c', 'c', '2026-10-12T09:00:00Z')])
    expect(m.map((x) => [x.key, x.meaning]).sort()).toEqual([['a', 'yeni'], ['b', 'b'], ['c', 'c']])
  })

  it('a later deletion removes the word, a later edit brings it back, and a tie goes to the deletion', () => {
    expect(mergeShared([w('a', 'x', '2026-10-12T10:00:00Z')], [w('a', '', '2026-10-12T11:00:00Z', { deleted: true })])[0].deleted).toBe(true)
    expect(mergeShared([w('a', '', '2026-10-12T10:00:00Z', { deleted: true })], [w('a', 'geri', '2026-10-12T11:00:00Z')])[0]).toMatchObject({ meaning: 'geri' })
    expect(mergeShared([w('a', 'x', '2026-10-12T10:00:00Z')], [w('a', '', '2026-10-12T10:00:00Z', { deleted: true })])[0].deleted).toBe(true)
    expect(mergeShared([w('a', '', '2026-10-12T10:00:00Z', { deleted: true })], [w('a', 'x', '2026-10-12T10:00:00Z')])[0].deleted).toBe(true)
  })

  it('old deletion marks are dropped, recent ones kept', () => {
    const now = Date.parse('2026-10-12T00:00:00Z')
    const kept = withoutOldMarks([w('old', '', '2026-06-01T00:00:00Z', { deleted: true }), w('new', '', '2026-10-10T00:00:00Z', { deleted: true }), w('live', 'x', '2026-01-01T00:00:00Z')], now)
    expect(kept.map((x) => x.key)).toEqual(['new', 'live'])
  })
})

describe('share links', () => {
  it('make and read back a link; anything else is not one', () => {
    const id = 'ab'.repeat(16)
    expect(shareIdOf(shareLink('https://diloloji.com/', id))).toBe(id)
    expect(shareIdOf(`/?set=${id}&x=1`)).toBe(id)
    expect(shareIdOf('/?set=short')).toBeNull()
    expect(shareIdOf('/')).toBeNull()
  })
  it('sameWord ignores the time but not the content', () => {
    expect(sameWord(w('a', 'x', '2026-10-12T10:00:00Z'), w('a', 'x', '2026-10-13T10:00:00Z'))).toBe(true)
    expect(sameWord(w('a', 'x', 't'), w('a', 'y', 't'))).toBe(false)
    expect(sameWord(w('a', 'x', 't'), w('a', 'x', 't', { notes: 'n' }))).toBe(false)
  })
})
