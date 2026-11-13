import { listDocPaths } from './_docs.js'
import { bearerOf, secretMatches } from './_secret.js'
import { confirmedUser } from './_supabase.js'
import { readText } from './_account.js'
import type { Report } from './_reports.js'
import { shareStore, SHARE_ID } from './share.js'

/**
 * The owner's way to see and act on what people reported, without a screen to build and guard: a read-only list
 * of the last days' reports and the site's social use, and taking a library list off the library. Open only with
 * REPORTS_TOKEN (a long random secret of its own).
 * Without the secret set the endpoints do not exist. Used by scripts/reports.mjs.
 */

/** Whether the request carries the owner's token (compared without leaking where it differs). */
export async function ownerAuthorized(request: Request): Promise<boolean> {
  const secret = process.env.REPORTS_TOKEN?.trim() ?? ''
  if (secret.length < 24) return false
  return secretMatches(bearerOf(request), secret)
}

/** The owner's address(es): OWNER_EMAIL (a Worker secret), several separated by commas. */
export const ownerEmails = () =>
  (process.env.OWNER_EMAIL ?? '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.includes('@'))

/**
 * Whether the request is the owner signed in: a Supabase session whose confirmed email is OWNER_EMAIL. 'code' when the
 * owner has a second factor (TOTP) and this session has not given its code yet (aal1): the admin screen then asks for it,
 * so the mailbox or the Google account alone does not open it. With OWNER_MFA=required the code is asked even before
 * one is set up (the screen then offers to set one up and nothing else).
 */
export async function ownerSession(request: Request): Promise<'owner' | 'code' | 'setup' | null> {
  const owners = ownerEmails()
  if (!owners.length) return null
  const user = await confirmedUser(request)
  if (!user || !owners.includes(user.email.trim().toLowerCase())) return null
  if (user.factor) return user.aal2 ? 'owner' : 'code'
  return process.env.OWNER_MFA?.trim().toLowerCase() === 'required' ? 'setup' : 'owner'
}

/** Whether the request is the owner, with the second factor when one is set up. */
export const isOwnerSession = async (request: Request): Promise<boolean> => (await ownerSession(request)) === 'owner'

const MAX_REPORTS = 200

/** Reports of the last `days` days, newest first (at most 200). */
export async function listReports(days: number, now = Date.now()): Promise<Report[]> {
  const found: Report[] = []
  for (let back = 0; back < days; back++) {
    const day = new Date(now - back * 86_400_000).toISOString().slice(0, 10)
    for (const path of await listDocPaths(`reports/${day}/`)) {
      const raw = await readText(path).catch(() => null)
      try {
        if (raw) found.push(JSON.parse(raw) as Report)
      } catch {
        // A broken file is skipped; the others still show.
      }
    }
  }
  return found.sort((x, y) => y.at.localeCompare(x.at)).slice(0, MAX_REPORTS)
}

/** Takes a list off the community library (the list itself stays). False when the id is not a list id. */
export async function unpublishList(id: string): Promise<boolean> {
  if (!SHARE_ID.test(id)) return false
  await (await shareStore()).unpublish(id)
  return true
}
