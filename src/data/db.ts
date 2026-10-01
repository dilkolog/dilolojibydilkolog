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

export interface Settings {
  activeLanguage: TargetLanguage
  levels: Partial<Record<TargetLanguage, CefrLevel>>
  dailyMinutes: number
  newWordsPerDay: number
}

export const DEFAULT_SETTINGS: Settings = {
  activeLanguage: 'en',
  levels: {},
  dailyMinutes: 12,
  newWordsPerDay: 5,
}

interface MetaRow {
  key: string
  value: unknown
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

  constructor(name = 'kelime-koc') {
    super(name)
    this.version(1).stores({
      vocabulary: 'id, language, source',
      wordStates: 'entryId, language',
      events: 'id, entryId, language, timestamp',
      mistakes: 'id, entryId',
      meta: 'key',
    })
  }

  async getSettings(): Promise<Settings | undefined> {
    const row = await this.meta.get('settings')
    return row ? { ...DEFAULT_SETTINGS, ...(row.value as Partial<Settings>) } : undefined
  }

  saveSettings(settings: Settings) {
    return this.meta.put({ key: 'settings', value: settings })
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

  /** Deleting a word also deletes what was learned about it. */
  deleteWord(id: string) {
    return this.transaction('rw', [this.vocabulary, this.wordStates, this.events, this.mistakes], async () => {
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

export const BACKUP_VERSION = 1

export interface Backup {
  app: 'kelime-koc'
  version: number
  exportedAt: string
  settings?: Settings
  vocabulary: VocabularyEntry[]
  wordStates: UserWordState[]
  events: ReviewEvent[]
  mistakes: Mistake[]
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
  }
  return JSON.stringify(backup)
}

const DATE_KEYS = new Set(['due', 'last_review', 'introducedAt', 'lastReviewAt', 'timestamp', 'firstAt', 'lastAt', 'addedAt'])
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
  await db.transaction('rw', [db.vocabulary, db.wordStates, db.events, db.mistakes, db.meta], async () => {
    await Promise.all([db.vocabulary.clear(), db.wordStates.clear(), db.events.clear(), db.mistakes.clear()])
    await db.vocabulary.bulkPut(backup.vocabulary)
    await db.wordStates.bulkPut(backup.wordStates)
    await db.events.bulkPut(backup.events)
    await db.mistakes.bulkPut(backup.mistakes)
    if (backup.settings) await db.saveSettings(backup.settings)
  })
}
