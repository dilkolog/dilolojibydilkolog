import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { newWordState, processAttempt } from '../engine/review'
import { createScheduler } from '../engine/scheduler'
import { DEFAULT_SETTINGS, exportBackup, KelimeDB, parseBackup, restoreBackup } from './db'
import { SAMPLE_WORDS } from './seed'

const scheduler = createScheduler({ fuzz: false })
const NOW = new Date('2026-10-01T10:00:00Z')

async function seeded(name: string) {
  const db = new KelimeDB(name)
  await db.vocabulary.bulkPut(SAMPLE_WORDS.fr)
  const entry = SAMPLE_WORDS.fr[0]
  const result = processAttempt(
    newWordState(entry, NOW),
    { exerciseType: 'typed_translation', verdict: 'wrong', errorType: 'gender', given: 'le décision', expected: 'la décision', responseMs: 5000, hintsUsed: 0, maxHints: 3, at: NOW },
    [],
    scheduler,
  )
  await db.saveReview(result)
  return { db, entry }
}

describe('KelimeDB', () => {
  it('saves a review atomically and loads per language', async () => {
    const { db, entry } = await seeded('t1')
    const data = await db.loadLanguage('fr')
    expect(data.vocabulary).toHaveLength(SAMPLE_WORDS.fr.length)
    expect(data.states[0].entryId).toBe(entry.id)
    expect(data.states[0].skills.recall!.due).toBeInstanceOf(Date)
    expect(data.mistakes[0]).toMatchObject({ errorType: 'gender', given: 'le décision' })
    expect((await db.loadLanguage('en')).vocabulary).toHaveLength(0)
  })

  it('deleting a word removes its learning data', async () => {
    const { db, entry } = await seeded('t2')
    await db.deleteWord(entry.id)
    expect(await db.wordStates.count()).toBe(0)
    expect(await db.events.count()).toBe(0)
    expect(await db.mistakes.count()).toBe(0)
  })

  it('backup round-trips with dates intact', async () => {
    const { db } = await seeded('t3')
    await db.saveSettings({ ...DEFAULT_SETTINGS, activeLanguage: 'fr', dailyMinutes: 10, newWordsPerDay: 3 })
    const json = await exportBackup(db, NOW)

    const other = new KelimeDB('t3-restore')
    await restoreBackup(other, parseBackup(json))
    const state = (await other.wordStates.toArray())[0]
    expect(state.introducedAt).toBeInstanceOf(Date)
    expect(state.skills.recall!.due.getTime()).toBe((await db.wordStates.toArray())[0].skills.recall!.due.getTime())
    expect(await other.events.count()).toBe(1)
    expect((await other.getSettings())?.activeLanguage).toBe('fr')
  })

  it('rejects files that are not backups', () => {
    expect(() => parseBackup('{"foo":1}')).toThrow('yedeği değil')
  })
})

describe('AI key', () => {
  it('is stored on the device but never exported in a backup', async () => {
    const db = new KelimeDB('t-ai')
    await db.saveAiKey('sk-test')
    expect(await db.getAiKey()).toBe('sk-test')
    expect(await exportBackup(db)).not.toContain('sk-test')
    await db.saveAiKey(null)
    expect(await db.getAiKey()).toBeNull()
  })
})

describe('replaceReview', () => {
  it('swaps a wrong answer for a corrected one without leaving the old event or mistake', async () => {
    const { db, entry } = await seeded('t-replace')
    const [oldEvent] = await db.events.toArray()
    const fixed = processAttempt(
      newWordState(entry, NOW),
      { exerciseType: 'typed_translation', verdict: 'correct', responseMs: 5000, hintsUsed: 0, maxHints: 3, at: NOW },
      [],
      scheduler,
    )
    const stale = (await db.mistakes.toArray()).map((m) => m.id)
    await db.replaceReview(oldEvent.id, fixed, stale)
    const events = await db.events.toArray()
    expect(events).toHaveLength(1)
    expect(events[0].verdict).toBe('correct')
    expect(await db.mistakes.count()).toBe(0)
    expect((await db.wordStates.get(entry.id))!.stats.correct).toBe(1)
  })
})

describe('media', () => {
  it('is stored, included in backups as data URLs, restored, and deleted with its word', async () => {
    const { db, entry } = await seeded('t-media')
    const imageId = await db.addMedia('image', new Blob(['png-bytes'], { type: 'image/png' }))
    await db.vocabulary.put({ ...entry, imageId })
    const json = await exportBackup(db, NOW)
    expect(json).toContain('data:image/png;base64,')

    const other = new KelimeDB('t-media-restore')
    await restoreBackup(other, parseBackup(json))
    const restored = await other.media.get(imageId)
    expect(restored?.kind).toBe('image')
    expect(await restored!.blob.text()).toBe('png-bytes')

    await other.deleteWord(entry.id)
    expect(await other.media.count()).toBe(0)
  })
})

describe('settings migration', () => {
  it('fills new and nested defaults into settings saved by an older version', async () => {
    const db = new KelimeDB('t-settings')
    await db.meta.put({ key: 'settings', value: { activeLanguage: 'fr', dailyMinutes: 20, newWordsPerDay: 3, profile: { name: 'Ali' } } })
    const s = (await db.getSettings())!
    expect(s).toMatchObject({ activeLanguage: 'fr', dailyMinutes: 20, theme: 'system', dailyXpGoal: 50 })
    expect(s.profile).toMatchObject({ name: 'Ali', emoji: '🦊' })
    expect(s.reminder).toEqual({ enabled: false, time: '20:00' })
  })
})

describe('deleteWords', () => {
  it('removes several words with their progress and media, and leaves the rest', async () => {
    const { db, entry } = await seeded('t-bulk')
    const other = SAMPLE_WORDS.fr[1]
    const keep = SAMPLE_WORDS.fr[2]
    const audioId = await db.addMedia('audio', new Blob(['x']))
    await db.vocabulary.put({ ...other, audioId })
    await db.deleteWords([entry.id, other.id])
    expect(await db.vocabulary.get(entry.id)).toBeUndefined()
    expect(await db.vocabulary.get(other.id)).toBeUndefined()
    expect(await db.vocabulary.get(keep.id)).toBeDefined()
    expect(await db.events.count()).toBe(0)
    expect(await db.mistakes.count()).toBe(0)
    expect(await db.media.count()).toBe(0)
  })
})

describe('reading data', () => {
  it('keeps known words and encounters, and carries them through a backup', async () => {
    const db = new KelimeDB('t-reading')
    await db.addKnownWords('fr', ['maison', 'chat'])
    await db.addKnownWords('fr', ['chat', 'chien'])
    await db.addEncounters({ 'fr:chat': 2 })
    await db.addEncounters({ 'fr:chat': 1, 'fr:chien': 1 })
    expect([...(await db.getKnownWords('fr'))].sort()).toEqual(['chat', 'chien', 'maison'])
    expect(await db.getEncounters()).toEqual({ 'fr:chat': 3, 'fr:chien': 1 })
    const json = await exportBackup(db)
    const other = new KelimeDB('t-reading-restore')
    await restoreBackup(other, parseBackup(json))
    expect((await other.getKnownWords('fr')).size).toBe(3)
    expect(await other.getEncounters()).toEqual({ 'fr:chat': 3, 'fr:chien': 1 })
  })
})
