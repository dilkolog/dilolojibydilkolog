import Dexie, { type Table } from 'dexie'
import { addToMonth, monthKey, type AiModel, type MonthUsage, type UsageRecord } from '../ai/usage'
import type { JournalReview } from '../ai/types'
import { recordMistake, type MistakeInput } from '../engine/mistakes'
import type { BossWin } from '../engine/bosses'
import type { ExamResult } from '../engine/exam'
import type { ReviewResult } from '../engine/review'
import type { MissionResult } from '../engine/missions'
import {
  TARGET_LANGUAGES,
  type CefrLevel,
  type Mistake,
  type ReviewEvent,
  type TargetLanguage,
  type UserWordState,
  type VocabularyEntry,
} from '../engine/types'

/** A text in the reading library. */
export interface ReadingText {
  id: string
  language: TargetLanguage
  title: string
  text: string
  /** ISO dates. */
  addedAt: string
  /** Last time the reader finished it. */
  readAt?: string
  /** Coverage when each reading started, oldest first: shows the text getting easier. */
  history: { at: string; coverage: number }[]
}

/** A short title from a text's first words. */
export function titleOf(text: string): string {
  const first = text.trim().split(/\s+/).slice(0, 6).join(' ')
  return first.length > 48 ? `${first.slice(0, 47)}…` : first
}

/** A journal entry and, when the AI reviewed it, the review. */
export interface JournalEntry {
  id: string
  language: TargetLanguage
  /** ISO date. */
  at: string
  text: string
  review?: JournalReview
}

export interface VocabTestRecord {
  language: TargetLanguage
  /** ISO date. */
  at: string
  estimate: number
  falseAlarms: number
  bands: number[]
}

export interface Profile {
  name: string
  /** Emoji shown as the avatar when there is no photo. */
  emoji: string
  /** Avatar background, a CSS colour. */
  color: string
  /** Avatar photo (media table id). */
  photoId?: string
  motto: string
}

export interface Settings {
  activeLanguage: TargetLanguage
  /** @deprecated No longer used (level system removed); kept so old backups still load. */
  levels?: Partial<Record<TargetLanguage, CefrLevel>>
  dailyMinutes: number
  newWordsPerDay: number
  /** Daily XP target shown on the home screen. */
  dailyXpGoal: number
  /** Questions per session at most; 0 = whole plan. */
  sessionMax: number
  theme: 'system' | 'light' | 'dark'
  autoPlayAudio: boolean
  speechRate: number
  /** Chosen system voice per language (voiceURI). */
  voices: Partial<Record<TargetLanguage, string>>
  soundEffects: boolean
  /** Seconds before the first hint unlocks (then the same again for each next one). */
  hintDelaySec: number
  /** Missing/wrong accents count as wrong instead of "almost". */
  accentStrict: boolean
  showKeyLegend: boolean
  /** Ask some answers to be spoken aloud (when the browser can recognise speech). */
  speechExercises: boolean
  /** FSRS target probability of recall when a review comes up (0.85–0.95). */
  retention: number
  /** Guess a new word's meaning before it is shown (pretesting effect). */
  pretest: boolean
  /** Offer "not sure" before answering; confident errors get extra attention. */
  confidence: boolean
  /** Turn "e'" into "é" etc. while typing. */
  accentShortcuts: boolean
  /** Claude model for AI features. */
  aiModel: AiModel
  /** Monthly AI spending limit in USD; 0 = no limit. */
  aiMonthlyLimit: number
  /** Introduce own words most frequent first. */
  frequencyFirst: boolean
  /** "When and where I'll study" (implementation intention); '' = not set. */
  studyPlan: string
  /** The plan prompt was answered or dismissed, so it isn't shown again. */
  studyPlanAsked: boolean
  /** Personal FSRS weights; null = the defaults. */
  fsrsWeights: number[] | null
  /** When and how well the personal weights were fitted. */
  fsrsFit: { at: string; reviews: number; improvement: number } | null
  /** Listening exercises use a different system voice each time (high-variability input). */
  varyVoices: boolean
  reminder: { enabled: boolean; time: string }
  /** Share of a normal day's study per weekday, Sunday first: 1 normal, 0.5 light, 0 rest. */
  dayWeights: number[]
  /** Retire words known so well that routine reviews only cost time. */
  autoRetire: boolean
  /** Planned holiday: nothing scheduled, the streak waits. */
  vacation: { from: string; to: string } | null
  profile: Profile
  story: { interests: string[]; custom: string }
}

