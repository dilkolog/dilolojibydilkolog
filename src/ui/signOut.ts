import { currentIdentity, signOutSupabase, type Identity } from '../data/supabase'
import { getAccount, runSync, setAccount } from './syncRunner'
import { showToast, undoable } from './toastFeed'

/** Clears this device after the sign-out: the account has everything (a sync just ran, or the person chose to go without). */
async function leaveAndWipe(): Promise<void> {
  // This device's push reminders belong to the account that leaves: its record goes, the device stays subscribed.
  await import('./pushReminders').then((m) => m.forgetPushRecord()).catch(() => undefined)
  await setAccount(null)
  await signOutSupabase()
  await (await import('../data/deviceWipe')).wipeDevice()
  location.reload()
}

/**
 * Signs this device out (the account menu in the side bar and Settings → Account share it). The data lives in the
 * account and a device only keeps a copy of it, so a signed-in person's sign-out ends with the device empty: the
 * last changes go up first and, if they cannot (offline, the account not approved), nothing is signed out or
 * deleted, with a way to leave anyway. Without a Supabase sign-in (an old sync code or username account) the
 * device keeps its data, as before. `identity` is the Supabase sign-in when the caller already knows it.
 * Returns whether the device was signed out.
 */
export async function signOutThisDevice(identity?: Identity | null): Promise<boolean> {
  const previous = await getAccount()
  const who = identity === undefined ? (previous ? await currentIdentity().catch(() => null) : null) : identity
  if (who) {
    try {
      await runSync(true)
    } catch {
      showToast(
        'Çıkış yapılmadı: son değişiklikler hesabına gönderilemedi, silinmesin diye bekledim. İnternetini kontrol edip tekrar dene.',
        { label: 'Yine de çık', run: () => void leaveAndWipe() },
        15_000,
        'info',
      )
      return false
    }
    await leaveAndWipe()
    return true
  }
  // This device's push reminders belong to the account that leaves: its record goes, the device stays subscribed.
  void import('./pushReminders').then((m) => m.forgetPushRecord())
  await setAccount(null)
  undoable('Bu cihazda çıkış yapıldı; verilerin cihazda duruyor', async () => {
    await setAccount(previous)
  })
  return true
}
