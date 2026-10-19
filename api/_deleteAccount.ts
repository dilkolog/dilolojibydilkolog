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

/** Runs one step of a deletion and notes how long it took (milliseconds, by name) in `steps`. */
export async function timed<T>(steps: Record<string, number> | undefined, name: string, run: () => Promise<T>): Promise<T> {
  const start = Date.now()
  try {
    return await run()
  } finally {
    if (steps) steps[name] = Date.now() - start
  }
}

/**
 * Everything the server keeps for a sync account: its synced data and claim, its place in the owner's
 * approval, its friend card and its mail reminders. Shared lists stay (others may have opened them; the
 * learner takes them back from the list page). The device keeps its own copy.
 * The three groups do not depend on each other, so they run side by side: each is a chain of store calls
 * and waiting for them one after another made a deletion take many seconds.
 */
export async function deleteAccountData(id: string, steps?: Record<string, number>): Promise<number> {
  const [synced, , mails] = await Promise.all([
    timed(steps, 'synced', () => deletePrefix(`sync/${id}/`)),
    timed(steps, 'markers+friends', () => Promise.all([removeBlob(requestPath(id)), removeBlob(approvedPath(id)), removeBlob(rejectedPath(id)), forgetFriends(id)])),
    timed(steps, 'mail', () => deleteOwnMail(id)),
  ])
  clearAccessCache()
  return synced + mails
}