export const DEFAULT_SETTINGS: Settings = {
  activeLanguage: 'en',
  dailyMinutes: 10,
  newWordsPerDay: 5,
  dailyXpGoal: 50,
  sessionMax: 0,
  theme: 'system',
  autoPlayAudio: true,
  speechRate: 0.9,
  voices: {},
  soundEffects: true,
  hintDelaySec: 6,
  accentStrict: false,
  showKeyLegend: true,
  speechExercises: true,
  retention: 0.9,
  pretest: true,
  confidence: true,
  accentShortcuts: true,
  aiModel: 'claude-opus-5-5',
  aiMonthlyLimit: 0,
  frequencyFirst: false,
  studyPlan: '',
  studyPlanAsked: false,
  fsrsWeights: null,
  fsrsFit: null,
  varyVoices: true,
  reminder: { enabled: false, time: '20:00' },
  dayWeights: [1, 1, 1, 1, 1, 1, 1],
  autoRetire: true,
  vacation: null,
  profile: { name: '', emoji: '🦊', color: '#2563eb', motto: '' },
  story: { interests: [], custom: '' },
}

interface MetaRow {
  key: string
  value: unknown
}

/** One episode of the learner's ongoing story (AI-written around their weak words). */
export interface StoryEpisode {
  id: string
  language: TargetLanguage
  number: number
  title: string
  /** Text contains {{form}} markers for the practised words. */
  paragraphs: { text: string; translation: string }[]
  wordIds: string[]
  /** Two-sentence summary passed to the next episode for continuity. */
  recap: string
  createdAt: Date
  completedAt?: Date
  /** First-attempt result per blank index. */
  answers?: Record<number, boolean>
}

/** A picture or a recording attached to a word. Stored as a Blob so it works offline. */
export interface MediaRow {
  id: string
  kind: 'image' | 'audio'
  /**
   * Raw bytes plus MIME type. Stored this way rather than as a Blob because Safari can lose
   * IndexedDB-stored Blobs (they fail to load after a reload).
   */
  data?: ArrayBuffer
  type?: string
  /** Older rows only. */
  blob?: Blob
  createdAt: Date
}

/** The row's content as a Blob, whichever way it was stored. */
export function mediaBlob(row: MediaRow): Blob {
  return row.blob ?? new Blob([row.data ?? new ArrayBuffer(0)], { type: row.type ?? '' })
}

/**
 * Everything lives on this device (IndexedDB) so practice works offline. JSON export/import
 * is the backup and the way to move data between computer and phone.
 */
export class KelimeDB extends Dexie {
  vocabulary!: Table<VocabularyEntry, string>
  wordStates!: Table<UserWordState, string>
  events!: Table<ReviewEvent, string>
  mistakes!: Table<Mistake, string>
  meta!: Table<MetaRow, string>
  media!: Table<MediaRow, string>
  stories!: Table<StoryEpisode, string>

  constructor(name = 'kelime-koc') {
    super(name)
    this.version(1).stores({
      vocabulary: 'id, language, source',
      wordStates: 'entryId, language',
      events: 'id, entryId, language, timestamp',
      mistakes: 'id, entryId',
      meta: 'key',
    })
    this.version(2).stores({ media: 'id, kind' })
    this.version(3).stores({ stories: 'id, language, createdAt' })
  }

  async addMedia(kind: MediaRow['kind'], blob: Blob): Promise<string> {
    const id = crypto.randomUUID()
    await this.media.add({ id, kind, data: await blob.arrayBuffer(), type: blob.type, createdAt: new Date() })
    return id
  }

  async getSettings(): Promise<Settings | undefined> {
    const row = await this.meta.get('settings')
    if (!row) return undefined
    // Merge nested objects too, so settings saved by an older version get the new defaults.
    const v = row.value as Partial<Settings>
    return {
      ...DEFAULT_SETTINGS,
      ...v,
      voices: { ...DEFAULT_SETTINGS.voices, ...v.voices },
      reminder: { ...DEFAULT_SETTINGS.reminder, ...v.reminder },
      profile: { ...DEFAULT_SETTINGS.profile, ...v.profile },
      story: { ...DEFAULT_SETTINGS.story, ...v.story },
    }
  }

  saveSettings(settings: Settings) {
    return this.meta.put({ key: 'settings', value: settings })
  }

  /** Word keys (stems) the learner knows from reading, per language. */
  async getKnownWords(language: TargetLanguage): Promise<Set<string>> {
    return new Set(((await this.meta.get(`known:${language}`))?.value as string[]) ?? [])
  }

