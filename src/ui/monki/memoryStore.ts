import type { TargetLanguage } from '../../engine/types'
import { cleanNotes, type MemoryNote } from '../../engine/monkiMemory'

const notesKey = (language: TargetLanguage) => `diloloji:monki-memory:${language}`
const OFF_KEY = 'diloloji:monki-memory-off'

/** Monki's notes about the learner in one language (on this device; they travel with the account like the other preferences). */
export function loadMemory(language: TargetLanguage): MemoryNote[] {
  try {
    return cleanNotes(JSON.parse(localStorage.getItem(notesKey(language)) ?? '[]'))
  } catch {
    return []
  }
}

export function saveMemory(language: TargetLanguage, notes: readonly MemoryNote[]) {
  try {
    if (notes.length) localStorage.setItem(notesKey(language), JSON.stringify(notes))
    else localStorage.removeItem(notesKey(language))
  } catch {
    // Storage full or blocked: the notes just do not survive a reload.
  }
}

/** Remembering is on unless the learner switched it off. */
export function memoryOn(): boolean {
  try {
    return localStorage.getItem(OFF_KEY) !== '1'
  } catch {
    return true
  }
}

export function setMemoryOn(on: boolean) {
  try {
    if (on) localStorage.removeItem(OFF_KEY)
    else localStorage.setItem(OFF_KEY, '1')
  } catch {
    // Not remembered; fine.
  }
}
