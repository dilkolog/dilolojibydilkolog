/**
 * Which level the learner has already seen/celebrated, kept on this device.
 */
const KEY = 'kelime-koc:level-seen'

export function seenLevel(): number | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw === null) return null
    const n = parseInt(raw, 10)
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

export function markLevelSeen(level: number): void {
  try {
    localStorage.setItem(KEY, String(level))
  } catch {
    // Storage might be disabled or full
  }
}
