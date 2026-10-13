/**
 * Who may use sync storage. SYNC_ALLOWED (environment variable) lists usernames and/or storage
 * ids (64 hex, for sync codes), separated by commas or spaces. Unset or empty: anyone may, as
 * before. Set: every other id is refused, so strangers can neither claim names nor fill the store.
 *
 * The server never sees usernames, only ids, so a listed username is turned into its id the
 * same way the app does (src/data/sync.ts: normalizeUsername, deriveAccount).
 */
const HEX_ID = /^[0-9a-f]{64}$/

/** Same as the app's normalizeUsername: ALI, Ali, alı, ALİ → ali. */
const normalizeUsername = (u: string) => u.trim().normalize('NFC').replace(/[İIı]/g, 'i').toLowerCase()

async function sha256(s: string): Promise<string> {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** The storage id a username has (the same as the app's), for the owner to find an account by name. */
export const idOfUsername = (username: string) => sha256(`kelime-koc-account:${normalizeUsername(username)}`)

/** The storage id of each SYNC_ALLOWED entry, or null when the list is not set. */
export async function allowedIds(raw = process.env.SYNC_ALLOWED): Promise<Set<string> | null> {
  const entries = (raw ?? '').split(/[\s,]+/).filter(Boolean)
  if (!entries.length) return null
  const ids = await Promise.all(entries.map((e) => (HEX_ID.test(e.toLowerCase()) ? e.toLowerCase() : idOfUsername(e))))
  return new Set(ids)
}

export async function isAllowed(id: string): Promise<boolean> {
  const ids = await allowedIds()
  return !ids || ids.has(id)
}
