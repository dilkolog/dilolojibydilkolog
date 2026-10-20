import { db } from '../data/instance'
import { ACCOUNT_EVENT, forgetAccess } from '../data/access'
import { showToast } from './toastFeed'
import { notify } from './noticeCenter'
import { syncNotice } from './noticeTexts'
import { reportError } from '../data/errorReport'
import { hasStoredSession, supabaseConfigured } from '../data/supabase'
import type { Account, Credential, SyncResult } from '../data/sync'

/** The sync code (encryption, merging) is loaded when a sync runs, not with the first screen. */
const syncCode = () => import('../data/sync')

/** Shown when the server's SYNC_ALLOWED list doesn't include this account or code. */
export const NOT_ALLOWED = 'Bu hesap ya da kod sunucunun izin listesinde yok; eşitleme kapalı.'

/** Shown when the account waits for (or was refused) the owner's approval. */
export const PENDING_APPROVAL = 'Hesabın, site sahibinin onayını bekliyor; onaylanınca eşitleme açılır. Kelime ekleme ve çalışma bu cihazda şimdiden çalışır.'

/** Shown on a device still signed in the old way after the account's data moved to the new sign-in. */
export const MOVED = 'Hesabın yeni giriş sistemine taşındı. Bu cihazda bir kez çıkış yapıp e-postan ya da Google ile giriş yap; ilerlemen gelir.'

/** Shown when another device saved its data with a newer version of the app. */
export const NEWER_VERSION = 'Başka bir cihazın uygulaması daha yeni; eşitlemek için bu cihazda uygulamayı güncelle (sayfayı yenile).'

/** Shown when two devices keep saving at the same moment and the sync lost the race three times in a row. */
export const CONFLICT = 'İki cihaz aynı anda kaydetti ve eşitleme üst üste üç kez çakıştı. Verilerin güvende; biraz bekleyip tekrar dene (diğer cihazda eşitleme bitince düzelir).'

/** Shown when the synced data outgrew the server's limit for one file. */
export const TOO_LARGE = 'Eşitlenecek veri sunucunun sınırını aştı. Kullanmadığın okuma metinlerini ya da eski çeviri belleğini azaltıp tekrar dene (Ayarlar → Cihazlar arası eşitleme boyutu gösterir).'

/** One sync at a time; listeners hear when data may have changed. */
/** What one sync came to: its result, or that it failed (and why, for a caller that asks for errors). */
type Outcome = { result: SyncResult | null; failed: boolean; error?: unknown }
let running: Promise<Outcome> | null = null
let movedSaid = false
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
    await db.meta.bulkDelete(['syncAccount', 'syncAt', 'syncStore'])
    await forgetAccess()
  }
  // The approval status belongs to the account: the app reads it again.
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(ACCOUNT_EVENT))
}

/** The account if signed in, otherwise the sync code, if any. */
export async function getCredential(): Promise<Credential | null> {
  return (await getAccount()) ?? (await getSyncCode())
}

/**
 * The old username-and-password accounts are gone once sign-in moved to Supabase: a device still signed in
 * that way is signed out (its words and progress stay) and asked, once, to sign in again. True when it was.
 */
async function signOutOldAccount(): Promise<boolean> {
  if (!supabaseConfigured() || hasStoredSession()) return false
  await setAccount(null)
  showToast('Giriş sistemi yenilendi: Ayarlar → Hesap\'tan e-postanla ya da Google ile yeniden gir. Kelimelerin ve ilerlemen bu cihazda duruyor.', undefined, 12_000, 'info')
  return true
}

/** Failures that are the way things are (offline, waiting for approval, moved, not on the list): not bugs. */
const EXPECTED = new Set(['SyncMovedError', 'SyncApprovalError', 'SyncNotAllowedError', 'AbortError'])

/**
 * Whether a background sync's failure should reach the logs: a real error, not the network being away
 * (a fetch that failed while offline, or that never got an answer) nor a state the app already explains.
 */
export function worthReporting(e: unknown, online: boolean): boolean {
  if (!online || !(e instanceof Error)) return false
  if (EXPECTED.has(e.name)) return false
  // A request that never got an answer: a flaky network, not the app.
  if (e.name === 'TypeError' && /fetch|network|load failed/i.test(e.message)) return false
  return true
}

/** Whether a sync is running (live sync ignores the writes a sync makes itself). */
export const isSyncing = () => running !== null

/**
 * Syncs if signed in (or a code is set); failures (offline etc.) are silent unless `throwErrors`.
 * `quiet`: the screens are told only if the merge changed something here (a background pull that found nothing new leaves them be).
 * One sync runs at a time and whoever asks meanwhile shares it, with its failure too: a caller that wants errors
 * (signing out, which empties the device) must not take a background sync's silent failure for a success.
 */
export async function runSync(throwErrors = false, quiet = false): Promise<SyncResult | null> {
  running ??= (async (): Promise<Outcome> => {
    try {
      const cred = await getCredential()
      if (!cred) return { result: null, failed: false }
      if (typeof cred !== 'string' && (await signOutOldAccount())) return { result: null, failed: false }
      const target = await (await import('./syncTarget')).syncTarget(cred)
      const result = await (await syncCode()).syncNow(db, target)
      if (!quiet || result.changed !== false) for (const fn of listeners) fn()
      return { result, failed: false }
    } catch (e) {
      // Silent in the background, so a real failure would otherwise never be seen: it goes to the logs ([client-error] … where=sync).
      if (worthReporting(e, typeof navigator === 'undefined' || navigator.onLine !== false)) reportError(e, 'sync')
      // Said once a visit: syncing here stopped because the data moved to the new sign-in.
      if (e instanceof Error && e.name === 'SyncMovedError' && !movedSaid && !throwErrors) {
        movedSaid = true
        showToast(MOVED, undefined, 10_000, 'info')
      }
      return { result: null, failed: true, error: e }
    } finally {
      running = null
    }
  })()
  const outcome = await running
  if (outcome.failed && throwErrors) throw outcome.error
  return outcome.result
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
  void notify(syncNotice(line))
  const replaced = r?.replaced ?? []
  if (!replaced.length) return showToast(line)
  // Another device's later edit replaced this device's copy of a word: it says which, and can be taken back.
  const names = replaced.slice(0, 3).join(', ') + (replaced.length > 3 ? '…' : '')
  showToast(`${line} Güncellenenler: ${names}.`, { label: 'Geri al', run: () => void syncCode().then((m) => m.restoreReplaced(db)).then((n) => n && showToast(`${n} kelime eski hâline döndü.`)) }, 10_000, 'undo')
}
