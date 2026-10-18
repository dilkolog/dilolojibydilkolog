import type { GuideLevel } from '../data/guide/lessonTypes'
import type { TargetLanguage } from '../engine/types'

/** The last placement result of a language, kept on this device. */
export interface StoredPlacement {
  start: GuideLevel
  day: string
}

const key = (language: TargetLanguage) => `diloloji:guide-placement:${language}`
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1']

export function loadPlacement(language: TargetLanguage): StoredPlacement | null {
  try {
    const raw = JSON.parse(localStorage.getItem(key(language)) ?? 'null') as Partial<StoredPlacement> | null
    return raw && LEVELS.includes(raw.start ?? '') && typeof raw.day === 'string' ? { start: raw.start as GuideLevel, day: raw.day } : null
  } catch {
    return null
  }
}

export function savePlacement(language: TargetLanguage, placement: StoredPlacement) {
  try {
    localStorage.setItem(key(language), JSON.stringify(placement))
  } catch {
    // The result is shown anyway; only the reminder of it is lost.
  }
}
