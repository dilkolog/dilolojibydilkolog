const DISMISS_KEY = 'diloloji:fill-missing-dismissed'
export const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000

export function isFillMissingDismissed(count: number, now = Date.now()): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY)
    if (!raw) return false
    const parsed = JSON.parse(raw) as { at: number; count?: number }
    if (!parsed || typeof parsed.at !== 'number') return false
    if (now - parsed.at >= SNOOZE_MS) return false
    if (typeof parsed.count === 'number' && count > parsed.count) return false
    return true
  } catch {
    return false
  }
}

export function dismissFillMissing(count: number, now = Date.now()): void {
  try {
    localStorage.setItem(DISMISS_KEY, JSON.stringify({ at: now, count }))
  } catch {
    // Private mode
  }
}
