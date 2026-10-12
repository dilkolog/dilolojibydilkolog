import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { newWordState, processAttempt } from '../engine/review'
import { createScheduler } from '../engine/scheduler'
import { emptyLab, dueItems, recordCheck, toggleFavorite } from '../engine/labProgress'
import { DEFAULT_SETTINGS, exportBackup, KelimeDB, mediaBlob, parseBackup, quietly, restoreBackup } from './db'
import { SAMPLE_WORDS } from './seed'
import { deadIds } from './tombstones'

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

  it('undo of a delete brings the word back with its progress, alive again for sync', async () => {
    const { db, entry } = await seeded('t2-undo')
    const snap = await db.snapshotWords([entry.id])
    await db.deleteWord(entry.id)
    expect(deadIds(await db.getDeleted()).has(entry.id)).toBe(true)
    await db.restoreWords(snap)
    expect(await db.vocabulary.get(entry.id)).toBeTruthy()
    expect(await db.wordStates.count()).toBe(1)
    expect(await db.events.count()).toBe(1)
    expect(await db.mistakes.count()).toBe(1)
    expect(deadIds(await db.getDeleted()).has(entry.id)).toBe(false)
  })

  it('deleted reading texts are remembered for sync and can be restored', async () => {
    const db = new KelimeDB('t-texts')
    const text = { id: 'r1', language: 'fr' as const, title: 'Bonjour', text: 'Bonjour tout le monde.', addedAt: NOW.toISOString(), history: [] }
    await db.saveText(text)
    await db.deleteText(text.id)
    expect(deadIds(await db.getDeleted()).has(text.id)).toBe(true)
    await db.restoreTexts([text])
    expect((await db.getLibrary('fr')).map((t) => t.id)).toEqual([text.id])
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

  it('the verb lab and the game records travel in a backup, review dates intact', async () => {
    const { db } = await seeded('t-lab')
    const scheduler = createScheduler({ fuzz: false })
    const lab = recordCheck(toggleFavorite(emptyLab(), 'comer'), scheduler, 'comer', 'presente', true, NOW)
    await db.saveLab('es', lab)
    await db.saveRecord('verbtimed:es:easy', 120)
    const other = new KelimeDB('t-lab-restore')
    await restoreBackup(other, parseBackup(await exportBackup(db, NOW)))
    const back = await other.getLab('es')
    expect(back.favorites).toEqual(['comer'])
    expect(back.records['comer|presente'].ok).toBe(1)
    expect(back.records['comer|presente'].card.due).toBeInstanceOf(Date)
    expect(dueItems(back, new Date(NOW.getTime() + 60 * 86_400_000)).map((i) => i.verb)).toEqual(['comer'])
    expect((await other.getRecords())['verbtimed:es:easy']).toBe(120)
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

describe('revertReview', () => {
  it('takes an answer back: no event, no mistake, and no state for a word never answered before', async () => {
    const { db, entry } = await seeded('t-revert')
    const [event] = await db.events.toArray()
    await db.revertReview(event.id, null, entry.id, [])
    expect(await db.events.count()).toBe(0)
    expect(await db.mistakes.count()).toBe(0)
    expect(await db.wordStates.get(entry.id)).toBeUndefined()
  })

  it('restores the state the word had before', async () => {
    const { db, entry } = await seeded('t-revert-2')
    const [event] = await db.events.toArray()
    const before = newWordState(entry, NOW)
    await db.revertReview(event.id, before, entry.id, [])
    expect((await db.wordStates.get(entry.id))!.stats.correct).toBe(before.stats.correct)
    expect(await db.events.count()).toBe(0)
  })
})

describe('word lists', () => {
  it('are saved, words go in and out, and deleting a list keeps its words', async () => {
    const { db, entry } = await seeded('t-lists')
    const list = { id: 'list:1', language: entry.language, name: 'Seyahat', createdAt: NOW.toISOString(), updatedAt: NOW.toISOString() }
    await db.saveList(list)
    await db.saveList({ ...list, name: 'Yolculuk' })
    expect((await db.getLists(entry.language)).map((l) => l.name)).toEqual(['Yolculuk'])
    await db.assignList([entry.id], list.id, 'lvl:1')
    expect((await db.vocabulary.get(entry.id))!).toMatchObject({ listId: list.id, levelId: 'lvl:1' })
    // Deleting a level keeps the word in the list, with no level.
    await db.deleteLevel({ ...list, name: 'Yolculuk', levels: [{ id: 'lvl:1', name: 'Otel' }] }, 'lvl:1')
    expect((await db.vocabulary.get(entry.id))!.levelId).toBeUndefined()
    expect((await db.getLists())[0].levels).toEqual([])
    await db.deleteList(list.id)
    expect(await db.getLists()).toEqual([])
    expect((await db.vocabulary.get(entry.id))!.listId).toBeUndefined()
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
    expect(await mediaBlob(restored!).text()).toBe('png-bytes')

    await other.deleteWord(entry.id)
    expect(await other.media.count()).toBe(0)
  })
})

describe('settings migration', () => {
  it('fills new and nested defaults into settings saved by an older version', async () => {
    const db = new KelimeDB('t-settings')
    await db.meta.put({ key: 'settings', value: { activeLanguage: 'fr', dailyMinutes: 20, newWordsPerDay: 3, profile: { name: 'Ali' } } })
    const s = (await db.getSettings())!
    expect(s).toMatchObject({ activeLanguage: 'fr', dailyMinutes: 20, theme: 'light', dailyXpGoal: 50 })
    expect(s.profile).toMatchObject({ name: 'Ali', emoji: '🦊' })
    expect(s.reminder).toEqual({ enabled: false, time: '20:00' })
  })

  it('moves an inherited system theme to light once, then keeps what the learner picks', async () => {
    const db = new KelimeDB('t-theme')
    await db.meta.put({ key: 'settings', value: { theme: 'system' } })
    expect((await db.getSettings())!.theme).toBe('light')
    await db.meta.put({ key: 'settings', value: { theme: 'dark' } })
    expect((await db.getSettings())!.theme).toBe('dark')
    await db.meta.put({ key: 'settings', value: { theme: 'system', themeLightDefault: true } })
    expect((await db.getSettings())!.theme).toBe('system')
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

describe('reading library', () => {
  it('stores texts per language, moves an old single text in, and survives a backup', async () => {
    const db = new KelimeDB('t-library')
    await db.meta.put({ key: 'reading:fr', value: 'Il était une fois un petit chat.' })
    const lib = await db.getLibrary('fr')
    expect(lib).toHaveLength(1)
    expect(lib[0].title).toBe('Il était une fois un petit')
    expect(await db.getCurrentText('fr')).toBe(lib[0].id)
    await db.saveText({ id: 'x', language: 'es', title: 'Hola', text: 'Hola mundo', addedAt: new Date().toISOString(), history: [] })
    expect((await db.getLibrary('es')).map((t) => t.id)).toEqual(['x'])
    expect(await db.getLibrary('fr')).toHaveLength(1)
    const other = new KelimeDB('t-library-restore')
    await restoreBackup(other, parseBackup(await exportBackup(db)))
    expect(await other.getLibrary('es')).toHaveLength(1)
    await db.deleteText('x')
    expect(await db.getLibrary('es')).toHaveLength(0)
  })
})

describe('defensive date normalization in meta records', () => {
  it('normalizes Date and plain {} values in journal, translations, vocabTests, sentences and earLog', async () => {
    const db = new KelimeDB('t-dates-defense')

    // Journal
    await db.meta.put({
      key: 'journal',
      value: [
        { id: 'j1', language: 'fr', text: 'Bonjour', at: new Date('2026-10-01T10:00:00Z') },
        { id: 'j2', language: 'fr', text: 'Salut', at: {} },
      ],
    })
    const journal = await db.getJournal('fr')
    expect(journal).toHaveLength(2)
    expect(typeof journal[0].at).toBe('string')
    expect(typeof journal[1].at).toBe('string')
    expect(journal[0].id).toBe('j1') // 2026-10-01 > 0

    // Translations
    await db.meta.put({
      key: 'translations',
      value: [
        { text: 'Chat', translation: 'Kedi', from: 'fr', to: 'tr', at: new Date('2026-10-02T10:00:00Z') },
        { text: 'Chien', translation: 'Köpek', from: 'fr', to: 'tr', at: {} },
      ],
    })
    const translations = await db.getTranslations()
    expect(translations).toHaveLength(2)
    expect(typeof translations[0].at).toBe('string')
    expect(typeof translations[1].at).toBe('string')

    // Vocab tests
    await db.meta.put({
      key: 'vocabTests',
      value: [
        { language: 'fr', at: new Date('2026-10-03T10:00:00Z'), estimate: 1000 },
        { language: 'fr', at: {}, estimate: 1200 },
      ],
    })
    const vocabTests = await db.getVocabTests()
    expect(vocabTests).toHaveLength(2)
    expect(typeof vocabTests[0].at).toBe('string')
    expect(typeof vocabTests[1].at).toBe('string')

    // Sentences
    await db.meta.put({
      key: 'sentences',
      value: [
        {
          id: 's1',
          language: 'fr',
          text: 'Il dort.',
          translation: 'O uyuyor.',
          card: { due: new Date(), state: 0, reps: 0, lapses: 0, stability: 1, difficulty: 5, elapsed_days: 0, scheduled_days: 0 },
          addedAt: new Date('2026-10-04T10:00:00Z'),
        },
        {
          id: 's2',
          language: 'fr',
          text: 'Il mange.',
          translation: 'O yiyor.',
          card: { due: new Date(), state: 0, reps: 0, lapses: 0, stability: 1, difficulty: 5, elapsed_days: 0, scheduled_days: 0 },
          addedAt: {},
        },
      ],
    })
    const sentences = await db.getSentences()
    expect(sentences).toHaveLength(2)
    expect(typeof sentences[0].addedAt).toBe('string')
    expect(typeof sentences[1].addedAt).toBe('string')

    // Ear log
    await db.meta.put({
      key: 'earMisses',
      value: {
        fr: {
          chat: { n: 2, ok: 0, last: new Date('2026-10-05T10:00:00Z'), sentence: 'Un chat.' },
          chien: { n: 1, ok: 0, last: {}, sentence: 'Un chien.' },
        },
      },
    })
    const earLog = await db.getEarLog()
    expect(typeof earLog.fr?.chat.last).toBe('string')
    expect(typeof earLog.fr?.chien.last).toBe('string')
  })
})

describe('word edit stamps', () => {
  it('stamps a word when the learner changes it, whichever way it is written, but not on creation', async () => {
    const db = new KelimeDB('stamps')
    const [a, b, c] = SAMPLE_WORDS.fr
    await db.vocabulary.bulkPut([a, b, c])
    expect((await db.vocabulary.get(a.id))?.editedAt).toBeUndefined()
    await db.vocabulary.put({ ...a, notes: 'x' } as typeof a)
    await db.vocabulary.update(b.id, { difficult: true })
    await db.assignList([c.id], 'list-1')
    for (const e of [a, b, c]) expect((await db.vocabulary.get(e.id))?.editedAt).toBeTruthy()
  })

  it('does not stamp what a background filler writes, and keeps a stamp that comes with the entry', async () => {
    const db = new KelimeDB('stamps-quiet')
    const [a, b] = SAMPLE_WORDS.fr
    await db.vocabulary.bulkPut([a, b])
    await quietly(() => db.vocabulary.update(a.id, { packV: '7' }))
    expect((await db.vocabulary.get(a.id))?.editedAt).toBeUndefined()
    await db.vocabulary.put({ ...b, editedAt: '2026-01-01T00:00:00.000Z', notes: 'merged' } as typeof b)
    expect((await db.vocabulary.get(b.id))?.editedAt).toBe('2026-01-01T00:00:00.000Z')
    // A quiet write that fails still lets the next ones be stamped.
    await expect(quietly(() => Promise.reject(new Error('x')))).rejects.toThrow()
    await db.vocabulary.update(a.id, { difficult: true })
    expect((await db.vocabulary.get(a.id))?.editedAt).toBeTruthy()
  })
})

describe('what parseBackup lets in', () => {
  const base = { app: 'kelime-koc', version: 3, exportedAt: '2026-10-01T10:00:00.000Z', vocabulary: [], wordStates: [], events: [], mistakes: [] }
  const parse = (over: object) => parseBackup(JSON.stringify({ ...base, ...over }))

  it('refuses a hollow word and lists of the wrong shape, before anything is cleared', () => {
    expect(() => parse({ vocabulary: [{ id: 'x' }] })).toThrow('bozuk')
    expect(() => parse({ reading: { known: {}, library: {} } })).toThrow('bozuk')
    expect(() => parse({ sentences: 'x' })).toThrow('bozuk')
    expect(() => parse({ lists: {} })).toThrow('bozuk')
  })

  it('keeps the dates of a text, a sentence and a list as the strings they are (not Dates made by their key name)', () => {
    const b = parse({
      reading: { known: {}, library: [{ id: 't', addedAt: '2026-10-01T10:00:00.000Z', history: [] }] },
      sentences: [{ id: 's', addedAt: '2026-10-01T10:00:00.000Z' }],
      lists: [{ id: 'l', createdAt: '2026-10-01T10:00:00.000Z', updatedAt: '2026-10-02T10:00:00.000Z' }],
    })
    expect(b.reading?.library?.[0]?.addedAt).toBe('2026-10-01T10:00:00.000Z')
    expect((b.sentences as unknown as { addedAt: unknown }[])[0].addedAt).toBe('2026-10-01T10:00:00.000Z')
    expect((b.lists as unknown as { createdAt: unknown }[])[0].createdAt).toBe('2026-10-01T10:00:00.000Z')
  })

  it('is told by a newer file to update', () => {
    expect(() => parse({ version: 99 })).toThrow('daha yeni')
  })
})

describe('the write counter a sync watches', () => {
  it('counts writes to words, answers and notes, but not the sync\'s own bookkeeping', async () => {
    const db = new KelimeDB('writes')
    const w0 = db.writes
    await db.vocabulary.put(SAMPLE_WORDS.fr[0])
    expect(db.writes).toBeGreaterThan(w0)
    const w1 = db.writes
    await db.meta.put({ key: 'syncAt', value: 'x' })
    await db.meta.put({ key: 'syncSize', value: 1 })
    expect(db.writes).toBe(w1)
    await db.meta.put({ key: 'grammar', value: {} })
    expect(db.writes).toBeGreaterThan(w1)
  })
})


describe('labelled pictures in the database', () => {
  it('are saved, listed per language, deleted with their picture and remembered as deleted, and travel in a backup', async () => {
    const { db } = await import('./instance')
    await db.meta.delete('diagrams')
    const image = await db.addMedia('image', new Blob(['x'], { type: 'image/png' }))
    const dg = { id: 'dg-1', language: 'fr' as const, title: 'Le corps', imageId: image, points: [{ id: 'p1', x: 0.2, y: 0.3, word: 'la tête' }], createdAt: '2026-10-12T10:00:00Z', updatedAt: '2026-10-12T10:00:00Z' }
    await db.saveDiagram(dg)
    await db.saveDiagram({ ...dg, id: 'dg-2', language: 'es', title: 'El cuerpo' })
    await db.saveDiagram({ ...dg, title: 'Le corps humain' })
    expect((await db.getDiagrams('fr')).map((d) => d.title)).toEqual(['Le corps humain'])
    expect(await db.getDiagrams()).toHaveLength(2)
    const { exportBackup, parseBackup } = await import('./db')
    expect(parseBackup(await exportBackup(db, new Date(), { media: false })).diagrams).toHaveLength(2)
    await db.deleteDiagram('dg-1')
    expect((await db.getDiagrams()).map((d) => d.id)).toEqual(['dg-2'])
    expect(await db.media.get(image)).toBeUndefined()
    expect(deadIds(await db.getDeleted()).has('dg-1')).toBe(true)
  })
})
