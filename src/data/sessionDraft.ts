import type { KelimeDB } from './db'
import { isFinished, type Session } from '../engine/session'
import { EXERCISES } from '../engine/exercises'
import { TARGET_LANGUAGES, type TargetLanguage } from '../engine/types'

export interface SessionDraft {
  version: 1
  language: TargetLanguage
  seed: number
  savedAt: string
  session: Session
}
export const draftKey = (language: TargetLanguage) => `study-session:${language}`

export function draftRecord(language: TargetLanguage, seed: number, session: Session) {
  return { key: draftKey(language), value: isFinished(session) ? undefined : { version: 1, language, seed, savedAt: new Date().toISOString(), session } as SessionDraft }
}

export async function readSessionDraft(db: KelimeDB, language: TargetLanguage): Promise<SessionDraft | null> {
  const value = (await db.meta.get(draftKey(language)))?.value as SessionDraft | undefined
  if (!value || value.version !== 1 || value.language !== language || !TARGET_LANGUAGES.includes(language) || !Number.isFinite(value.seed)) return null
  const s = value.session
  if (!s || !Array.isArray(s.items) || !Array.isArray(s.log) || !Number.isInteger(s.index) || s.index < 0 || s.index >= s.items.length || !s.retries || !s.relearn) return null
  if (!s.items.every((it) => it && typeof it.entryId === 'string' && (it.kind === 'introduce' || (it.kind === 'exercise' && it.exerciseType && EXERCISES[it.exerciseType])))) return null
  return value
}

export async function writeSessionDraft(db: KelimeDB, record: ReturnType<typeof draftRecord>) {
  if (record.value) await db.meta.put(record)
  else await db.meta.delete(record.key)
}
