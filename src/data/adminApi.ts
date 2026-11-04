import { currentSession, supabaseConfigured } from './supabase'

/**
 * The owner's admin screen talks to /api/admin with the Supabase sign-in: the server opens it only to a session whose
 * confirmed e-mail is OWNER_EMAIL (api/_owner.ts). Nobody else sees the entry or gets an answer.
 */

export type PeopleFilter = 'pending' | 'approved' | 'rejected' | 'all'
export type AiLevel = 'kapali' | 'kelime' | 'calisma' | 'tam'

export interface Person {
  id: string
  email: string
  username: string
  approved: boolean
  rejected: boolean
  createdAt: string
  aiLevel: AiLevel | null
}

export interface OwnerReport {
  id: string
  at: string
  kind: 'user' | 'message' | 'set' | 'club'
  reason: string
  note: string
  target: string
  about?: { owner?: string; name?: string; code?: string }
  content: string
  hidden?: true
}

export interface SystemState {
  health: { ok: boolean; supabase: 'ok' | 'down' | 'off'; storage: 'ok' | 'down' | 'off' }
  problems: string[]
  docs: 'on' | 'ready' | 'off'
  tables: 'on' | 'ready' | 'missing' | 'off'
}

export interface MoveStep {
  copied: number
  next: { prefix: number; cursor?: string } | null
  at: string
}

export class AdminError extends Error {}

async function adminFetch<T>(query: string, init: RequestInit = {}): Promise<T> {
  const session = await currentSession().catch(() => null)
  if (!session?.access_token) throw new AdminError('signed out')
  const res = await fetch(`/api/admin${query}`, {
    ...init,
    headers: { ...(init.body ? { 'content-type': 'application/json' } : {}), authorization: `Bearer ${session.access_token}` },
  })
  const body = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (!res.ok) throw new AdminError(body.error ?? `HTTP ${res.status}`)
  return body
}

let owner: Promise<boolean> | null = null
/** Whether the person signed in is the owner (asked once a visit; false without Supabase or when the server says no). */
export function amOwner(): Promise<boolean> {
  if (!supabaseConfigured()) return Promise.resolve(false)
  owner ??= adminFetch<{ owner?: boolean }>('?view=me')
    .then((r) => r.owner === true)
    .catch(() => false)
  return owner
}
export const forgetOwner = () => void (owner = null)

export const loadPeople = (filter: PeopleFilter, q = '') =>
  adminFetch<{ people: Person[]; levels: boolean; pending: number }>(`?view=people&filter=${filter}${q ? `&q=${encodeURIComponent(q)}` : ''}`)

export const changePerson = (user: string, change: { change?: 'approve' | 'reject' | 'wait'; level?: AiLevel | null }) =>
  adminFetch<{ ok: true }>('', { method: 'POST', body: JSON.stringify({ action: 'person', user, ...change }) })

/** Deletes a person's account; `confirm` is their e-mail, typed by the owner. */
export const deletePerson = (user: string, confirm: string) =>
  adminFetch<{ ok: true }>('', { method: 'POST', body: JSON.stringify({ action: 'person-delete', user, confirm }) })

export const loadReports = (days = 7) => adminFetch<{ reports: OwnerReport[] }>(`?view=reports&days=${days}`)

export const unpublishSet = (id: string) => adminFetch<{ ok: boolean }>('', { method: 'POST', body: JSON.stringify({ action: 'unpublish', id }) })

export const loadSystem = () => adminFetch<SystemState>('?view=system')

export const moveStep = (from?: MoveStep['next']) => adminFetch<MoveStep>('', { method: 'POST', body: JSON.stringify({ action: 'move-docs', ...(from ? { from } : {}) }) })
