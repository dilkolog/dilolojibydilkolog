import { addShadowTry, cleanShadowLog, type ShadowLog, type ShadowTry } from '../engine/shadowScores'

const KEY = 'diloloji:pitch-scores'

/** Each word's melody scores (the pitch comparison on the word page): kept with the device's other choices, they follow the account. */
export function loadPitchLog(): ShadowLog {
  try {
    return cleanShadowLog(JSON.parse(localStorage.getItem(KEY) ?? '{}'))
  } catch {
    return {}
  }
}

/** Adds a score and returns that word's tries. A blocked store only means no line later. */
export function savePitchScore(key: string, score: number, now = new Date()): ShadowTry[] {
  const next = addShadowTry(loadPitchLog(), key, score, now)
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Progress is a convenience.
  }
  return next[key] ?? []
}
