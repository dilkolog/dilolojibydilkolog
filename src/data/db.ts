import Dexie, { type Table } from 'dexie'
import type { Cue } from '../engine/subtitles'
import type { TranslationEntry } from '../engine/translationMemory'
import type { EarLog, EarMiss } from '../engine/earMisses'
import type { GrammarLog } from '../engine/grammar'
import type { DeductionLog } from '../engine/deduction'
import type { BadgeLog } from '../engine/gamification'
import { addToMonth, monthKey, type AiModel, type MonthUsage, type UsageRecord } from '../ai/usage'
import type { JournalReview } from '../ai/types'
import { recordMistake, type MistakeInput } from '../engine/mistakes'
import type { BossWin } from '../engine/bosses'
import type { ExamResult } from '../engine/exam'
import { emptyLab, type LabData } from '../engine/labProgress'
import { emptyNotes, type DictionaryNotes } from '../engine/dictionaryNotes'
import type { ReviewResult } from '../engine/review'
import type { MissionResult } from '../engine/missions'
import type { SentenceCard } from '../engine/sentences'
import { troubleWords } from '../engine/trouble'
import { deadIds, mergeTombs, tombList, tombMap, type Mark, type Tombstone } from './tombstones'
import type { TypingShare } from '../engine/session'
import {
  TARGET_LANGUAGES,
  addedTime,
  timeOf,
  type CefrLevel,
  type Mistake,
  type ReviewEvent,
  type TargetLanguage,
  type UserWordState,
  type VocabularyEntry,
  type WordList,
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
  /** Audio of a listening episode: the text is its transcript. */
  audio?: string
  /** The transcript's timed cues, when it had them: the audio is followed sentence by sentence. */
  cues?: Cue[]
  /** Sentences the learner pinned to the moment they were heard: the follow of an untimed audio is fitted to them. */
  syncAnchors?: { sentence: number; time: number }[]
  /** Where the text came from (a YouTube video, a page), shown as a link. */
  source?: string
  /** Each paragraph's Turkish, when the text came with one (a story's Turkish edition). */
  turkish?: string[]
  /** Each paragraph's picture, when the text is an illustrated story ('' for none). */
  images?: string[]
  /** Who made it and under which licence, shown with the text (open licences ask for it). */
  credit?: string
  /** A chapter of an imported book (EPUB): chapters share the book id and keep their order. */
  book?: { id: string; title: string; index: number; total: number }
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
  /** Card banner and avatar frame (ids from profileStyle.ts); unknown ids fall back to the defaults. */
  banner?: string
  frame?: string
  /** The title shown beside the level: 'auto' / undefined follows the level (see availableTitles). */
  title?: string
  /** Badges shown on the card (at most three), by id. */
  pinned?: string[]
  /** Interests, shown as chips (at most six). */
  interests?: string[]
  /** A goal: a CEFR level and, optionally, a date to reach it by (ISO). */
  goalLevel?: string
  goalDate?: string
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
  /** A day estimated above 15 minutes is done in two sittings (with no session cap); default on. */
  splitLongDays?: boolean
  /** 'calm': the dark theme with its colours turned down, for working at night. 'contrast': the light theme at its most legible. */
  theme: 'system' | 'light' | 'dark' | 'calm' | 'contrast'
  /** Set once the light default replaced an inherited 'system' (2026-10-06). */
  themeLightDefault?: boolean
  /** Scales the whole interface (everything is sized in rem). */
  textScale?: 'normal' | 'large' | 'xlarge'
  /** Short vibrations on answers (phones that support it). */
  haptics?: boolean
  /** Tabs taken out of the menu (still in ⌘K and links); see HIDEABLE_TABS. */
  hiddenTabs?: string[]
  /** Reviews waiting shown as a number on the app icon (installed app); default on. */
  appBadge?: boolean
  /** Offer a word copied elsewhere on coming back to the app (needs clipboard permission); default off. */
  clipboardSuggest?: boolean
  /** Spanish without the vosotros forms (Latin American usage): not asked, shown faded. */
  hideVosotros?: boolean
  /** The word list in focus per language: new words come only from it (see dailyPlan). */
  focusList?: Partial<Record<TargetLanguage, string>>
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
  /** `auto` (default on): remind at the usual study hour once there is one (usualStudyHour), else at `time`. */
  reminder: { enabled: boolean; time: string; auto?: boolean }
  /** Share of a normal day's study per weekday, Sunday first: 1 normal, 0.5 light, 0 rest. */
  dayWeights: number[]
  /** Retire words known so well that routine reviews only cost time. */
  autoRetire: boolean
  /** How often recognition questions become typing for words already met. */
  typingShare: TypingShare
  /** Cue with the definition in the word's own language instead of the Turkish meaning. */
  targetDefinitions: boolean
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
  // Light by default: it reads better (the learner's choice, 2026-10-06); dark stays one tap away.
  theme: 'light',
  themeLightDefault: true,
  textScale: 'normal',
  haptics: true,
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
  typingShare: 'balanced',
  targetDefinitions: false,
  vacation: null,
  profile: { name: '', emoji: '🦊', color: '#2563eb', motto: '' },
  story: { interests: [], custom: '' },
}

