import { list } from '@vercel/blob'
import { readText } from './_account.js'
import type { Report } from './_reports.js'
import { shareStore, SHARE_ID } from './share.js'

/**
 * The owner's way to see and act on what people reported, without a screen to build and guard: a read-only list
 * of the last days' reports and the site's social use, and taking a library list off the library. Open only with
 * REPORTS_TOKEN (a long random secret of its own, not ADMIN_TOKEN: that one switches the approval system on).
 * Without the secret set the endpoints do not exist. Used by scripts/reports.mjs.
 */
const digest = async (text: string) => new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))

/** Whether the request carries the owner's token (compared without leaking where it differs). */
export async function ownerAuthorized(request: Request): Promise<boolean> {
  const secret = process.env.REPORTS_TOKEN?.trim() ?? ''
  if (secret.length < 24) return false
  const given = /^Bearer (.+)$/.exec(request.headers.get('authorization') ?? '')?.[1]?.trim() ?? ''
  const [a, b] = await Promise.all([digest(secret), digest(given)])
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i]
  return diff === 0
}

const MAX_REPORTS = 200

/** Reports of the last `days` days, newest first (at most 200). */
export async function listReports(days: number, now = Date.now()): Promise<Report[]> {
  const found: Report[] = []
  for (let back = 0; back < days; back++) {
    const day = new Date(now - back * 86_400_000).toISOString().slice(0, 10)
    let cursor: string | undefined
    do {
      const page = await list({ prefix: `reports/${day}/`, cursor })
      for (const blob of page.blobs) {
        const raw = await readText(blob.pathname).catch(() => null)
        try {
          if (raw) found.push(JSON.parse(raw) as Report)
        } catch {
          // A broken file is skipped; the others still show.
        }
      }
      cursor = page.hasMore ? page.cursor : undefined
    } while (cursor)
  }
  return found.sort((x, y) => y.at.localeCompare(x.at)).slice(0, MAX_REPORTS)
}

/** Takes a list off the community library (the list itself stays). False when the id is not a list id. */
export async function unpublishList(id: string): Promise<boolean> {
  if (!SHARE_ID.test(id)) return false
  await (await shareStore()).unpublish(id)
  return true
}
