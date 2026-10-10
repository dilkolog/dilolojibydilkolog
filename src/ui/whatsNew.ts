/** Bumped when something worth telling the learner about arrives; the card shows once per version. */
export const WHATS_NEW_VERSION = '2026-10-10'

const KEY = 'diloloji:whats-new'

/** A device that has hardly begun has no use for a tour of what changed: wait until some words are in. */
export const WHATS_NEW_MIN_WORDS = 10

export const whatsNewSeen = (): string | null => {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export const markWhatsNewSeen = (version = WHATS_NEW_VERSION) => {
  try {
    localStorage.setItem(KEY, version)
  } catch {
    // Private mode: it may show again; harmless.
  }
}

export const whatsNewDue = (seen: string | null, words: number, version = WHATS_NEW_VERSION) => seen !== version && words >= WHATS_NEW_MIN_WORDS
