import { localDate } from '../../engine/progress'

const KEY = 'diloloji:monki-daily'

/** Today's talk has been had (or its summary seen): the Today card steps aside until tomorrow. */
export function dailyTalkDone(now = new Date()): boolean {
  try {
    return localStorage.getItem(KEY) === localDate(now)
  } catch {
    return false
  }
}

export function markDailyTalkDone(now = new Date()) {
  try {
    localStorage.setItem(KEY, localDate(now))
  } catch {
    // Private mode: the card shows again on the next visit.
  }
}