  async addKnownWords(language: TargetLanguage, keys: readonly string[]) {
    const all = await this.getKnownWords(language)
    for (const k of keys) all.add(k)
    await this.meta.put({ key: `known:${language}`, value: [...all] })
  }

  /** Words the reader chose to ignore (names, foreign words, noise): neither known nor new. */
  async getIgnored(language: TargetLanguage): Promise<Set<string>> {
    return new Set(((await this.meta.get(`ignored:${language}`))?.value as string[]) ?? [])
  }

  async setIgnored(language: TargetLanguage, key: string, on: boolean) {
    const all = await this.getIgnored(language)
    if (on) all.add(key)
    else all.delete(key)
    await this.meta.put({ key: `ignored:${language}`, value: [...all] })
  }

  async removeKnownWord(language: TargetLanguage, key: string) {
    const all = await this.getKnownWords(language)
    all.delete(key)
    await this.meta.put({ key: `known:${language}`, value: [...all] })
  }

  /** Times each list word was met while reading. */
  async getEncounters(): Promise<Record<string, number>> {
    return ((await this.meta.get('encounters'))?.value as Record<string, number>) ?? {}
  }

  async addEncounters(add: Record<string, number>) {
    const all = await this.getEncounters()
    for (const [id, n] of Object.entries(add)) all[id] = (all[id] ?? 0) + n
    await this.meta.put({ key: 'encounters', value: all })
  }

  /** AI usage per month ("2026-10"). Kept out of backups like the key itself. */
  async getAiUsage(): Promise<Record<string, MonthUsage>> {
    return ((await this.meta.get('aiUsage'))?.value as Record<string, MonthUsage>) ?? {}
  }

  async addAiUsage(record: UsageRecord) {
    const all = await this.getAiUsage()
    const key = monthKey(record.at)
    await this.meta.put({ key: 'aiUsage', value: { ...all, [key]: addToMonth(all[key], record) } })
  }

  async getExams(): Promise<ExamResult[]> {
    return ((await this.meta.get('exams'))?.value as ExamResult[]) ?? []
  }

  async addExam(result: ExamResult) {
    await this.meta.put({ key: 'exams', value: [...(await this.getExams()), result] })
  }

  async getBossWins(): Promise<BossWin[]> {
    return ((await this.meta.get('bossWins'))?.value as BossWin[]) ?? []
  }

  async addBossWin(win: BossWin) {
    await this.meta.put({ key: 'bossWins', value: [...(await this.getBossWins()), win] })
  }

  async getMissions(): Promise<MissionResult[]> {
    return ((await this.meta.get('missions'))?.value as MissionResult[]) ?? []
  }

  async addMission(result: MissionResult) {
    await this.meta.put({ key: 'missions', value: [...(await this.getMissions()), result] })
  }

  /** Journal entries of one language, newest first. */
  async getJournal(language: TargetLanguage): Promise<JournalEntry[]> {
    const all = ((await this.meta.get('journal'))?.value as JournalEntry[]) ?? []
    return all.filter((j) => j.language === language).sort((a, b) => b.at.localeCompare(a.at))
  }

  async saveJournal(entry: JournalEntry) {
    const all = ((await this.meta.get('journal'))?.value as JournalEntry[]) ?? []
    await this.meta.put({ key: 'journal', value: [entry, ...all.filter((j) => j.id !== entry.id)] })
  }

  /** Records mistakes found in free writing into the Mistake Bank. */
  async addWritingMistakes(found: readonly MistakeInput[]) {
    for (const m of found) {
      const bank = await this.mistakes.where('entryId').equals(m.entryId).toArray()
      await this.mistakes.bulkPut(recordMistake(bank, m))
    }
  }

  /** Vocabulary size test results, oldest first. */
  async getVocabTests(): Promise<VocabTestRecord[]> {
    return ((await this.meta.get('vocabTests'))?.value as VocabTestRecord[]) ?? []
  }

  async addVocabTest(record: VocabTestRecord) {
    await this.meta.put({ key: 'vocabTests', value: [...(await this.getVocabTests()), record] })
  }

