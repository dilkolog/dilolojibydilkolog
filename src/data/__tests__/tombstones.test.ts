import { describe, expect, it } from 'vitest'
import { deadIds, isDead, mergeTombs, tombList, tombMap, type Tombstone } from '../tombstones'

describe('tombstones sync tracking', () => {
  it('parses legacy string ids with given fallback timestamp', () => {
    const list: Tombstone[] = ['word-1', 'word-2']
    const map = tombMap(list, 1000)

    expect(map.size).toBe(2)
    expect(map.get('word-1')).toEqual({ at: 1000, alive: false })
    expect(map.get('word-2')).toEqual({ at: 1000, alive: false })
  })

  it('parses structured tombstones and resolves duplicates keeping latest', () => {
    const list: Tombstone[] = [
      { id: 'w1', at: '2026-10-10T10:00:00Z', alive: false },
      { id: 'w1', at: '2026-10-12T10:00:00Z', alive: true }, // newer alive wins
      { id: 'w2', at: '2026-10-11T10:00:00Z', alive: true },
      { id: 'w2', at: '2026-10-11T10:00:00Z', alive: false }, // tie: deleted wins
    ]
    const map = tombMap(list, 0)

    expect(map.get('w1')?.alive).toBe(true)
    expect(map.get('w2')?.alive).toBe(false)
  })

  it('merges multiple tomb maps properly', () => {
    const m1 = tombMap([{ id: 'a', at: '2026-10-10T00:00:00Z', alive: false }], 0)
    const m2 = tombMap([{ id: 'a', at: '2026-10-12T00:00:00Z', alive: true }, { id: 'b', at: '2026-10-11T00:00:00Z', alive: false }], 0)

    const merged = mergeTombs(m1, m2)
    expect(merged.size).toBe(2)
    expect(merged.get('a')?.alive).toBe(true)
    expect(merged.get('b')?.alive).toBe(false)
  })

  it('converts map to tombstone array', () => {
    const map = tombMap([
      { id: 'a', at: '2026-10-10T00:00:00.000Z', alive: false },
      { id: 'b', at: '2026-10-11T00:00:00.000Z', alive: true },
    ], 0)

    const list = tombList(map)
    expect(list).toHaveLength(2)
    expect(list).toContainEqual({ id: 'a', at: '2026-10-10T00:00:00.000Z' })
    expect(list).toContainEqual({ id: 'b', at: '2026-10-11T00:00:00.000Z', alive: true })
  })

  it('checks isDead accurately against creation timestamp', () => {
    const map = tombMap([
      { id: 'deleted-item', at: '2026-10-10T12:00:00Z', alive: false },
      { id: 'revived-item', at: '2026-10-10T12:00:00Z', alive: true },
    ], 0)

    // Revived or unknown is not dead
    expect(isDead(map, 'unknown-item')).toBe(false)
    expect(isDead(map, 'revived-item')).toBe(false)

    // Deleted item created before deletion is dead
    expect(isDead(map, 'deleted-item', '2026-10-09T00:00:00Z')).toBe(true)
    // Deleted item with undefined creation date is assumed dead (old)
    expect(isDead(map, 'deleted-item')).toBe(true)

    // Re-created item created strictly AFTER deletion timestamp is ALIVE
    expect(isDead(map, 'deleted-item', '2026-10-11T00:00:00Z')).toBe(false)
  })

  it('returns currently dead IDs set', () => {
    const list: Tombstone[] = [
      { id: 'd1', at: '2026-10-10T00:00:00Z', alive: false },
      { id: 'd2', at: '2026-10-10T00:00:00Z', alive: false },
      { id: 'a1', at: '2026-10-10T00:00:00Z', alive: true },
    ]
    const dead = deadIds(list)
    expect(dead.size).toBe(2)
    expect(dead.has('d1')).toBe(true)
    expect(dead.has('d2')).toBe(true)
    expect(dead.has('a1')).toBe(false)
  })
})
