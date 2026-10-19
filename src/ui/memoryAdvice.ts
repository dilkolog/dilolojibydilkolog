/** The last fit that kept the defaults (device only: it only keeps the home screen from asking again). */
const KEY = 'diloloji:memory-tried'

export function getTried(): { reviews: number } | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null') as { reviews?: unknown } | null
    return v && typeof v.reviews === 'number' ? { reviews: v.reviews } : null
  } catch {
    return null
  }
}

export function setTried(reviews: number | null): void {
  try {
    if (reviews === null) localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, JSON.stringify({ reviews }))
  } catch {
    // Without storage the nudge may come back sooner; nothing else depends on it.
  }
}
