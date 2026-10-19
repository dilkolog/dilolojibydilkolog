import { DEFAULT_SETTINGS } from '../data/db'
import { db } from '../data/instance'
import type { Session } from '@supabase/supabase-js'
import { SyncApprovalError, type Account } from '../data/sync'
import { fetchVault, freshAccount, linkVault, VaultError } from '../data/vault'
import { whileSigningIn } from './signInGate'
import { getSyncCode, runSync, setAccount, setSyncCode } from './syncRunner'

/** The name a person goes by: the one chosen at sign-up, Google's, or the email's first part. */
export function nameOf(session: Session): string {
  const meta = (session.user.user_metadata ?? {}) as Record<string, unknown>
  const named = [meta.username, meta.full_name, meta.name].find((v): v is string => typeof v === 'string' && !!v.trim())
  return (named ?? session.user.email?.split('@')[0] ?? 'kullanıcı').trim().slice(0, 32)
}

export type SignInOutcome = { kind: 'done'; waiting: boolean; fresh: boolean }

/** Uses the account on this device, merges with what it holds on the server, and says whether approval is pending. */
async function takeAccount(account: Account, fresh: boolean): Promise<SignInOutcome> {
  await setAccount(account)
  if (await getSyncCode()) await setSyncCode(null)
  let waiting = false
  try {
    await runSync(true)
  } catch (e) {
    if (!(e instanceof SyncApprovalError)) throw e
    waiting = true
  }
  return { kind: 'done', waiting, fresh }
}

/**
 * After a Supabase sign-in: the person's sync account from the server, or, the first time, a new one.
 * Whatever this device holds (words, progress) merges into it on the first sync, so nothing studied here
 * is left behind; accounts from the old username sign-in are not carried over.
 */
export const completeSignIn = (session: Session): Promise<SignInOutcome> => whileSigningIn(() => completeSignInNow(session))

async function completeSignInNow(session: Session): Promise<SignInOutcome> {
  const kept = await fetchVault(session.access_token, nameOf(session))
  let outcome: SignInOutcome
  if (kept) outcome = await takeAccount(kept, false)
  else {
    const account = freshAccount(nameOf(session))
    await linkVault(session.access_token, account)
    outcome = await takeAccount(account, true)
  }
  try {
    const settings = (await db.getSettings()) ?? DEFAULT_SETTINGS
    if (!settings.profile.name.trim()) {
      const username = nameOf(session)
      if (username) {
        await db.saveSettings({ ...settings, profile: { ...settings.profile, name: username } })
      }
    }
  } catch {
    // Database busy or unavailable; ignore
  }
  return outcome
}

/** What a refused tie says to the person. */
export function vaultErrorText(e: unknown): string | null {
  if (!(e instanceof VaultError)) return null
  switch (e.reason) {
    case 'taken':
      return 'Bu hesap başka bir e-postaya bağlanmış. O e-postayla giriş yap.'
    case 'linked':
      return 'Bu e-postaya zaten başka bir hesap bağlı.'
    case 'signed_out':
      return 'Oturumun düştü; yeniden giriş yap.'
    default:
      return 'Sunucuya şu an ulaşılamadı; biraz sonra tekrar dene.'
  }
}
