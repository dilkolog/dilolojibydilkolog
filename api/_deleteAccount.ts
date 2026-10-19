import { del, list } from '@vercel/blob'
import { approvedPath, clearAccessCache, rejectedPath, removeBlob, requestPath } from './_account.js'
import { forgetFriends } from './_friends.js'
import { blobReminders, tableReminders } from './_reminders.js'
import { tablesOn } from './_tables.js'

async function deletePrefix(prefix: string): Promise<number> {
  let removed = 0
  let cursor: string | undefined
  do {
    const page = await list({ prefix, cursor })
    if (page.blobs.length) await del(page.blobs.map((b) => b.pathname))
    removed += page.blobs.length
    cursor = page.hasMore ? page.cursor : undefined
  } while (cursor)
  return removed
}

/** The account's reminder records, mail and push (their `owner` is the account), so no reminder goes out after it is gone. */
async function deleteOwnMail(id: string): Promise<number> {
  // Both places: an account deleted soon after the move must leave nothing behind in either.
  const stores = (await tablesOn()) ? [blobReminders, tableReminders] : [blobReminders]
  let removed = 0
  for (const store of stores) {
    const keys = await store.mailsOf(id)
    for (const key of keys) await store.remove(key)
    removed += keys.length
    // The devices that registered for push reminders with this account (their notifications would keep coming).
    // Best effort: a store that cannot list them must not stop the deletion of everything else.
    const devices = await store.byOwner(id).catch(() => [])
    for (const { key } of devices) await store.remove(key)
    removed += devices.length
  }
  return removed
}

/**
 * Everything the server keeps for a sync account: its synced data and claim, its place in the owner's
 * approval, its friend card and its mail reminders. Shared lists stay (others may have opened them; the
 * learner takes them back from the list page). The device keeps its own copy.
 */
export async function deleteAccountData(id: string): Promise<number> {
  let removed = await deletePrefix(`sync/${id}/`)
  await Promise.all([removeBlob(requestPath(id)), removeBlob(approvedPath(id)), removeBlob(rejectedPath(id)), forgetFriends(id)])
  removed += await deleteOwnMail(id)
  clearAccessCache()
  return removed
}
