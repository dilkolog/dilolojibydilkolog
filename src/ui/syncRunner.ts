import { db } from '../data/instance'
import { ACCOUNT_EVENT, forgetAccess } from '../data/access'
import { showToast } from './toastFeed'
import { restoreReplaced, syncNow, type Account, type Credential, type SyncResult } from '../data/sync'

/** Shown when the server's SYNC_ALLOWED list doesn't include this account or code. */
export const NOT_ALLOWED = 'Bu hesap ya da kod sunucunun izin listesinde yok; eşitleme kapalı.'

/** Shown when the account waits for (or was refused) the owner's approval. */
export const PENDING_APPROVAL = 'Hesabın, site sahibinin onayını bekliyor; onaylanınca eşitleme açılır. Kelime ekleme ve çalışma bu cihazda şimdiden çalışır.'

/** Shown when another device saved its data with a newer version of the app. */
export const NEWER_VERSION = 'Başka bir cihazın uygulaması daha yeni; eşitlemek için bu cihazda uygulamayı güncelle (sayfayı yenile).'

/** Shown when two devices keep saving at the same moment and the sync lost the race three times in a row. */
export const CONFLICT = 'İki cihaz aynı anda kaydetti ve eşitleme üst üste üç kez çakıştı. Verilerin güvende; biraz bekleyip tekrar dene (diğer cihazda eşitleme bitince düzelir).'

/** Shown when the synced data outgrew the server's limit for one file. */
export const TOO_LARGE = 'Eşitlenecek veri sunucunun sınırını aştı. Kullanmadığın okuma metinlerini ya da eski çeviri belleğini azaltıp tekrar dene (Ayarlar → Cihazlar arası eşitleme boyutu gösterir).'

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
  else {
    await db.meta.bulkDelete(['syncAccount', 'syncAt'])
    await forgetAccess()
  }
  // The approval status belongs to the account: the app reads it again.
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(ACCOUNT_EVENT))
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

/** "Diğer cihazlarından: 3 yeni kelime, 1 silinen kelime", or '' when nothing came in. */
export function describeIncoming(r: SyncResult | null): string {
  if (!r) return ''
  const { words, removed, texts, settings } = r.incoming
  const edited = r.replaced?.length ?? 0
  const parts = [words && `${words} yeni kelime`, edited && `${edited} kelime güncellendi`, removed && `${removed} silinen kelime`, texts && `${texts} yeni metin`, settings && `${settings} ayar değişikliği`].filter(Boolean)
  return parts.length ? `Diğer cihazlarından: ${parts.join(', ')}.` : ''
}

/** After a background sync: says what the other devices changed here, if anything. */
export function announceIncoming(r: SyncResult | null): void {
  const line = describeIncoming(r)
  if (!line) return
  const replaced = r?.replaced ?? []
  if (!replaced.length) return showToast(line)
  // Another device's later edit replaced this device's copy of a word: it says which, and can be taken back.
  const names = replaced.slice(0, 3).join(', ') + (replaced.length > 3 ? '…' : '')
  showToast(`${line} Güncellenenler: ${names}.`, { label: 'Geri al', run: () => void restoreReplaced(db).then((n) => n && showToast(`${n} kelime eski hâline döndü.`)) }, 10_000, 'undo')
}
