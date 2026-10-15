import { del, get, list } from '@vercel/blob'
import { approvedPath, clearAccessCache, rejectedPath, removeBlob, requestPath } from './_account.js'
import { forgetFriends } from './_friends.js'

/** Mail-reminder records looked at for the account's own (a flood must not make a deletion run for ever). */
const MAIL_SCAN_CAP = 3000

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

/** The account's mail-reminder records (their `owner` is the account), so no reminder goes out after it is gone. */
async function deleteOwnMail(id: string): Promise<number> {
  let removed = 0
  let seen = 0
  let cursor: string | undefined
  do {
    const page = await list({ prefix: 'push/mail-', cursor })
    for (const b of page.blobs) {
      seen++
      const blob = await get(b.pathname, { access: 'private', useCache: false }).catch(() => null)
      if (!blob || blob.statusCode !== 200 || !blob.stream) continue
      const record = (await new Response(blob.stream).json().catch(() => null)) as { owner?: string } | null
      if (record?.owner === id) {
        await del(b.pathname)
        removed++
      }
    }
    cursor = page.hasMore && seen < MAIL_SCAN_CAP ? page.cursor : undefined
  } while (cursor)
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
