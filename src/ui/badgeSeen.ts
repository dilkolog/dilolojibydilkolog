/**
 * Which badges the learner has already been shown a moment for, kept on this device. A badge that
 * is earned but not in this list is new: it gets its moment once, wherever the learner is.
 */
const KEY = 'kelime-koc:badges-seen'

export function seenBadges(): Set<string> | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw === null) return null
    const list = JSON.parse(raw)
    return new Set(Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : [])
  } catch {
    return null
  }
}

export function markBadgesSeen(ids: readonly string[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify([...new Set([...(seenBadges() ?? []), ...ids])]))
  } catch {
    // A moment may repeat once; nothing worse.
  }
}

/**
 * The earned badges not yet celebrated. The first time this runs on a device nothing counts as
 * new (everything earned so far is taken as seen), so an existing learner is not met by a pile.
 */
export function newBadgeIds(earned: readonly string[]): string[] {
  const seen = seenBadges()
  if (seen === null) {
    markBadgesSeen(earned)
    return []
  }
  return earned.filter((id) => !seen.has(id))
}
