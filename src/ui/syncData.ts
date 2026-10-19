import type { KelimeDB } from '../data/db'
import { markMoved, SyncApprovalError, syncNow, type Account, type PartStore } from '../data/sync'

/**
 * Moves the account's data from the old store to Supabase. False when it cannot yet (Supabase refuses
 * before the owner's approval reaches it): the device keeps syncing the old way and tries again later.
 */
export async function moveToSupabase(db: KelimeDB, account: Account, store: PartStore, refreshApproval?: () => Promise<unknown>): Promise<boolean> {
  try {
    await syncNow(db, account)
  } catch {
    // The old store is a courtesy (the latest of another device that has not moved yet): moved already, unreachable,
    // refusing, over its limit, whatever it is, what this device holds goes up. A new account has nothing there.
  }
  try {
    await syncNow(db, store)
  } catch (e) {
    if (!(e instanceof SyncApprovalError)) throw e
    // An approval given the old way reaches the profile when the server is asked once more.
    if (!refreshApproval) return false
    await refreshApproval().catch(() => undefined)
    try {
      await syncNow(db, store)
    } catch (again) {
      if (again instanceof SyncApprovalError) return false
      throw again
    }
  }
  await markMoved(account).catch(() => undefined)
  return true
}
