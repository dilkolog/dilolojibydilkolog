import { displayForm } from './exercises'
import type { VocabularyEntry } from './types'
import { timeOf } from './types'

/**
 * Lists shared by link: the words a person puts out and the other person takes in. The shape is the
 * server's (api/share.ts); here is the conversion to and from the learner's own words, and the merge
 * a collaborative list needs when two people have changed it.
 */
export interface SharedWord {
  /** The word's id: the same on every device, so an edit or a deletion finds its word. */
  key: string
  word: string
  meaning: string
  example?: string
  exampleTranslation?: string
  notes?: string
  at: string
  deleted?: true
}

/** The words as they go out: what the form shows, none of the progress. */
export function toShared(entries: readonly VocabularyEntry[], input: (e: VocabularyEntry) => { meaning?: string; example?: string; exampleTranslation?: string; notes?: string }): SharedWord[] {
  return entries.map((e) => {
    const f = input(e)
    return {
      key: e.id,
      word: displayForm(e),
      meaning: f.meaning ?? e.senses[0].gloss,
      ...(f.example ? { example: f.example } : {}),
      ...(f.exampleTranslation ? { exampleTranslation: f.exampleTranslation } : {}),
      ...(f.notes ? { notes: f.notes } : {}),
      at: new Date(timeOf(e.editedAt) || timeOf(e.addedAt) || Date.now()).toISOString(),
    }
  })
}

const time = (w: SharedWord) => Date.parse(w.at) || 0

/**
 * Two copies of a collaborative list as one: per word the later write wins, and a deletion is a write
 * (it stays as a mark, so a copy that still has the word does not bring it back).
 */
export function mergeShared(a: readonly SharedWord[], b: readonly SharedWord[]): SharedWord[] {
  const out = new Map<string, SharedWord>()
  for (const w of [...a, ...b]) {
    const cur = out.get(w.key)
    // Equal times: a deletion wins (the safer reading of "same moment"), then the second list.
    if (!cur || time(w) > time(cur) || (time(w) === time(cur) && (w.deleted || !cur.deleted))) out.set(w.key, w)
  }
  return [...out.values()]
}

/** Marks that are old enough are dropped: every copy has long since heard of them. */
export const MARK_DAYS = 90
export const withoutOldMarks = (words: readonly SharedWord[], now = Date.now()) => words.filter((w) => !w.deleted || now - time(w) < MARK_DAYS * 86_400_000)

/** The id in a share link ("…/?set=<32 hex>"), or null. */
export function shareIdOf(href: string): string | null {
  try {
    const id = new URL(href, 'https://x.invalid').searchParams.get('set') ?? ''
    return /^[0-9a-f]{32}$/.test(id) ? id : null
  } catch {
    return null
  }
}

export const shareLink = (origin: string, id: string) => `${origin.replace(/\/$/, '')}/?set=${id}`

/** Whether a stored word and a shared one say the same (so only a real change is written back). */
export const sameWord = (a: SharedWord, b: SharedWord) =>
  a.word === b.word && a.meaning === b.meaning && (a.example ?? '') === (b.example ?? '') && (a.exampleTranslation ?? '') === (b.exampleTranslation ?? '') && (a.notes ?? '') === (b.notes ?? '') && !!a.deleted === !!b.deleted
