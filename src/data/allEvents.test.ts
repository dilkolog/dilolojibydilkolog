import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import type { ReviewEvent } from '../engine/types'
import { KelimeDB } from './db'

let n = 0
const event = (over: Partial<ReviewEvent> = {}): ReviewEvent =>
  ({
    id: `e${++n}`,
    entryId: 'fr:chat',
    language: 'fr',
    skill: 'recognition',
    exerciseType: 'mc_meaning',
    direction: 'target_to_tr',
    verdict: 'correct',
    correct: true,
    rating: 3,
    responseMs: 1000,
    hintsUsed: 0,
    retrievabilityBefore: 0.9,
    stabilityAfter: 3,
    scheduledDays: 2,
    mode: 'normal',
    timestamp: new Date('2026-10-14T10:00:00Z'),
    ...over,
  }) as ReviewEvent

/** What a whole read gives, as the ids in order of id (the cache keeps its own order). */
const ids = (events: ReviewEvent[]) => events.map((e) => e.id).sort()
const whole = async (db: KelimeDB) => ids(await db.events.toArray())

describe('allEvents', () => {
  it('reads the answers once, then adds only the new ones without reading them all again', async () => {
    const db = new KelimeDB('t-all-events-add')
    await db.events.bulkAdd([event(), event()])
    expect(ids(await db.allEvents())).toEqual(await whole(db))
    let reads = 0
    const toArray = db.events.toArray.bind(db.events)
    db.events.toArray = (() => (reads++, toArray())) as typeof db.events.toArray
    await db.events.add(event())
    await db.events.add(event())
    expect(ids(await db.allEvents())).toEqual(await whole(db))
    expect(reads).toBe(1) // only the check above, not allEvents
    expect(await db.allEvents()).toHaveLength(4)
  })

  it('reads whole again after a change, a deletion or a restore, and never keeps a rolled-back answer', async () => {
    const db = new KelimeDB('t-all-events-change')
    await db.events.bulkAdd([event(), event(), event()])
    const first = await db.allEvents()
    // A change.
    await db.events.update(first[0].id, { verdict: 'wrong', correct: false })
    expect((await db.allEvents()).find((e) => e.id === first[0].id)?.verdict).toBe('wrong')
    // A deletion, and an answer added after it.
    await db.events.delete(first[1].id)
    await db.events.add(event())
    expect(ids(await db.allEvents())).toEqual(await whole(db))
    // A restore: everything cleared, other answers put back.
    await db.transaction('rw', db.events, async () => {
      await db.events.clear()
      await db.events.bulkPut([event({ id: 'r1' }), event({ id: 'r2' })])
    })
    expect(ids(await db.allEvents())).toEqual(['r1', 'r2'])
    // An answer whose transaction fails is never counted.
    await db
      .transaction('rw', db.events, async () => {
        await db.events.add(event({ id: 'lost' }))
        throw new Error('storage full')
      })
      .catch(() => {})
    expect(ids(await db.allEvents())).toEqual(['r1', 'r2'])
    await db.events.add(event({ id: 'r3' }))
    expect(ids(await db.allEvents())).toEqual(['r1', 'r2', 'r3'])
  })

  it('gives each caller its own list', async () => {
    const db = new KelimeDB('t-all-events-copy')
    await db.events.add(event())
    const a = await db.allEvents()
    a.push(event({ id: 'mine' }))
    expect(ids(await db.allEvents())).toEqual(await whole(db))
  })
})
