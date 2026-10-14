import type { KelimeDB } from '../data/db'
import type { TargetLanguage, VocabularyEntry, WordList } from '../engine/types'
import { parsePlacement, placementOptions } from './listOptions'

/** The list (or "list|level") new words of a language went to last, on this device. */
const LAST_LIST_KEY = 'kelime-koc:last-list'

export function lastPlacement(language: TargetLanguage): string {
  try {
    return localStorage.getItem(`${LAST_LIST_KEY}:${language}`) ?? ''
  } catch {
    return ''
  }
}

/** Remembers where new words go: chosen in a form, or the list whose page was opened. */
export function rememberPlacement(language: TargetLanguage, value: string) {
  try {
    localStorage.setItem(`${LAST_LIST_KEY}:${language}`, value || '__none')
  } catch {
    // Not remembered; harmless.
  }
}

/**
 * Where a new word goes unless the learner picks another place: the list last added to or opened,
 * else the one in focus, else no list. Lists deleted since are passed over.
 */
export function defaultPlacement(language: TargetLanguage, lists: readonly WordList[], focusListId?: string): string {
  const valid = new Set(placementOptions(lists).map((o) => o.value))
  return [lastPlacement(language), focusListId ?? ''].find((v) => valid.has(v)) ?? '__none'
}

/**
 * Puts words added without the word form (one tap, a suggestion) where the form would put them:
 * the list last used or opened, else the one in focus. Gives them back placed, with the list's
 * name to say where they went (none when they stay in no list).
 */
export async function placeNew(db: KelimeDB, language: TargetLanguage, entries: VocabularyEntry[]): Promise<{ entries: VocabularyEntry[]; listName?: string }> {
  const [lists, settings] = await Promise.all([db.getLists(language), db.getSettings()])
  const { listId, levelId } = parsePlacement(defaultPlacement(language, lists, settings?.focusList?.[language]))
  const list = lists.find((l) => l.id === listId)
  if (!list) return { entries }
  return { entries: entries.map((e) => ({ ...e, listId: list.id, ...(levelId ? { levelId } : {}) })), listName: list.name }
}

/** Words that grow out of another (its family, its derivations) go to that word's list and level; else where new words go. */
export async function sameList(db: KelimeDB, from: VocabularyEntry, entries: VocabularyEntry[]): Promise<VocabularyEntry[]> {
  if (!from.listId) return (await placeNew(db, from.language, entries)).entries
  return entries.map((e) => ({ ...e, listId: from.listId, ...(from.levelId ? { levelId: from.levelId } : {}) }))
}
