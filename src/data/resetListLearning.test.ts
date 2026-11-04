import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { KelimeDB, exportBackup, parseBackup } from './db'
import { resetListLearning, undoListLearningReset } from './resetListLearning'
import { createEntry } from './wordInput'
import { newWordState, processAttempt } from '../engine/review'
import { createScheduler } from '../engine/scheduler'
import { startSession } from '../engine/session'
import { draftRecord, readSessionDraft, writeSessionDraft } from './sessionDraft'
import { mergeBackups } from './sync'

const at = new Date('2026-11-04T12:00:00Z')
const resetAt = at.getTime() + 86400000
const scheduler = createScheduler({ fuzz: false })
const word = (lemma: string, listId: string) => ({ ...createEntry({ word: lemma, meaning: lemma }, 'es', at), listId })
let db: KelimeDB
const a = word('viajar', 'a')
const b = word('leer', 'b')
const review = (entry = a, now = at, state = newWordState(entry, at)) => processAttempt(state, { exerciseType: 'typed_translation', verdict: 'wrong', errorType: 'meaning', responseMs: 1000, hintsUsed: 0, maxHints: 0, at: now, guided: true }, [], scheduler)
const backup = async () => parseBackup(await exportBackup(db))
beforeEach(async () => {
  db = new KelimeDB('reset-list-learning')
  await db.vocabulary.bulkPut([a, b])
  await db.saveReview(review(a))
  await db.saveReview(review(b))
  await writeSessionDraft(db, draftRecord('es', 4, startSession([a, b].map((w) => ({ kind: 'exercise', entryId: w.id, reason: 'due', skill: 'recall', exerciseType: 'typed_translation' })))))
})
afterEach(async () => { vi.restoreAllMocks(); await db.delete() })

describe('resetting one list learning', () => {
  it('preserves words and other lists, removes only the selected history and paused work', async () => {
    const other = await db.wordStates.get(b.id)
    await resetListLearning(db, 'a', resetAt)
    expect(await db.vocabulary.toArray()).toEqual([a, b].sort((x, y) => x.id.localeCompare(y.id)))
    expect(await db.wordStates.get(a.id)).toBeUndefined()
    expect(await db.events.where('entryId').equals(a.id).count()).toBe(0)
    expect(await db.mistakes.where('entryId').equals(a.id).count()).toBe(0)
    expect(await db.wordStates.get(b.id)).toEqual(other)
    expect((await readSessionDraft(db, 'es'))?.session.items.map((it) => it.entryId)).toEqual([b.id])
  })

  it('keeps the reset after merging an old device, and preserves genuinely new learning', async () => {
    const stale = await backup()
    await resetListLearning(db, 'a', resetAt)
    const reset = await backup()
    const merged = mergeBackups(reset, stale)
    expect(merged.vocabulary).toHaveLength(2)
    expect(merged.wordStates.map((s) => s.entryId)).toEqual([b.id])
    expect(merged.events.some((e) => e.entryId === a.id)).toBe(false)
    const now = new Date(resetAt + 1000)
    const fresh = review(a, now, newWordState(a, now))
    await db.saveReview(fresh)
    const after = mergeBackups(stale, await backup())
    expect(after.wordStates.find((s) => s.entryId === a.id)?.introducedAt).toEqual(now)
    expect(after.wordStates.find((s) => s.entryId === a.id)?.stats.reviews).toBe(1)
    expect(after.events.filter((e) => e.entryId === a.id)).toHaveLength(1)
  })

  it('rejects stale in-flight answers and drops offline reviews from the old learning generation', async () => {
    const old = (await db.wordStates.get(a.id))!
    const stale = await backup()
    await resetListLearning(db, 'a', resetAt)
    const late = review(a, new Date(resetAt + 1000), old)
    await expect(db.saveReview(late)).rejects.toThrow('Learning was reset')
    await expect(db.replaceReview(stale.events[0].id, late, [])).rejects.toThrow('Learning was reset')
    await expect(db.revertReview(stale.events[0].id, old, a.id, [])).rejects.toThrow('Learning was reset')
    stale.wordStates = [late.state]
    stale.events = [late.event]
    const merged = mergeBackups(stale, await backup())
    expect(merged.wordStates.some((s) => s.entryId === a.id)).toBe(false)
    expect(merged.events.some((e) => e.entryId === a.id)).toBe(false)
  })

  it('undoes progress and paused work without overwriting later word edits', async () => {
    const before = await db.wordStates.get(a.id)
    const reset = await resetListLearning(db, 'a', resetAt)
    await db.vocabulary.update(a.id, { notes: 'new note' })
    expect(await undoListLearningReset(db, reset)).toBe(true)
    expect(await db.wordStates.get(a.id)).toEqual(before)
    expect((await db.vocabulary.get(a.id))?.notes).toBe('new note')
    expect((await readSessionDraft(db, 'es'))?.session.items).toHaveLength(2)
    expect(mergeBackups(await backup(), await backup()).wordStates).toHaveLength(2)
  })

  it('does not undo over new learning, and rolls back a failed reset', async () => {
    const reset = await resetListLearning(db, 'a', resetAt)
    const now = new Date(resetAt + 1000)
    await db.saveReview(review(a, now, newWordState(a, now)))
    expect(await undoListLearningReset(db, reset)).toBe(false)
    const before = await db.wordStates.get(a.id)
    vi.spyOn(db, 'addDeleted').mockRejectedValueOnce(new Error('full'))
    await expect(resetListLearning(db, 'a', resetAt + 2000)).rejects.toThrow('full')
    expect(await db.wordStates.get(a.id)).toEqual(before)
    expect(await db.events.where('entryId').equals(a.id).count()).toBe(1)
  })
})
