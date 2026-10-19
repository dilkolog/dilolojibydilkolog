import { db } from './instance'

/** The IndexedDB name is an internal id that never changed (renaming it would orphan every device's data). */
const DATABASE = 'kelime-koc'
const KEY_PREFIXES = ['diloloji:', 'kelime-koc:']

/**
 * Clears everything this device holds for the app (words, answers, texts, settings, device-only choices), for
 * a shared device whose next user must not meet the last one's data. The caller makes sure the account has it
 * all (a sync) and has signed out; the page is reloaded afterwards.
 */
export async function wipeDevice(): Promise<void> {
  db.close()
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(DATABASE)
    // Blocked: another tab still holds the database; it closes when that tab reloads. Waiting would hang.
    request.onsuccess = request.onerror = request.onblocked = () => resolve()
  })
  try {
    for (const key of Object.keys(localStorage)) if (KEY_PREFIXES.some((p) => key.startsWith(p))) localStorage.removeItem(key)
    sessionStorage.clear()
  } catch {
    // Storage unavailable: nothing to clear.
  }
}
