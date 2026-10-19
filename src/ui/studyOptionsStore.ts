import { useState } from 'react'
import { DEFAULT_STUDY, type StudyOptions } from '../engine/studySet'

const KEY = 'diloloji:study-options'
/** The last choices of this device, kept per use ("flashcards", "test") so each remembers its own. */
function load(use: string): StudyOptions {
  try {
    const raw = JSON.parse(localStorage.getItem(`${KEY}:${use}`) ?? 'null') as Partial<StudyOptions> | null
    return { ...DEFAULT_STUDY, ...raw }
  } catch {
    return DEFAULT_STUDY
  }
}

/** The study choices of one use, kept on this device. */
export function useStudyOptions(use: string, defaults: Partial<StudyOptions> = {}): [StudyOptions, (o: StudyOptions) => void] {
  const [options, set] = useState<StudyOptions>(() => ({ ...DEFAULT_STUDY, ...defaults, ...load(use) }))
  const save = (o: StudyOptions) => {
    set(o)
    try {
      localStorage.setItem(`${KEY}:${use}`, JSON.stringify(o))
    } catch {
      /* kept for this visit only */
    }
  }
  return [options, save]
}

/** Sets a use's next round to one list (from that list's page), keeping its other choices. */
export function presetList(use: string, listId: string) {
  presetScope(use, 'list', listId)
}

/** Sets a use's next round scope (e.g. 'all', 'hard', 'weak', 'list'), keeping other choices. */
export function presetScope(use: string, scope: StudyOptions['scope'], listId?: string) {
  try {
    const stored = JSON.parse(localStorage.getItem(`${KEY}:${use}`) ?? 'null') as Partial<StudyOptions> | null
    localStorage.setItem(`${KEY}:${use}`, JSON.stringify({ ...stored, scope, listId }))
  } catch {
    /* the round opens on its last choices */
  }
}

