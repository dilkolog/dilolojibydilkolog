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
}

export class AdminError extends Error {}

/**
 * The owner's second secret (OWNER_STEP_SECRET) for the steps that cannot be undone: asked once when the server wants
 * it, kept in this tab's memory only (never stored), and sent with every admin request after.
 */
let ownerSecret = ''
let askSecret: ((wrong: boolean) => Promise<string | null>) | null = null
export const setOwnerSecretAsker = (ask: typeof askSecret) => void (askSecret = ask)
export const forgetOwnerSecret = () => void (ownerSecret = '')

/** Shown for a step the owner did not confirm with the second secret. */
export const OWNER_SECRET_TEXT = 'Bu adım için ikinci gizli gerekiyor (OWNER_STEP_SECRET).'

async function adminFetch<T>(query: string, init: RequestInit = {}, asked = false): Promise<T> {
  const session = await currentSession().catch(() => null)
  if (!session?.access_token) throw new AdminError('signed out')
  const res = await fetch(`/api/admin${query}`, {
    ...init,
    headers: {
      ...(init.body ? { 'content-type': 'application/json' } : {}),
      authorization: `Bearer ${session.access_token}`,
      ...(ownerSecret ? { 'x-owner-secret': ownerSecret } : {}),
    },
  })
  const body = (await res.json().catch(() => ({}))) as T & { error?: string }
  if (res.status === 403 && (body.error === 'owner_secret' || body.error === 'owner_secret_wrong')) {
    ownerSecret = ''
    const given = !asked && askSecret ? await askSecret(body.error === 'owner_secret_wrong') : null
    if (!given) throw new AdminError(body.error === 'owner_secret_wrong' ? 'İkinci gizli yanlış.' : OWNER_SECRET_TEXT)
    ownerSecret = given
    return adminFetch<T>(query, init, true)
  }
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
export const deletePerson = (user: string, confirm: string, block = false) =>
  adminFetch<{ ok: true; blocked?: string }>('', { method: 'POST', body: JSON.stringify({ action: 'person-delete', user, confirm, ...(block ? { block: true } : {}) }) })

export const loadReports = (days = 7) => adminFetch<{ reports: OwnerReport[] }>(`?view=reports&days=${days}`)

export const unpublishSet = (id: string) => adminFetch<{ ok: boolean }>('', { method: 'POST', body: JSON.stringify({ action: 'unpublish', id }) })

export const loadSystem = () => adminFetch<SystemState>('?view=system')

export interface Stats {
  total: number
  pending: number
  newByDay: { day: string; count: number }[]
  /** null where sync is not kept in Supabase: the server cannot tell. */
  active7: number | null
  active30: number | null
}

export interface UsageTotals {
  aiCalls: number
  aiUsd: number
  translateChars: number
  ttsChars: number
  assessCalls: number
  people: number
}

export interface Usage {
  available: boolean
  today: UsageTotals
  month: UsageTotals
  top: { email: string; aiCalls: number; aiUsd: number; translateChars: number }[]
}

export interface PersonDetail {
  /** The synced figures: null where sync is not kept in Supabase. */
  words: number | null
  answers: number | null
  texts: number | null
  lastSync: string | null
  bytes: number | null
  lastSignIn: string | null
  provider: string
  today: { aiCalls: number; aiUsd: number; translateChars: number; ttsChars: number } | null
}

export type LimitName = 'aiDailyCalls' | 'aiDailyBudgetUsd' | 'aiSiteBudgetUsd' | 'translateChars' | 'ttsChars'
export interface Announcement {
  id: string
  text: string
  at: string
}

export interface SettingsView {
  settings: Partial<Record<LimitName, number>> & { autoApprove?: boolean; facebookLogin?: boolean; announcement?: Announcement | null }
  effective: Record<LimitName, number>
  defaults: Record<LimitName, number>
  ranges: Record<LimitName, { min: number; max: number }>
}

export interface Block {
  kind: 'email' | 'domain'
  value: string
  note: string
  createdAt: string
}

export const loadStats = () => adminFetch<Stats>('?view=stats')
export const loadUsage = () => adminFetch<Usage>('?view=usage')
export const loadPerson = (user: string) => adminFetch<PersonDetail>(`?view=person&user=${encodeURIComponent(user)}`)
export const loadSettings = () => adminFetch<SettingsView>('?view=settings')
/** A limit set to null goes back to its default. */
export const saveSettings = (settings: Partial<Record<LimitName, number | null>> & { autoApprove?: boolean; facebookLogin?: boolean }) =>
  adminFetch<SettingsView>('', { method: 'POST', body: JSON.stringify({ action: 'settings', settings }) })
/** An empty text takes the announcement back. */
export const announce = (text: string) =>
  adminFetch<{ ok: true; announcement: Announcement | null }>('', { method: 'POST', body: JSON.stringify({ action: 'announce', text }) })
export const approveAll = () => adminFetch<{ ok: true; approved: number }>('', { method: 'POST', body: JSON.stringify({ action: 'approve-all' }) })
export const loadBlocks = () => adminFetch<{ available: boolean; blocks: Block[] }>('?view=blocks')
export const block = (value: string, note = '') => adminFetch<{ ok: true }>('', { method: 'POST', body: JSON.stringify({ action: 'block', value, note }) })
export const unblock = (kind: Block['kind'], value: string) =>
  adminFetch<{ ok: true }>('', { method: 'POST', body: JSON.stringify({ action: 'unblock', kind, value }) })
