import type { Session } from '@supabase/supabase-js'
import { probeAccount } from '../data/access'
import { deriveAccount, SyncApprovalError, type Account } from '../data/sync'
import { fetchVault, freshAccount, linkVault, VaultError } from '../data/vault'
import { getAccount, getSyncCode, runSync, setAccount, setSyncCode } from './syncRunner'

/** The name a person goes by: the one chosen at sign-up, Google's, or the email's first part. */
export function nameOf(session: Session): string {
  const meta = (session.user.user_metadata ?? {}) as Record<string, unknown>
  const named = [meta.username, meta.full_name, meta.name].find((v): v is string => typeof v === 'string' && !!v.trim())
  return (named ?? session.user.email?.split('@')[0] ?? 'kullanıcı').trim().slice(0, 32)
}

export type SignInOutcome = { kind: 'done'; waiting: boolean; fresh: boolean } | { kind: 'choose' }

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
 * After a Supabase sign-in: the person's sync account from the server, or, the first time, the one this
 * device already uses (tied to them now). With neither, the person chooses: their old username and
 * password, or a new start (`choose`).
 */
export async function completeSignIn(session: Session): Promise<SignInOutcome> {
  const kept = await fetchVault(session.access_token, nameOf(session))
  if (kept) return takeAccount(kept, false)
  const device = await getAccount()
  if (!device) return { kind: 'choose' }
  await linkVault(session.access_token, device)
  return takeAccount(device, false)
}

/** The old username-and-password account, tied to the person. Throws VaultError('wrong') on a wrong password. */
export async function linkOldAccount(session: Session, username: string, password: string): Promise<SignInOutcome> {
  const account = await deriveAccount(username, password)
  const probe = await probeAccount(account)
  if (!probe.exists || !probe.match) throw new VaultError('wrong')
  await linkVault(session.access_token, account)
  return takeAccount(account, false)
}

/** A new sync account for a person with nothing to bring along. */
export async function startFresh(session: Session, note = ''): Promise<SignInOutcome> {
  const account = freshAccount(nameOf(session))
  await linkVault(session.access_token, account, note)
  return takeAccount(account, true)
}

/** What a refused tie says to the person. */
export function vaultErrorText(e: unknown): string | null {
  if (!(e instanceof VaultError)) return null
  switch (e.reason) {
    case 'wrong':
      return 'Kullanıcı adı ya da şifre yanlış.'
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
