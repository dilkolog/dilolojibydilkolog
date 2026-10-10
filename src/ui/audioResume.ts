/**
 * Where a long recording was left, per text and per device (localStorage): opening an audiobook
 * chapter or a podcast again goes on from there. Near the start or the end it counts as not begun.
 */
const PREFIX = 'diloloji:audio-pos:'
/** Less than this into the audio is no place worth going back to. */
const MIN_SECONDS = 8
/** Within this of the end the recording counts as heard. */
const END_SECONDS = 12
/** A little before the spot, to catch the sentence's start. */
const BACK_SECONDS = 2

/** Where to start, or null for the beginning. */
export function resumeAt(saved: number | null, duration: number): number | null {
  if (saved === null || !Number.isFinite(saved) || saved < MIN_SECONDS) return null
  if (Number.isFinite(duration) && duration > 0 && saved > duration - END_SECONDS) return null
  return Math.max(0, saved - BACK_SECONDS)
}

export function savedPosition(key: string): number | null {
  try {
    const v = Number(localStorage.getItem(PREFIX + key))
    return v > 0 ? v : null
  } catch {
    return null
  }
}

export function savePosition(key: string, seconds: number) {
  try {
    if (seconds >= MIN_SECONDS) localStorage.setItem(PREFIX + key, String(Math.floor(seconds)))
  } catch {
    // Private mode or full: the next visit starts from the top.
  }
}

export function forgetPosition(key: string) {
  try {
    localStorage.removeItem(PREFIX + key)
  } catch {
    // Nothing to do.
  }
}

/** m:ss for the "continuing from" note. */
export const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
