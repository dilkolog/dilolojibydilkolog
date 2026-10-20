import { currentIdentity, signOutSupabase, type Identity } from '../data/supabase'
import { getAccount, setAccount } from './syncRunner'
import { showToast, undoable } from './toastFeed'

/**
 * Signs this device out (the account menu in the side bar and Settings → Account share it): the device keeps its
 * words and progress, its push reminders go with the account that leaves, and the sign-in page takes over.
 * `identity` is the Supabase sign-in when the caller already knows it.
 */
export async function signOutThisDevice(identity?: Identity | null): Promise<void> {
  const previous = await getAccount()
  const who = identity === undefined ? (previous ? await currentIdentity().catch(() => null) : null) : identity
  // This device's push reminders belong to the account that leaves: its record goes, the device stays subscribed.
  void import('./pushReminders').then((m) => m.forgetPushRecord())
  await setAccount(null)
  if (who) {
    await signOutSupabase()
    showToast('Bu cihazda çıkış yapıldı; kelimelerin ve ilerlemen cihazda duruyor.')
  } else
    undoable('Bu cihazda çıkış yapıldı; verilerin cihazda duruyor', async () => {
      await setAccount(previous)
    })
}
