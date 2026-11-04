import { clearAccessCache, StorageError } from './_account.js'
import { deleteAccountData, timed } from './_deleteAccount.js'
import { ownerEmails } from './_owner.js'
import { deleteSupabaseMedia, deleteSupabaseUser, rest, vaultOf } from './_supabase.js'

/**
 * The owner's view of the people (Supabase `profiles`), for the admin screen: who waits for approval, who is approved
 * or turned down, and each one's AI level. Approving here is what the Table Editor did by hand (`approved`,
 * `rejected`, `ai_level`); the server reads the same columns (requireApproved, the AI's level).
 */

export type PeopleFilter = 'pending' | 'approved' | 'rejected' | 'all'
export const AI_LEVELS = ['kapali', 'kelime', 'calisma', 'tam'] as const
export type AiLevel = (typeof AI_LEVELS)[number]

export interface Person {
  id: string
  email: string
  username: string
  approved: boolean
  rejected: boolean
  createdAt: string
  /** null: the default level (or migration 0007 not run, then `levels` is false in the answer). */
  aiLevel: AiLevel | null
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
/** How many rows a list shows (newest first); a search narrows it. */
export const PEOPLE_SHOWN = 200

const FILTER: Record<PeopleFilter, string> = {
  pending: '&approved=eq.false&rejected=eq.false',
  approved: '&approved=eq.true',
  rejected: '&rejected=eq.true',
  all: '',
}

/** A search by e-mail or name: letters, digits and the characters of an address only (nothing PostgREST would read as syntax). */
export const cleanSearch = (q: unknown) => (typeof q === 'string' ? q.trim().toLowerCase().replace(/[^\p{L}\p{N}@._+-]/gu, '').slice(0, 60) : '')

type Row = { user_id: string; email: string | null; username: string | null; approved: boolean; rejected: boolean; created_at: string; ai_level?: string | null }

async function select(columns: string, filter: PeopleFilter, q: string): Promise<Response> {
  const search = q ? `&or=(email.ilike.*${encodeURIComponent(q)}*,username.ilike.*${encodeURIComponent(q)}*)` : ''
  return rest(`profiles?select=${columns}${FILTER[filter]}${search}&order=created_at.desc&limit=${PEOPLE_SHOWN}`)
}

/** People of one kind, newest first; `levels` says whether the AI level column exists (migration 0007). */
export async function listPeople(filter: PeopleFilter, rawQuery?: unknown): Promise<{ people: Person[]; levels: boolean }> {
  const q = cleanSearch(rawQuery)
  const base = 'user_id,email,username,approved,rejected,created_at'
  let levels = true
  let res = await select(`${base},ai_level`, filter, q).catch(() => null)
  // The level column comes with 0007: without it the list still works.
  if (res && !res.ok && /42703|ai_level/.test(await res.clone().text().catch(() => ''))) {
    levels = false
    res = await select(base, filter, q).catch(() => null)
  }
  if (!res || !res.ok) throw new StorageError(`supabase ${res?.status ?? 'unreachable'}`)
  const rows = (await res.json()) as Row[]
  return {
    levels,
    people: rows.map((r) => ({
      id: r.user_id,
      email: r.email ?? '',
      username: r.username ?? '',
      approved: r.approved,
      rejected: r.rejected,
      createdAt: r.created_at,
      aiLevel: AI_LEVELS.includes(r.ai_level as AiLevel) ? (r.ai_level as AiLevel) : null,
    })),
  }
}

/** How many wait for approval (for the screen's heading). */
export async function pendingCount(): Promise<number> {
  const res = await rest('profiles?select=user_id&approved=eq.false&rejected=eq.false', { headers: { prefer: 'count=exact', range: '0-0' } }).catch(() => null)
  const total = res?.headers.get('content-range')?.split('/')[1]
  return total && /^\d+$/.test(total) ? Number(total) : 0
}

export type PersonAction = 'approve' | 'reject' | 'wait'

/**
 * Changes one person: approve, turn down, or put back to waiting, and/or set the AI level (null = the default).
 * 'bad' when the request names no person or no change.
 */
export async function updatePerson(id: unknown, action: unknown, level: unknown): Promise<'ok' | 'bad' | 'missing'> {
  if (typeof id !== 'string' || !UUID.test(id)) return 'bad'
  const patch: Record<string, unknown> = {}
  if (action === 'approve') Object.assign(patch, { approved: true, rejected: false })
  else if (action === 'reject') Object.assign(patch, { approved: false, rejected: true })
  else if (action === 'wait') Object.assign(patch, { approved: false, rejected: false })
  else if (action !== undefined) return 'bad'
  if (level !== undefined) {
    if (level !== null && !AI_LEVELS.includes(level as AiLevel)) return 'bad'
    patch.ai_level = level
  }
  if (!Object.keys(patch).length) return 'bad'
  const res = await rest(`profiles?user_id=eq.${id}`, { method: 'PATCH', headers: { prefer: 'return=representation' }, body: JSON.stringify(patch) }).catch(() => null)
  if (!res) throw new StorageError('supabase unreachable')
  if (!res.ok) {
    if (/42703|ai_level/.test(await res.text().catch(() => ''))) return 'missing'
    throw new StorageError(`supabase ${res.status}`)
  }
  // This instance forgets its remembered answers at once; the others within their few minutes.
  clearAccessCache()
  return ((await res.json()) as unknown[]).length ? 'ok' : 'bad'
}

export type DeleteResult = 'ok' | 'bad' | 'confirm' | 'owner' | 'missing'

/**
 * The owner deletes someone's account: the same as the person deleting it themselves (access.ts accountDelete): the
 * server's stores for their sync account, their Supabase files, then the person (last, so a failure before leaves it
 * to retry). `confirm` must be the person's e-mail as the screen showed it, so a slip of the finger deletes nobody;
 * an owner address is never deleted from here. Their devices keep their own copy until they next sign in.
 */
export async function deletePerson(id: unknown, confirm: unknown): Promise<DeleteResult> {
  if (typeof id !== 'string' || !UUID.test(id)) return 'bad'
  const res = await rest(`profiles?select=email&user_id=eq.${id}`).catch(() => null)
  if (!res || !res.ok) throw new StorageError(`supabase ${res?.status ?? 'unreachable'}`)
  const rows = (await res.json()) as { email: string | null }[]
  if (!rows.length) return 'missing'
  const email = (rows[0].email ?? '').trim().toLowerCase()
  if (typeof confirm !== 'string' || !email || confirm.trim().toLowerCase() !== email) return 'confirm'
  if (ownerEmails().includes(email)) return 'owner'
  const steps: Record<string, number> = {}
  const vault = await vaultOf(id)
  await Promise.all([
    vault ? timed(steps, 'data', () => deleteAccountData(vault.id, steps)) : Promise.resolve(0),
    timed(steps, 'media', () => deleteSupabaseMedia(id)),
  ])
  await timed(steps, 'user', () => deleteSupabaseUser(id))
  console.log('[owner-delete]', JSON.stringify({ user: id, ...steps }))
  return 'ok'
}
