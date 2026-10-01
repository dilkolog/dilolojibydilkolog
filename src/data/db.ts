import Dexie, { type Table } from 'dexie'
import type { ReviewResult } from '../engine/review'
import type {
  CefrLevel,
  Mistake,
  ReviewEvent,
  TargetLanguage,
  UserWordState,
  VocabularyEntry,
} from '../engine/types'

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
  reminder: { enabled: boolean; time: string }
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
  reminder: { enabled: false, time: '20:00' },
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
  blob: Blob
  createdAt: Date
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
    await this.media.add({ id, kind, blob, createdAt: new Date() })
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

  /** Deleting a word also deletes what was learned about it, and its picture/recording. */
  deleteWord(id: string) {
    return this.transaction('rw', [this.vocabulary, this.wordStates, this.events, this.mistakes, this.media], async () => {
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
export const BACKUP_VERSION = 2

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

export async function exportBackup(db: KelimeDB, now = new Date()): Promise<string> {
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
    media: await Promise.all(
      (await db.media.toArray()).map(async (m) => ({
        id: m.id,
        kind: m.kind,
        dataUrl: await blobToDataUrl(m.blob),
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
export async function restoreBackup(db: KelimeDB, backup: Backup) {
  // Decode media before the transaction: IndexedDB transactions close on unrelated awaits.
  const media = await Promise.all(
    (backup.media ?? []).map(async (m) => ({ id: m.id, kind: m.kind, blob: await dataUrlToBlob(m.dataUrl), createdAt: new Date(m.createdAt) })),
  )
  await db.transaction('rw', [db.vocabulary, db.wordStates, db.events, db.mistakes, db.meta, db.media, db.stories], async () => {
    await Promise.all([db.vocabulary.clear(), db.wordStates.clear(), db.events.clear(), db.mistakes.clear(), db.media.clear(), db.stories.clear()])
    await db.media.bulkPut(media)
    await db.stories.bulkPut(backup.stories ?? [])
    await db.vocabulary.bulkPut(backup.vocabulary)
    await db.wordStates.bulkPut(backup.wordStates)
    await db.events.bulkPut(backup.events)
    await db.mistakes.bulkPut(backup.mistakes)
    if (backup.settings) await db.saveSettings(backup.settings)
  })
}
