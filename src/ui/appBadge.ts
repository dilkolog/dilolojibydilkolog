/** Badging API: not in every browser (Chrome/Edge installed apps, Safari 17+ home-screen apps). */
export const badgeSupported = () => typeof navigator !== 'undefined' && 'setAppBadge' in navigator

/**
 * The number of reviews waiting, on the app icon, like a mail count: seen without opening the app.
 * Cleared when nothing is due or the learner turned it off. The push reminder (push-sw.js) sets it too.
 */
export function updateAppBadge(due: number, enabled: boolean) {
  if (!badgeSupported()) return
  const p = enabled && due > 0 ? navigator.setAppBadge(Math.min(due, 99)) : navigator.clearAppBadge()
  p.catch(() => {
    // Not allowed here (e.g. not installed): no badge, nothing else changes.
  })
}
