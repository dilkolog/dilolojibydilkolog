import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { KelimeDB, exportBackup, parseBackup } from './db'
import { draftKey, draftRecord, readSessionDraft, writeSessionDraft } from './sessionDraft'
import { advanceLearning, startSession } from '../engine/session'
import { newWordState, processAttempt } from '../engine/review'
import { createScheduler } from '../engine/scheduler'
import { createRng } from '../engine/rng'
import { decision } from '../engine/__tests__/fixtures'
import { mergeWordState } from './sync'

let db: KelimeDB
beforeEach(async () => { db = new KelimeDB('durable-session-tests'); await db.open() })
afterEach(async () => { await db.delete() })
const now = new Date('2026-11-04T12:00:00Z')
const scheduler = createScheduler({ fuzz: false })
const make = () => {
  const session = startSession([{ entryId: decision.id, kind: 'exercise', reason: 'due', skill: 'recognition', exerciseType: 'mc_meaning' }])
  const result = processAttempt(newWordState(decision, now), { exerciseType: 'mc_meaning', verdict: 'wrong', errorType: 'meaning', responseMs: 5000, hintsUsed: 0, maxHints: 0, at: now, guided: true }, [], scheduler)
  const next = advanceLearning(session, { entryId: decision.id, verdict: 'wrong', independent: false }, decision, result.state, createRng(1))
  return { session, next, result }
}

describe('durable session checkpoint', () => {
  it('commits an answered question and its next step together, before feedback is dismissed', async () => {
    const { next, result } = make()
    await db.saveReview(result, draftRecord('en', 7, next))
    const saved = await readSessionDraft(db, 'en')
    expect(saved?.session.index).toBe(1)
    expect(saved?.session.relearn[decision.id]).toBe(2)
    expect(saved?.session.items[saved.session.index].entryId).toBe(decision.id)
    expect(await db.events.count()).toBe(1)
    // Closing and reopening the database preserves exactly the pending steps.
    db.close()
    await db.open()
    expect((await readSessionDraft(db, 'en'))?.session).toEqual(next)
    expect(await db.events.count()).toBe(1)
  })

  it('rolls back the checkpoint and word state when saving the answer fails', async () => {
    const { session, next, result } = make()
    await writeSessionDraft(db, draftRecord('en', 7, session))
    await db.events.add(result.event)
    await expect(db.saveReview(result, draftRecord('en', 7, next))).rejects.toThrow()
    expect((await readSessionDraft(db, 'en'))?.session.index).toBe(0)
    expect(await db.wordStates.get(decision.id)).toBeUndefined()
    expect(await db.events.count()).toBe(1)
  })

  it('removes finished drafts and rejects damaged versions or invalid indices', async () => {
    const { session } = make()
    await writeSessionDraft(db, draftRecord('en', 7, session))
    await writeSessionDraft(db, draftRecord('en', 7, { ...session, index: session.items.length }))
    expect(await readSessionDraft(db, 'en')).toBeNull()
    await db.meta.put({ key: draftKey('en'), value: { version: 1, language: 'en', seed: 1, session: { ...session, index: -1 } } })
    expect(await readSessionDraft(db, 'en')).toBeNull()
  })

  it('preserves per-skill debt through backup and merges newer repayment even without an FSRS update', async () => {
    const { result } = make()
    await db.wordStates.put(result.state)
    const backup = parseBackup(await exportBackup(db))
    const restored = backup.wordStates[0]
    expect(restored.learning).toEqual(result.state.learning)
    const cleared = { ...restored, learning: { recognition: { remaining: 0, delayed: false, at: '2026-11-04T12:01:00.000Z' } } }
    expect(mergeWordState(restored, cleared).learning?.recognition?.remaining).toBe(0)
    expect(mergeWordState(cleared, restored).learning?.recognition?.remaining).toBe(0)
  })
})
