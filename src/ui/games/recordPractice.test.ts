import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../data/instance'
import { createEntry } from '../../data/wordInput'
import { newWordState, processAttempt } from '../../engine/review'
import { createScheduler } from '../../engine/scheduler'
import { recordPractice } from './shared'

const T0 = new Date('2026-10-01T09:00:00')
const entry = createEntry({ word: 'la mer', meaning: 'deniz' }, 'fr', T0)
/** The word met once in the day's session, so its recognition card has a due date a few days on. */
const learnt = () => processAttempt(newWordState(entry, T0), { exerciseType: 'mc_meaning', verdict: 'correct', responseMs: 2000, hintsUsed: 0, maxHints: 0, at: T0 }, [], createScheduler({ fuzz: false }), () => 'e0').state

describe("a game's answer", () => {
  beforeEach(async () => {
    await Promise.all([db.wordStates.clear(), db.events.clear(), db.mistakes.clear()])
    await db.wordStates.put(learnt())
  })
  afterEach(() => vi.useRealTimers())

  it('on a word not yet due is practice: the schedule stays', async () => {
    vi.useFakeTimers({ now: new Date('2026-10-01T09:00:30'), toFake: ['Date'] })
    const before = await db.wordStates.get(entry.id)
    expect(await recordPractice(entry, before, 'mc_meaning', true, 1500)).toBe(false)
    expect((await db.wordStates.get(entry.id))!.skills.recognition!.due).toEqual(before!.skills.recognition!.due)
    expect((await db.events.toArray()).map((e) => e.mode)).toEqual(['practice'])
  })

  it('on a due word is a real review, once per round even with an old state', async () => {
    vi.useFakeTimers({ now: new Date('2026-10-20T10:00:00'), toFake: ['Date'] })
    const stale = await db.wordStates.get(entry.id)
    expect(await recordPractice(entry, stale, 'mc_meaning', true, 1500)).toBe(true)
    const after = (await db.wordStates.get(entry.id))!
    expect(new Date(after.skills.recognition!.due).getTime()).toBeGreaterThan(Date.now())
    expect(after.stats.reviews).toBe(stale!.stats.reviews + 1)
    // The same word again in the round, with the game's old state: practice now.
    expect(await recordPractice(entry, stale, 'mc_meaning', true, 1500)).toBe(false)
    expect((await db.events.toArray()).map((e) => e.mode).sort()).toEqual(['normal', 'practice'])
  })

  it('a wrong answer on a due word is a lapse and lands in the mistakes; matching never counts', async () => {
    vi.useFakeTimers({ now: new Date('2026-10-20T10:00:00'), toFake: ['Date'] })
    const state = await db.wordStates.get(entry.id)
    expect(await recordPractice(entry, state, 'mc_meaning', true, 2000, undefined, { schedule: false })).toBe(false)
    expect(await recordPractice(entry, state, 'mc_meaning', false, 1500, { given: 'göl', expected: 'deniz' })).toBe(true)
    expect((await db.wordStates.get(entry.id))!.stats.wrong).toBe(1)
  })
})
