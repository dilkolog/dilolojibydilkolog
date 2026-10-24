import { localDate } from '../../engine/progress'

const KEY = 'diloloji:monki-count'

/** The day's Monki questions on this device: `{ day, n }`. */
function read(now: Date): { day: string; n: number } {
  const day = localDate(now)
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null')
    if (raw && raw.day === day && Number.isInteger(raw.n) && raw.n >= 0) return { day, n: raw.n }
  } catch {
    // Unreadable: counted from zero.
  }
  return { day, n: 0 }
}

export const askedToday = (now = new Date()): number => read(now).n

/** One more question today (counted when it is sent, answered or not: the request is what costs). */
export function countAsk(now = new Date()) {
  const { day, n } = read(now)
  try {
    localStorage.setItem(KEY, JSON.stringify({ day, n: n + 1 }))
  } catch {
    // Private mode: the limit is then only as good as this session.
  }
}

/** The limit is reached: 0 means none. */
export const overLimit = (limit: number, now = new Date()): boolean => limit > 0 && askedToday(now) >= limit