  /** The reading library of one language, newest first. Moves an old single saved text in. */
  async getLibrary(language: TargetLanguage): Promise<ReadingText[]> {
    let all = ((await this.meta.get('library'))?.value as ReadingText[]) ?? []
    const legacy = (await this.meta.get(`reading:${language}`))?.value as string | undefined
    if (legacy?.trim()) {
      const item: ReadingText = { id: crypto.randomUUID(), language, title: titleOf(legacy), text: legacy, addedAt: new Date().toISOString(), history: [] }
      all = [item, ...all]
      await this.meta.put({ key: 'library', value: all })
      await this.meta.delete(`reading:${language}`)
      await this.meta.put({ key: `readingCurrent:${language}`, value: item.id })
    }
    return all.filter((t) => t.language === language).sort((a, b) => b.addedAt.localeCompare(a.addedAt))
  }

  async saveText(text: ReadingText) {
    const all = ((await this.meta.get('library'))?.value as ReadingText[]) ?? []
    await this.meta.put({ key: 'library', value: [text, ...all.filter((t) => t.id !== text.id)] })
  }

  async deleteText(id: string) {
    const all = ((await this.meta.get('library'))?.value as ReadingText[]) ?? []
    await this.meta.put({ key: 'library', value: all.filter((t) => t.id !== id) })
  }

  /** Id of the text open in reading mode, per language. */
  async getCurrentText(language: TargetLanguage): Promise<string | null> {
    return ((await this.meta.get(`readingCurrent:${language}`))?.value as string) ?? null
  }

  setCurrentText(language: TargetLanguage, id: string | null) {
    return this.meta.put({ key: `readingCurrent:${language}`, value: id })
  }

  /** Personal bests in the games, per game and language. */
  async getRecords(): Promise<Record<string, number>> {
    return ((await this.meta.get('records'))?.value as Record<string, number>) ?? {}
  }

  async saveRecord(key: string, value: number) {
    const all = await this.getRecords()
    await this.meta.put({ key: 'records', value: { ...all, [key]: value } })
  }

  /** Kept apart from settings so it is never written into a backup file. */
  async getAiKey(): Promise<string | null> {
    const row = await this.meta.get('aiKey')
    return typeof row?.value === 'string' && row.value ? row.value : null
  }

  saveAiKey(key: string | null) {
    return key ? this.meta.put({ key: 'aiKey', value: key }) : this.meta.delete('aiKey')
  }

  /** Google Cloud TTS key: on this device only, never in backups (like the AI key). */
  async getTtsKey(): Promise<string | null> {
    const row = await this.meta.get('ttsKey')
    return typeof row?.value === 'string' && row.value ? row.value : null
  }

  saveTtsKey(key: string | null) {
    return key ? this.meta.put({ key: 'ttsKey', value: key }) : this.meta.delete('ttsKey')
  }

  /** Characters sent to the TTS API per month ("2026-10"), against the free tier. */
  async getTtsUsage(): Promise<Record<string, number>> {
    return ((await this.meta.get('ttsUsage'))?.value as Record<string, number>) ?? {}
  }

  async addTtsChars(n: number) {
    const all = await this.getTtsUsage()
    const k = monthKey(new Date())
    await this.meta.put({ key: 'ttsUsage', value: { ...all, [k]: (all[k] ?? 0) + n } })
  }

  async loadLanguage(language: TargetLanguage) {
    const [vocabulary, states, mistakes] = await Promise.all([
      this.vocabulary.where('language').equals(language).toArray(),
      this.wordStates.where('language').equals(language).toArray(),
      this.mistakes.toArray(),
    ])
    const ids = new Set(vocabulary.map((v) => v.id))
    return { vocabulary, states, mistakes: mistakes.filter((m) => ids.has(m.entryId)) }
  }

  /** Persists one answered exercise atomically: new word state, the event, and touched mistakes. */
  saveReview(result: ReviewResult) {
    const touched = result.mistakes.filter((m) => m.entryId === result.state.entryId)
    return this.transaction('rw', [this.wordStates, this.events, this.mistakes], async () => {
      await this.wordStates.put(result.state)
      await this.events.add(result.event)
      await this.mistakes.bulkPut(touched)
    })
  }

  /** Answers since `date`, for one language or (no language) all of them. */
  eventsSince(date: Date, language?: TargetLanguage) {
    return this.events
      .where('timestamp')
      .aboveOrEqual(date)
      .filter((e) => !language || e.language === language)
      .toArray()
  }

