import { currentIdentity, signOutSupabase, type Identity } from '../../data/supabase'
import { getAccount, runSync, setAccount } from './syncRunner'
import { showToast, undoable } from '../shared/toastFeed'

/** Clears this device after the sign-out: the account has everything (a sync just ran, or the person chose to go without). */
async function leaveAndWipe(): Promise<void> {
  // This device's push reminders belong to the account that leaves: its record goes, the device stays subscribed.
  await import('../settings/pushReminders').then((m) => m.forgetPushRecord()).catch(() => undefined)
  await setAccount(null)
  await signOutSupabase()
  await (await import('../../data/deviceWipe')).wipeDevice()
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
      const result = await runSync(true)
      if (!result) throw new Error('Sync did not complete')
      if (result.skipped > 0) {
        showToast(`Çıkış yapılmadı: ${result.skipped} görsel/ses kaydı eşitlenemedi. Bu cihazdaki verilerin korunuyor; eşitleme tamamlanınca tekrar çıkış yapabilirsin.`, undefined, 15_000, 'info')
        return false
      }
    } catch (e) {
      // An account still waiting for approval cannot send anything yet: no retry helps, so it is said as it is.
      const waiting = e instanceof Error && e.name === 'SyncApprovalError'
      showToast(
        waiting
          ? 'Çıkış yapılmadı: hesabın henüz onaylanmadığı için kelimelerin ve ilerlemen hesabına gönderilemiyor; şimdilik yalnızca bu cihazda. Yine de çıkarsan bu cihazdaki veriler silinir.'
          : 'Çıkış yapılmadı: son değişiklikler hesabına gönderilemedi, silinmesin diye bekledim. İnternetini kontrol edip tekrar dene. Yine de çıkarsan eşitlenmeyen yerel veriler silinir.',
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
  void import('../settings/pushReminders').then((m) => m.forgetPushRecord())
  await setAccount(null)
  undoable('Bu cihazda çıkış yapıldı; verilerin cihazda duruyor', async () => {
    await setAccount(previous)
  })
  return true
}
