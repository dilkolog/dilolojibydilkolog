import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { KelimeDB } from './db'
import { createEntry } from './wordInput'
import { newWordState } from '../engine/review'
import { creditUsage } from './usage'

describe('evidence of use', () => {
  it('counts a correct own use as a production review, once a day, only for words being learned', async () => {
    const db = new KelimeDB('t-usage')
    const now = new Date('2026-10-02T10:00:00')
    const learning = createEntry({ word: 'decision', meaning: 'karar' }, 'en', now)
    const notStarted = createEntry({ word: 'harbour', meaning: 'liman' }, 'en', now)
    await db.vocabulary.bulkPut([learning, notStarted])
    await db.wordStates.put(newWordState(learning, now))

    expect(await creditUsage(db, [learning, notStarted], now)).toEqual([learning.id])
    const state = await db.wordStates.get(learning.id)
    expect(state?.skills.production).toBeDefined()
    expect(await db.events.where('entryId').equals(learning.id).count()).toBe(1)
    // Again the same day: nothing more.
    expect(await creditUsage(db, [learning], new Date('2026-10-02T18:00:00'))).toEqual([])
    // Next day it counts again.
    expect(await creditUsage(db, [learning], new Date('2026-10-03T09:00:00'))).toEqual([learning.id])
  })
})