  /**
   * Replaces an answer that the learner overrode ("my answer was right too"): the old event is
   * removed and the recomputed state/event/mistakes take its place, atomically.
   */
  replaceReview(oldEventId: string, result: ReviewResult, staleMistakeIds: string[]) {
    const touched = result.mistakes.filter((m) => m.entryId === result.state.entryId)
    return this.transaction('rw', [this.wordStates, this.events, this.mistakes], async () => {
      await this.events.delete(oldEventId)
      await this.wordStates.put(result.state)
      await this.events.add(result.event)
      await this.mistakes.bulkDelete(staleMistakeIds)
      await this.mistakes.bulkPut(touched)
    })
  }

  /** Ids of deleted words, so a sync doesn't bring them back from another device. */
  async getDeleted(): Promise<string[]> {
    return ((await this.meta.get('deleted'))?.value as string[]) ?? []
  }

  async addDeleted(ids: readonly string[]) {
    await this.meta.put({ key: 'deleted', value: [...new Set([...(await this.getDeleted()), ...ids])] })
  }

  /** Deletes many words in one transaction: either all of them go, or none. */
  deleteWords(ids: readonly string[]) {
    return this.transaction('rw', [this.vocabulary, this.wordStates, this.events, this.mistakes, this.media, this.meta], async () => {
      await this.addDeleted(ids)
      const entries = await this.vocabulary.bulkGet([...ids])
      const media = entries.flatMap((e) => [e?.imageId, e?.audioId]).filter((m): m is string => !!m)
      await this.media.bulkDelete(media)
      await this.vocabulary.bulkDelete([...ids])
      await this.wordStates.bulkDelete([...ids])
      await this.events.where('entryId').anyOf([...ids]).delete()
      await this.mistakes.where('entryId').anyOf([...ids]).delete()
    })
  }

  /** Deleting a word also deletes what was learned about it, and its picture/recording. */
  deleteWord(id: string) {
    return this.transaction('rw', [this.vocabulary, this.wordStates, this.events, this.mistakes, this.media, this.meta], async () => {
      await this.addDeleted([id])
      const entry = await this.vocabulary.get(id)
      const media = [entry?.imageId, entry?.audioId].filter((m): m is string => !!m)
      if (media.length) await this.media.bulkDelete(media)
      await this.vocabulary.delete(id)
      await this.wordStates.delete(id)
      await this.events.where('entryId').equals(id).delete()
      await this.mistakes.where('entryId').equals(id).delete()
    })
  }
}

// ---------------------------------------------------------------------------
// Backup
// ---------------------------------------------------------------------------

/** v2 adds media (pictures/recordings) as data URLs. v1 backups still restore. */
export const BACKUP_VERSION = 3

export interface Backup {
  app: 'kelime-koc'
  version: number
  exportedAt: string
  settings?: Settings
  vocabulary: VocabularyEntry[]
  wordStates: UserWordState[]
  events: ReviewEvent[]
  mistakes: Mistake[]
  media?: { id: string; kind: MediaRow['kind']; dataUrl: string; createdAt: string }[]
  stories?: StoryEpisode[]
  /** Known-word sets and reading encounters (backup version 3+). */
  reading?: { known: Partial<Record<TargetLanguage, string[]>>; encounters: Record<string, number>; library?: ReadingText[]; ignored?: Partial<Record<TargetLanguage, string[]>> }
  vocabTests?: VocabTestRecord[]
  journal?: JournalEntry[]
  bossWins?: BossWin[]
  missions?: MissionResult[]
  exams?: ExamResult[]
  /** Ids of deleted words (sync tombstones). */
  deleted?: string[]
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  let binary = ''
  // Chunked so large recordings don't overflow the argument limit of fromCharCode.
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  return `data:${blob.type || 'application/octet-stream'};base64,${btoa(binary)}`
}

async function dataUrlToBlob(url: string): Promise<Blob> {
  const [head, data] = url.split(',', 2)
  const mime = head.match(/data:([^;]+)/)?.[1] ?? 'application/octet-stream'
  const bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0))
  return new Blob([bytes], { type: mime })
}

