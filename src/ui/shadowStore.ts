import { addShadowTry, cleanShadowLog, type ShadowLog } from '../engine/shadowScores'

const KEY = 'diloloji:shadow-scores'

/** The shadowing scores on this device (never synced: they come from the learner's own pronunciation key). */
export function loadShadowLog(): ShadowLog {
  try {
    return cleanShadowLog(JSON.parse(localStorage.getItem(KEY) ?? '{}'))
  } catch {
    return {}
  }
}

/** Adds a score and returns the log with it. A blocked store only means no comparison later. */
export function saveShadowScore(key: string, score: number, now = new Date()): ShadowLog {
  const next = addShadowTry(loadShadowLog(), key, score, now)
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // Progress is a convenience.
  }
  return next
}
