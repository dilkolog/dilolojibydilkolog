import { db } from '../data/instance'
import { syncNow, type Account, type Credential, type SyncResult } from '../data/sync'

/** Shown when the server's SYNC_ALLOWED list doesn't include this account or code. */
export const NOT_ALLOWED = 'Bu hesap ya da kod sunucunun izin listesinde yok; eşitleme kapalı.'

/** Shown when another device saved its data with a newer version of the app. */
export const NEWER_VERSION = 'Başka bir cihazın uygulaması daha yeni; eşitlemek için bu cihazda uygulamayı güncelle (sayfayı yenile).'

/** One sync at a time; listeners hear when data may have changed. */
let running: Promise<SyncResult | null> | null = null
const listeners = new Set<() => void>()

export const onSynced = (fn: () => void) => {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}

export async function getSyncCode(): Promise<string | null> {
  return ((await db.meta.get('syncCode'))?.value as string | undefined) ?? null
}

export async function setSyncCode(code: string | null) {
  if (code) await db.meta.put({ key: 'syncCode', value: code })
  else await db.meta.bulkDelete(['syncCode', 'syncAt'])
}

/** The signed-in account (derived keys only; the password isn't kept). */
export async function getAccount(): Promise<Account | null> {
  return ((await db.meta.get('syncAccount'))?.value as Account | undefined) ?? null
}

export async function setAccount(account: Account | null) {
  if (account) await db.meta.put({ key: 'syncAccount', value: account })
  else await db.meta.bulkDelete(['syncAccount', 'syncAt'])
}

/** The account if signed in, otherwise the sync code, if any. */
export async function getCredential(): Promise<Credential | null> {
  return (await getAccount()) ?? (await getSyncCode())
}

/** Syncs if signed in (or a code is set); failures (offline etc.) are silent unless `throwErrors`. */
export function runSync(throwErrors = false): Promise<SyncResult | null> {
  if (running) return running
  running = (async () => {
    try {
      const cred = await getCredential()
      if (!cred) return null
      const result = await syncNow(db, cred)
      for (const fn of listeners) fn()
      return result
    } catch (e) {
      if (throwErrors) throw e
      return null
    } finally {
      running = null
    }
  })()
  return running
}