/** `media: false` leaves pictures and recordings out (sync sends them separately). */
export async function exportBackup(db: KelimeDB, now = new Date(), { media: withMedia = true }: { media?: boolean } = {}): Promise<string> {
  const backup: Backup = {
    app: 'kelime-koc',
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    settings: await db.getSettings(),
    vocabulary: await db.vocabulary.toArray(),
    wordStates: await db.wordStates.toArray(),
    events: await db.events.toArray(),
    mistakes: await db.mistakes.toArray(),
    stories: await db.stories.toArray(),
    reading: {
      known: Object.fromEntries(await Promise.all(TARGET_LANGUAGES.map(async (l) => [l, [...(await db.getKnownWords(l))]]))),
      encounters: await db.getEncounters(),
      library: ((await db.meta.get('library'))?.value as ReadingText[]) ?? [],
      ignored: Object.fromEntries(await Promise.all(TARGET_LANGUAGES.map(async (l) => [l, [...(await db.getIgnored(l))]]))),
    },
    vocabTests: await db.getVocabTests(),
    journal: ((await db.meta.get('journal'))?.value as JournalEntry[]) ?? [],
    bossWins: await db.getBossWins(),
    missions: await db.getMissions(),
    exams: await db.getExams(),
    deleted: await db.getDeleted(),
    media: await Promise.all(
      // Cached natural-voice audio ("tts:") can be re-created, so it stays out of backups.
      (withMedia ? await db.media.toArray() : []).filter((m) => !m.id.startsWith('tts:')).map(async (m) => ({
        id: m.id,
        kind: m.kind,
        dataUrl: await blobToDataUrl(mediaBlob(m)),
        createdAt: m.createdAt.toISOString(),
      })),
    ),
  }
  return JSON.stringify(backup)
}

const DATE_KEYS = new Set(['due', 'last_review', 'introducedAt', 'lastReviewAt', 'timestamp', 'firstAt', 'lastAt', 'addedAt', 'createdAt', 'completedAt'])
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/

export function parseBackup(json: string): Backup {
  const data = JSON.parse(json, (key, value) =>
    DATE_KEYS.has(key) && typeof value === 'string' && ISO.test(value) ? new Date(value) : value,
  )
  if (data?.app !== 'kelime-koc' || !Array.isArray(data.vocabulary)) {
    throw new Error('Bu dosya bir Kelime Koçu yedeği değil.')
  }
  if (data.version > BACKUP_VERSION) {
    throw new Error('Yedek, uygulamanın daha yeni bir sürümüyle alınmış. Önce uygulamayı güncelle.')
  }
  return data as Backup
}

/** Replaces everything on this device with the backup. */
/** `keepMedia`: leave this device's pictures and recordings as they are (sync merges them apart). */
export async function restoreBackup(db: KelimeDB, backup: Backup, { keepMedia = false }: { keepMedia?: boolean } = {}) {
  // Decode media before the transaction: IndexedDB transactions close on unrelated awaits.
  const media = await Promise.all(
    (backup.media ?? []).map(async (m) => {
      const blob = await dataUrlToBlob(m.dataUrl)
      return { id: m.id, kind: m.kind, data: await blob.arrayBuffer(), type: blob.type, createdAt: new Date(m.createdAt) }
    }),
  )
  await db.transaction('rw', [db.vocabulary, db.wordStates, db.events, db.mistakes, db.meta, db.media, db.stories], async () => {
    await Promise.all([db.vocabulary.clear(), db.wordStates.clear(), db.events.clear(), db.mistakes.clear(), db.stories.clear(), keepMedia ? undefined : db.media.clear()])
    if (!keepMedia) await db.media.bulkPut(media)
    await db.stories.bulkPut(backup.stories ?? [])
    await db.vocabulary.bulkPut(backup.vocabulary)
    await db.wordStates.bulkPut(backup.wordStates)
    await db.events.bulkPut(backup.events)
    await db.mistakes.bulkPut(backup.mistakes)
    if (backup.settings) await db.saveSettings(backup.settings)
    if (backup.reading) {
      for (const [l, keys] of Object.entries(backup.reading.known)) await db.meta.put({ key: `known:${l}`, value: keys })
      await db.meta.put({ key: 'encounters', value: backup.reading.encounters })
      if (backup.reading.library) await db.meta.put({ key: 'library', value: backup.reading.library })
      for (const [l, keys] of Object.entries(backup.reading.ignored ?? {})) await db.meta.put({ key: `ignored:${l}`, value: keys })
    }
    if (backup.vocabTests) await db.meta.put({ key: 'vocabTests', value: backup.vocabTests })
    if (backup.journal) await db.meta.put({ key: 'journal', value: backup.journal })
    if (backup.bossWins) await db.meta.put({ key: 'bossWins', value: backup.bossWins })
    if (backup.missions) await db.meta.put({ key: 'missions', value: backup.missions })
    if (backup.exams) await db.meta.put({ key: 'exams', value: backup.exams })
    if (backup.deleted) await db.meta.put({ key: 'deleted', value: backup.deleted })
  })
}
