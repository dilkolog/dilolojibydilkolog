/** A screen's code failed to download: offline before it was cached, or replaced by a new version. */
export function isChunkError(error: unknown): boolean {
  const text = error instanceof Error ? `${error.name} ${error.message}` : String(error)
  // Safari, after a deploy: the old file is gone and the site answers with its page ("'text/html' is not a valid
  // JavaScript MIME type"); Chrome and Firefox say they could not fetch or import the module.
  return /dynamically imported module|Importing a module script failed|Failed to fetch|ChunkLoadError|Loading chunk|not a valid JavaScript MIME type|Unable to preload CSS/i.test(text)
}

const RELOAD_KEY = 'diloloji:chunk-reload'
/** One automatic reload in this long: a new version is picked up, a file that is really broken does not loop. */
const RELOAD_GAP_MS = 60_000

/**
 * After a deploy, an open page asks for files of the version it was built with, and they are gone: the page is
 * reloaded once to pick up the new version (the learner's data is on the device and in the account). False when
 * offline or when this was tried a moment ago: then the screen says what happened instead.
 */
export function reloadForNewVersion(now = Date.now()): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return false
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY))
    if (last && now - last < RELOAD_GAP_MS) return false
    sessionStorage.setItem(RELOAD_KEY, String(now))
  } catch {
    // Without session storage there is no guard against a loop: leave the reload to the learner.
    return false
  }
  location.reload()
  return true
}