export interface WordSnapshot {
  ids: string[]
  vocabulary: VocabularyEntry[]
  wordStates: UserWordState[]
  events: ReviewEvent[]
  mistakes: Mistake[]
  media: MediaRow[]
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
    // Settings from before the light default followed the system (often dark): move them to light once.
    const theme = v.themeLightDefault ? v.theme : v.theme === 'system' || !v.theme ? 'light' : v.theme
    return {
      ...DEFAULT_SETTINGS,
      ...v,
      theme: theme ?? 'light',
      themeLightDefault: true,
      voices: { ...DEFAULT_SETTINGS.voices, ...v.voices },
      reminder: { ...DEFAULT_SETTINGS.reminder, ...v.reminder },
      profile: { ...DEFAULT_SETTINGS.profile, ...v.profile },
      story: { ...DEFAULT_SETTINGS.story, ...v.story },
    }
  }

  /**
   * Keeps the settings and notes which of them changed now, field by field (meta 'settingsAt'):
   * sync then takes each field from the device that changed it last instead of one device's whole object.
   * `stamp: false` for a restore, which brings the stamps with it.
   */
  async saveSettings(settings: Settings, { stamp = true }: { stamp?: boolean } = {}) {
    if (stamp) {
      const before = (await this.getSettings()) ?? DEFAULT_SETTINGS
      const at = await this.getSettingsAt()
      const now = new Date().toISOString()
      for (const k of Object.keys(settings) as (keyof Settings)[]) if (JSON.stringify(settings[k]) !== JSON.stringify(before[k])) at[k] = now
      await this.meta.put({ key: 'settingsAt', value: at })
    }
    return this.meta.put({ key: 'settings', value: settings })
  }

  async getSettingsAt(): Promise<Record<string, string>> {
    const v = (await this.meta.get('settingsAt'))?.value
    return v && typeof v === 'object' ? { ...(v as Record<string, string>) } : {}
  }

  /** Word keys (stems) the learner knows from reading, per language. */
  async getKnownWords(language: TargetLanguage): Promise<Set<string>> {
    return new Set(((await this.meta.get(`known:${language}`))?.value as string[]) ?? [])
  }

  async addKnownWords(language: TargetLanguage, keys: readonly string[]) {
    const all = await this.getKnownWords(language)
    for (const k of keys) all.add(k)
    await this.meta.put({ key: `known:${language}`, value: [...all] })
    await this.reviveRemoved(keys.map((k) => `known:${language}:${k}`))
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
    if (on) await this.reviveRemoved([`ignored:${language}:${key}`])
    else await this.addDeleted([`ignored:${language}:${key}`])
  }

  async removeKnownWord(language: TargetLanguage, key: string) {
    const all = await this.getKnownWords(language)
    all.delete(key)
    await this.meta.put({ key: `known:${language}`, value: [...all] })
    // The mark travels with sync: without it the other devices' copies of the list bring the word back.
    await this.addDeleted([`known:${language}:${key}`])
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

  /** Sentence cards; card dates come back as Dates even after a JSON round trip (backup, sync). */
  /** Word lists (Memrise-style courses), all languages, oldest first. */
  async getLists(language?: TargetLanguage): Promise<WordList[]> {
    const all = ((await this.meta.get('wordLists'))?.value as WordList[]) ?? []
    return language ? all.filter((l) => l.language === language) : all
  }

  async saveList(list: WordList) {
    const all = await this.getLists()
    const at = all.findIndex((l) => l.id === list.id)
    await this.meta.put({ key: 'wordLists', value: at < 0 ? [...all, list] : all.map((l, i) => (i === at ? list : l)) })
  }

  /** Deletes a list; its words stay, without a list. */
  async deleteList(id: string) {
    await this.transaction('rw', [this.vocabulary, this.meta], async () => {
      await this.meta.put({ key: 'wordLists', value: (await this.getLists()).filter((l) => l.id !== id) })
      await this.vocabulary.filter((v) => v.listId === id).modify((v) => {
        delete v.listId
        delete v.levelId
      })
      // Remembered, so another device's copy doesn't bring it back on sync.
      await this.addDeleted([id])
    })
  }

  /** Puts words in a list and one of its levels (one list per word), or takes them out (null). */
  async assignList(ids: readonly string[], listId: string | null, levelId: string | null = null) {
    await this.vocabulary.where('id').anyOf([...ids]).modify((v) => {
      if (listId) v.listId = listId
      else delete v.listId
      if (listId && levelId) v.levelId = levelId
      else delete v.levelId
    })
  }

  /** Removes a level from a list; its words stay in the list, with no level. */
  async deleteLevel(list: WordList, levelId: string) {
    await this.transaction('rw', [this.vocabulary, this.meta], async () => {
      await this.saveList({ ...list, levels: (list.levels ?? []).filter((l) => l.id !== levelId), updatedAt: new Date().toISOString() })
      await this.vocabulary.filter((v) => v.listId === list.id && v.levelId === levelId).modify((v) => void delete v.levelId)
    })
  }

  async getSentences(): Promise<SentenceCard[]> {
    let all = ((await this.meta.get('sentences'))?.value as SentenceCard[]) ?? []
    if (all.some((s) => typeof s.addedAt !== 'string')) {
      all = all.map((s) => (typeof s.addedAt === 'string' ? s : { ...s, addedAt: new Date(timeOf(s.addedAt)).toISOString() }))
      await this.meta.put({ key: 'sentences', value: all })
    }
    return all.map((s) => ({ ...s, card: { ...s.card, due: new Date(s.card.due), last_review: s.card.last_review ? new Date(s.card.last_review) : undefined } }))
  }

  async saveSentence(sentence: SentenceCard) {
    const all = await this.getSentences()
    await this.meta.put({ key: 'sentences', value: [sentence, ...all.filter((s) => s.id !== sentence.id)] })
  }

  async deleteSentence(id: string) {
    await this.meta.put({ key: 'sentences', value: (await this.getSentences()).filter((s) => s.id !== id) })
    // Remembered, so another device's copy doesn't bring it back on sync.
    await this.addDeleted([id])
  }

  async getMissions(): Promise<MissionResult[]> {
    return ((await this.meta.get('missions'))?.value as MissionResult[]) ?? []
  }

  async addMission(result: MissionResult) {
    await this.meta.put({ key: 'missions', value: [...(await this.getMissions()), result] })
  }

  /** Journal entries of one language, newest first. */
  async getJournal(language: TargetLanguage): Promise<JournalEntry[]> {
    let all = ((await this.meta.get('journal'))?.value as JournalEntry[]) ?? []
    if (all.some((j) => typeof j.at !== 'string')) {
      all = all.map((j) => (typeof j.at === 'string' ? j : { ...j, at: new Date(timeOf(j.at)).toISOString() }))
      await this.meta.put({ key: 'journal', value: all })
    }
    return all.filter((j) => j.language === language).sort((a, b) => timeOf(b.at) - timeOf(a.at))
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
    let all = ((await this.meta.get('vocabTests'))?.value as VocabTestRecord[]) ?? []
    if (all.some((t) => typeof t.at !== 'string')) {
      all = all.map((t) => (typeof t.at === 'string' ? t : { ...t, at: new Date(timeOf(t.at)).toISOString() }))
      await this.meta.put({ key: 'vocabTests', value: all })
    }
    return all
  }

  async addVocabTest(record: VocabTestRecord) {
    await this.meta.put({ key: 'vocabTests', value: [...(await this.getVocabTests()), record] })
  }

  /** The reading library of one language, newest first. Moves an old single saved text in. */
  async getLibrary(language: TargetLanguage): Promise<ReadingText[]> {
    let all = ((await this.meta.get('library'))?.value as ReadingText[]) ?? []
    // A date stored as a Date (or anything but text) is put right once, here: sorting by it would
    // otherwise fail and leave the reading screen empty.
    if (all.some((t) => typeof t.addedAt !== 'string')) {
      all = all.map((t) => (typeof t.addedAt === 'string' ? t : { ...t, addedAt: new Date(addedTime(t)).toISOString() }))
      await this.meta.put({ key: 'library', value: all })
    }
    const legacy = (await this.meta.get(`reading:${language}`))?.value as string | undefined
    if (legacy?.trim()) {
      const item: ReadingText = { id: crypto.randomUUID(), language, title: titleOf(legacy), text: legacy, addedAt: new Date().toISOString(), history: [] }
      all = [item, ...all]
      await this.meta.put({ key: 'library', value: all })
      await this.meta.delete(`reading:${language}`)
      await this.meta.put({ key: `readingCurrent:${language}`, value: item.id })
    }
    return all.filter((t) => t.language === language).sort((a, b) => addedTime(b) - addedTime(a) || (a.book?.index ?? 0) - (b.book?.index ?? 0))
  }

  async saveText(text: ReadingText) {
    const all = ((await this.meta.get('library'))?.value as ReadingText[]) ?? []
    await this.meta.put({ key: 'library', value: [text, ...all.filter((t) => t.id !== text.id)] })
  }

  /** Several texts at once (a book's chapters). */
  async saveTexts(texts: ReadingText[]) {
    const ids = new Set(texts.map((t) => t.id))
    const all = ((await this.meta.get('library'))?.value as ReadingText[]) ?? []
    await this.meta.put({ key: 'library', value: [...texts, ...all.filter((t) => !ids.has(t.id))] })
  }

  async deleteBook(bookId: string) {
    const all = ((await this.meta.get('library'))?.value as ReadingText[]) ?? []
    await this.meta.put({ key: 'library', value: all.filter((t) => t.book?.id !== bookId) })
    await this.addDeleted(all.filter((t) => t.book?.id === bookId).map((t) => t.id))
  }

  async deleteText(id: string) {
    const all = ((await this.meta.get('library'))?.value as ReadingText[]) ?? []
    await this.meta.put({ key: 'library', value: all.filter((t) => t.id !== id) })
    await this.addDeleted([id])
  }

  /** Id of the text open in reading mode, per language. */
  async getCurrentText(language: TargetLanguage): Promise<string | null> {
    return ((await this.meta.get(`readingCurrent:${language}`))?.value as string) ?? null
  }

  setCurrentText(language: TargetLanguage, id: string | null) {
    return this.meta.put({ key: `readingCurrent:${language}`, value: id })
  }

  /** Personal bests in the games, per game and language. */
  /** Sentences and words translated, newest first (see engine/translationMemory). */
  async getTranslations(): Promise<TranslationEntry[]> {
    let all = ((await this.meta.get('translations'))?.value as TranslationEntry[]) ?? []
    if (all.some((t) => typeof t.at !== 'string')) {
      all = all.map((t) => (typeof t.at === 'string' ? t : { ...t, at: new Date(timeOf(t.at)).toISOString() }))
      await this.meta.put({ key: 'translations', value: all })
    }
    return all
  }

  saveTranslations(list: TranslationEntry[]) {
    return this.meta.put({ key: 'translations', value: list })
  }

  /** The words missed in dictation, per language (see engine/earMisses). */
  async getEarLog(): Promise<EarLog> {
    const raw = ((await this.meta.get('earMisses'))?.value as EarLog) ?? {}
    let dirty = false
    const log: EarLog = {}
    for (const [lang, words] of Object.entries(raw)) {
      const fixed: Record<string, EarMiss> = {}
      for (const [w, m] of Object.entries(words ?? {})) {
        if (typeof m.last !== 'string') {
          dirty = true
          fixed[w] = { ...m, last: new Date(timeOf(m.last)).toISOString() }
        } else {
          fixed[w] = m
        }
      }
      log[lang as TargetLanguage] = fixed
    }
    if (dirty) {
      await this.meta.put({ key: 'earMisses', value: log })
    }
    return log
  }

  saveEarLog(log: EarLog) {
    return this.meta.put({ key: 'earMisses', value: log })
  }

  /** How the grammar questions went, per question (see engine/grammar). */
  async getGrammarLog(): Promise<GrammarLog> {
    return ((await this.meta.get('grammar'))?.value as GrammarLog) ?? {}
  }

  saveGrammarLog(log: GrammarLog) {
    return this.meta.put({ key: 'grammar', value: log })
  }

  /** How the phrases of the 3-second round went, per phrase (same shape as the grammar log). */
  async getReflexLog(): Promise<GrammarLog> {
    return ((await this.meta.get('reflex'))?.value as GrammarLog) ?? {}
  }

  saveReflexLog(log: GrammarLog) {
    return this.meta.put({ key: 'reflex', value: log })
  }

  /** How the false-friend questions went, per word (same shape as the grammar log). */
  async getTrapLog(): Promise<GrammarLog> {
    return ((await this.meta.get('traps'))?.value as GrammarLog) ?? {}
  }

  saveTrapLog(log: GrammarLog) {
    return this.meta.put({ key: 'traps', value: log })
  }

  /** How the sound pairs of "Ses ayırt etme" went, per pair (same shape as the grammar log). */
  async getPairLog(): Promise<GrammarLog> {
    return ((await this.meta.get('pairs'))?.value as GrammarLog) ?? {}
  }

  savePairLog(log: GrammarLog) {
    return this.meta.put({ key: 'pairs', value: log })
  }

  /** How the guesses of deduction mode in Reading went, per language (see engine/deduction). */
  async getDeductionLog(): Promise<DeductionLog> {
    return ((await this.meta.get('deduction'))?.value as DeductionLog) ?? {}
  }

  saveDeductionLog(log: DeductionLog) {
    return this.meta.put({ key: 'deduction', value: log })
  }

  /** Badges earned and when (see engine/gamification BadgeLog). */
  async getBadgeLog(): Promise<BadgeLog> {
    return ((await this.meta.get('badges'))?.value as BadgeLog) ?? {}
  }

  /** Adds badges to the log (earned now, or at the given dates); a badge already there keeps its date. */
  async logBadges(add: BadgeLog) {
    const all = await this.getBadgeLog()
    const next = { ...add, ...all }
    if (Object.keys(next).length !== Object.keys(all).length) await this.meta.put({ key: 'badges', value: next })
  }

  async getRecords(): Promise<Record<string, number>> {
    return ((await this.meta.get('records'))?.value as Record<string, number>) ?? {}
  }

  async saveRecord(key: string, value: number) {
    const all = await this.getRecords()
    await this.meta.put({ key: 'records', value: { ...all, [key]: value } })
  }

  /** The verb lab's favourites, recent verbs and practice records, per language (see engine/labProgress). */
  async getLab(language: TargetLanguage): Promise<LabData> {
    const v = (await this.meta.get(`lab:${language}`))?.value as Partial<LabData> | undefined
    return { ...emptyLab(), ...v }
  }

  async saveLab(language: TargetLanguage, lab: LabData) {
    // A favourite taken out leaves a mark (and one put back clears it), so sync doesn't bring it back from another device.
    const was = new Set((await this.getLab(language)).favorites)
    const now = new Set(lab.favorites)
    await this.meta.put({ key: `lab:${language}`, value: lab })
    const removed = [...was].filter((v) => !now.has(v))
    if (removed.length) await this.addDeleted(removed.map((v) => `fav:${language}:${v}`))
    await this.reviveRemoved([...now].filter((v) => !was.has(v)).map((v) => `fav:${language}:${v}`))
  }

  /** The learner's dictionary corrections and look-ups, per language (see engine/dictionaryNotes). */
  async getDictionaryNotes(language: TargetLanguage): Promise<DictionaryNotes> {
    const v = (await this.meta.get(`dict:${language}`))?.value as Partial<DictionaryNotes> | undefined
    return { ...emptyNotes(), ...v }
  }

  async saveDictionaryNotes(language: TargetLanguage, notes: DictionaryNotes) {
    // A correction taken back leaves a mark; a newer correction of the same word is alive regardless (see tombstones.ts).
    const was = (await this.getDictionaryNotes(language)).fixes
    await this.meta.put({ key: `dict:${language}`, value: notes })
    const removed = Object.keys(was).filter((w) => !notes.fixes[w])
    if (removed.length) await this.addDeleted(removed.map((w) => `fix:${language}:${w}`))
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

  /** Azure Speech key and region (pronunciation assessment): on this device only, never in backups. */
  async getSpeechKey(): Promise<{ key: string; region: string } | null> {
    const v = (await this.meta.get('azureSpeech'))?.value as { key?: string; region?: string } | undefined
    return v?.key && v.region ? { key: v.key, region: v.region } : null
  }

  saveSpeechKey(cfg: { key: string; region: string } | null) {
    return cfg ? this.meta.put({ key: 'azureSpeech', value: cfg }) : this.meta.delete('azureSpeech')
  }

  /** Pronunciation scores per word (newest last, at most 20 each), to show progress. */
  async getPronScores(entryId: string): Promise<{ at: string; score: number }[]> {
    const all = ((await this.meta.get('pronScores'))?.value as Record<string, { at: string; score: number }[]>) ?? {}
    return all[entryId] ?? []
  }

  /** Every word's pronunciation scores, by word id. */
  async getAllPronScores(): Promise<Record<string, { at: string; score: number }[]>> {
    return ((await this.meta.get('pronScores'))?.value as Record<string, { at: string; score: number }[]>) ?? {}
  }

  async addPronScore(entryId: string, score: number, at = new Date()) {
    const all = ((await this.meta.get('pronScores'))?.value as Record<string, { at: string; score: number }[]>) ?? {}
    all[entryId] = [...(all[entryId] ?? []), { at: at.toISOString(), score }].slice(-20)
    await this.meta.put({ key: 'pronScores', value: all })
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
    const [vocabulary, states, mistakes, lists, earLog, pronScores] = await Promise.all([
      this.vocabulary.where('language').equals(language).toArray(),
      this.wordStates.where('language').equals(language).toArray(),
      this.mistakes.toArray(),
      this.getLists(language),
      this.getEarLog(),
      this.getAllPronScores(),
    ])
    const ids = new Set(vocabulary.map((v) => v.id))
    return { vocabulary, states, mistakes: mistakes.filter((m) => ids.has(m.entryId)), lists, trouble: troubleWords(vocabulary, language, earLog, pronScores) }
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

  /**
   * Takes an answer back entirely ("I tapped the wrong option"): the event goes, the word's state
   * is what it was before (or none, for a word never answered), and so are its mistakes.
   */
  revertReview(eventId: string, before: UserWordState | null, entryId: string, mistakesBefore: Mistake[]) {
    const restore = mistakesBefore.filter((m) => m.entryId === entryId)
    return this.transaction('rw', [this.wordStates, this.events, this.mistakes], async () => {
      await this.events.delete(eventId)
      if (before) await this.wordStates.put(before)
      else await this.wordStates.delete(entryId)
      await this.mistakes.where('entryId').equals(entryId).delete()
      await this.mistakes.bulkPut(restore)
    })
  }

  /** What was deleted, so a sync doesn't bring it back from another device. */
  async getDeleted(): Promise<Tombstone[]> {
    return ((await this.meta.get('deleted'))?.value as Tombstone[]) ?? []
  }

  async addDeleted(ids: readonly string[], now = Date.now()) {
    await this.markTombs(ids, { at: now, alive: false })
  }

  /** Undo of a deletion: the items count as alive again on every device. */
  async reviveDeleted(ids: readonly string[], now = Date.now()) {
    await this.markTombs(ids, { at: now, alive: true })
  }

  private async markTombs(ids: readonly string[], mark: Mark) {
    const map = tombMap(await this.getDeleted(), Date.now())
    await this.meta.put({ key: 'deleted', value: tombList(mergeTombs(map, new Map(ids.map((id) => [id, mark])))) })
  }

  /** Puts back the "removed" marks of set members (known/ignored words, favourites) that were added again. */
  private async reviveRemoved(ids: readonly string[]) {
    if (!ids.length) return
    const dead = deadIds(await this.getDeleted())
    const back = ids.filter((id) => dead.has(id))
    if (back.length) await this.reviveDeleted(back)
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

  /** Everything stored about some words, taken before deleting or resetting them (for undo). */
  snapshotWords(ids: readonly string[]): Promise<WordSnapshot> {
    return this.transaction('r', [this.vocabulary, this.wordStates, this.events, this.mistakes, this.media], async () => {
      const vocabulary = (await this.vocabulary.bulkGet([...ids])).filter((v): v is VocabularyEntry => !!v)
      const mediaIds = vocabulary.flatMap((e) => [e.imageId, e.audioId]).filter((m): m is string => !!m)
      return {
        ids: [...ids],
        vocabulary,
        wordStates: (await this.wordStates.bulkGet([...ids])).filter((s): s is UserWordState => !!s),
        events: await this.events.where('entryId').anyOf([...ids]).toArray(),
        mistakes: await this.mistakes.where('entryId').anyOf([...ids]).toArray(),
        media: (await this.media.bulkGet(mediaIds)).filter((m): m is MediaRow => !!m),
      }
    })
  }

  /** Puts words back exactly as they were in `snap` (undo of a delete, merge or reset). */
  restoreWords(snap: WordSnapshot) {
    return this.transaction('rw', [this.vocabulary, this.wordStates, this.events, this.mistakes, this.media, this.meta], async () => {
      await this.wordStates.bulkDelete(snap.ids)
      await this.mistakes.where('entryId').anyOf(snap.ids).delete()
      await this.media.bulkPut(snap.media)
      await this.vocabulary.bulkPut(snap.vocabulary)
      await this.wordStates.bulkPut(snap.wordStates)
      await this.events.bulkPut(snap.events)
      await this.mistakes.bulkPut(snap.mistakes)
      await this.reviveDeleted(snap.ids)
    })
  }

  /** Puts deleted reading texts back (undo). */
  async restoreTexts(items: readonly ReadingText[]) {
    const all = ((await this.meta.get('library'))?.value as ReadingText[]) ?? []
    const have = new Set(all.map((t) => t.id))
    await this.meta.put({ key: 'library', value: [...all, ...items.filter((t) => !have.has(t.id))] })
    await this.reviveDeleted(items.map((t) => t.id))
  }

  /** Puts a deleted sentence card back (undo). */
  async restoreSentence(card: SentenceCard) {
    const all = await this.getSentences()
    if (!all.some((s) => s.id === card.id)) await this.meta.put({ key: 'sentences', value: [...all, card] })
    await this.reviveDeleted([card.id])
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
  /** When each settings field was last changed on its device (ISO), so sync can merge field by field. */
  settingsAt?: Record<string, string>
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
  sentences?: SentenceCard[]
  exams?: ExamResult[]
  /** Word lists (backup version 3+, optional). */
  lists?: WordList[]
  /** What was deleted, and when (sync tombstones, see tombstones.ts). */
  deleted?: Tombstone[]
  /** The verb lab's favourites, recent verbs and practice (per language), and the personal bests of the games. */
  lab?: Partial<Record<'fr' | 'es', LabData>>
  records?: Record<string, number>
  /** Badges earned and when. */
  badges?: BadgeLog
  /** Translations kept on the device. */
  translations?: TranslationEntry[]
  earMisses?: EarLog
  /** How the grammar questions went. */
  grammar?: GrammarLog
  /** How the 3-second round went. */
  reflex?: GrammarLog
  /** How the false-friend questions went. */
  traps?: GrammarLog
  /** How the sound pairs went. */
  pairs?: GrammarLog
  /** How the deduction-mode guesses went. */
  deduction?: DeductionLog
  /** Dictionary corrections and look-ups, per language. */
  dictionary?: Partial<Record<TargetLanguage, DictionaryNotes>>
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
    settingsAt: await db.getSettingsAt(),
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
    sentences: await db.getSentences(),
    exams: await db.getExams(),
    lists: await db.getLists(),
    deleted: await db.getDeleted(),
    lab: { fr: await db.getLab('fr'), es: await db.getLab('es') },
    records: await db.getRecords(),
    badges: await db.getBadgeLog(),
    translations: await db.getTranslations(),
    earMisses: await db.getEarLog(),
    grammar: await db.getGrammarLog(),
    reflex: await db.getReflexLog(),
    traps: await db.getTrapLog(),
    pairs: await db.getPairLog(),
    deduction: await db.getDeductionLog(),
    dictionary: { en: await db.getDictionaryNotes('en'), fr: await db.getDictionaryNotes('fr'), es: await db.getDictionaryNotes('es') },
    media: await Promise.all(
      // Cached audio (natural voices "tts:", native recordings "aud:") can be fetched again, so it stays out of backups.
      (withMedia ? await db.media.toArray() : []).filter((m) => !m.id.startsWith('tts:') && !m.id.startsWith('aud:')).map(async (m) => ({
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

/** The backup comes from a newer version of the app than this one. */
export class BackupVersionError extends Error {
  override name = 'BackupVersionError'
}

export function parseBackup(json: string): Backup {
  const data = JSON.parse(json, (key, value) =>
    DATE_KEYS.has(key) && typeof value === 'string' && ISO.test(value) ? new Date(value) : value,
  )
  if (data?.app !== 'kelime-koc' || !Array.isArray(data.vocabulary)) {
    throw new Error('Bu dosya bir Diloloji yedeği değil.')
  }
  if (data.version > BACKUP_VERSION) {
    throw new BackupVersionError('Yedek, uygulamanın daha yeni bir sürümüyle alınmış. Önce uygulamayı güncelle.')
  }
  // A damaged or hand-edited file must fail here, before a restore clears anything.
  for (const key of ['wordStates', 'events', 'mistakes'] as const) {
    if (data[key] === undefined) data[key] = []
    else if (!Array.isArray(data[key])) throw new Error('Yedek dosyası bozuk görünüyor.')
  }
  if (data.vocabulary.some((v: unknown) => !v || typeof (v as { id?: unknown }).id !== 'string')) {
    throw new Error('Yedek dosyası bozuk görünüyor.')
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
    if (backup.settings) await db.saveSettings(backup.settings, { stamp: false })
    if (backup.settingsAt) await db.meta.put({ key: 'settingsAt', value: backup.settingsAt })
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
    if (backup.sentences) await db.meta.put({ key: 'sentences', value: backup.sentences })
    if (backup.exams) await db.meta.put({ key: 'exams', value: backup.exams })
    if (backup.lists) await db.meta.put({ key: 'wordLists', value: backup.lists })
    if (backup.deleted) await db.meta.put({ key: 'deleted', value: backup.deleted })
    for (const [l, lab] of Object.entries(backup.lab ?? {})) if (lab) await db.meta.put({ key: `lab:${l}`, value: lab })
    for (const [l, notes] of Object.entries(backup.dictionary ?? {})) if (notes) await db.meta.put({ key: `dict:${l}`, value: notes })
    if (backup.records) await db.meta.put({ key: 'records', value: backup.records })
    if (backup.badges) await db.meta.put({ key: 'badges', value: backup.badges })
    if (backup.translations) await db.meta.put({ key: 'translations', value: backup.translations })
    if (backup.earMisses) await db.meta.put({ key: 'earMisses', value: backup.earMisses })
    if (backup.grammar) await db.meta.put({ key: 'grammar', value: backup.grammar })
    if (backup.reflex) await db.meta.put({ key: 'reflex', value: backup.reflex })
    if (backup.traps) await db.meta.put({ key: 'traps', value: backup.traps })
    if (backup.pairs) await db.meta.put({ key: 'pairs', value: backup.pairs })
    if (backup.deduction) await db.meta.put({ key: 'deduction', value: backup.deduction })
  })
}
