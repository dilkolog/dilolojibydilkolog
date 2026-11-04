import { clearAccessCache, StorageError } from './_account.js'
import { authAdmin, rest } from './_supabase.js'

/**
 * The admin screen's numbers and owner tools that read Supabase directly (service key): people counts, the day's and
 * month's use of the paid services, one person's details, approving everyone waiting, and the owner's block list
 * (migration 0011). Each one says 'missing' instead of failing when its table is not there yet.
 */

const DAY = 86_400_000
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const HEX64 = /^[0-9a-f]{64}$/
const dayOf = (t: number) => new Date(t).toISOString().slice(0, 10)
const isMissing = (status: number, text: string) => status === 404 || /PGRST205|PGRST202|42P01|42883/.test(text)

/**
 * A table or view this project's database does not have. The synced data tables (sync_parts and the
 * views on it, migration 0002) exist only where sync was moved to Supabase; elsewhere sync lives in
 * R2 and the figures read from them are simply unknown.
 */
class MissingTable extends Error {}

/** The answer, or null when its table is missing (any other failure still throws). */
const orNull = <T>(p: Promise<T>): Promise<T | null> => p.catch((e: unknown) => (e instanceof MissingTable ? null : Promise.reject(e)))

async function failed(res: Response): Promise<never> {
  if (isMissing(res.status, await res.text().catch(() => ''))) throw new MissingTable(`supabase ${res.status}`)
  throw new StorageError(`supabase ${res.status}`)
}

/** The total behind a `count=exact` answer (its content-range). */
async function countOf(path: string): Promise<number> {
  const res = await rest(path, { headers: { prefer: 'count=exact', range: '0-0' } })
  if (!res.ok) return failed(res)
  const total = res.headers.get('content-range')?.split('/')[1]
  return total && /^\d+$/.test(total) ? Number(total) : 0
}

async function rows<T>(path: string): Promise<T[]> {
  const res = await rest(path)
  if (!res.ok) return failed(res)
  return (await res.json()) as T[]
}

export interface Stats {
  total: number
  pending: number
  /** New accounts of the last 7 days, oldest day first, with the day. */
  newByDay: { day: string; count: number }[]
  /** People whose data changed (a sync) within 7 and 30 days; null where sync is not kept in Supabase. */
  active7: number | null
  active30: number | null
}

export async function stats(now = Date.now()): Promise<Stats> {
  const since7 = new Date(now - 6 * DAY).toISOString().slice(0, 10)
  const [total, pending, created, active7, active30] = await Promise.all([
    countOf('profiles?select=user_id'),
    countOf('profiles?select=user_id&approved=eq.false&rejected=eq.false'),
    rows<{ created_at: string }>(`profiles?select=created_at&created_at=gte.${since7}&limit=5000`),
    orNull(countOf(`sync_parts?select=user_id&name=eq.core&updated_at=gte.${new Date(now - 7 * DAY).toISOString()}`)),
    orNull(countOf(`sync_parts?select=user_id&name=eq.core&updated_at=gte.${new Date(now - 30 * DAY).toISOString()}`)),
  ])
  const newByDay = Array.from({ length: 7 }, (_, i) => ({ day: dayOf(now - (6 - i) * DAY), count: 0 }))
  for (const r of created) {
    const slot = newByDay.find((d) => d.day === r.created_at.slice(0, 10))
    if (slot) slot.count++
  }
  return { total, pending, newByDay, active7, active30 }
}

/** What each counter means on the screen; the AI money is kept in ten-thousandths of a dollar (api/ai.ts UNIT). */
export const USAGE_NAMES = ['ai', 'ai-cost', 'translate', 'tts', 'assess'] as const
type UsageName = (typeof USAGE_NAMES)[number]
const COST_UNIT = 10_000

export interface UsageTotals {
  aiCalls: number
  aiUsd: number
  translateChars: number
  ttsChars: number
  assessCalls: number
  /** How many accounts used anything counted. */
  people: number
}

export interface UsageTop {
  email: string
  aiCalls: number
  aiUsd: number
  translateChars: number
}

export interface Usage {
  available: boolean
  today: UsageTotals
  month: UsageTotals
  /** Today's heaviest users of the AI, by money. */
  top: UsageTop[]
}

type CounterRow = { name: string; day: string; subject: string; used: number }

function totals(list: CounterRow[]): UsageTotals {
  const sum = (name: UsageName) => list.filter((r) => r.name === name).reduce((n, r) => n + Number(r.used || 0), 0)
  return {
    aiCalls: sum('ai'),
    aiUsd: Math.round((sum('ai-cost') / COST_UNIT) * 100) / 100,
    translateChars: sum('translate'),
    ttsChars: sum('tts'),
    assessCalls: sum('assess'),
    people: new Set(list.filter((r) => HEX64.test(r.subject)).map((r) => r.subject)).size,
  }
}

/** E-mail per sync account id (the counters' subject), through sync_keys and profiles. */
async function emailsOf(syncIds: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  const ids = syncIds.filter((id) => HEX64.test(id))
  if (!ids.length) return out
  const keys = await rows<{ sync_id: string; user_id: string }>(`sync_keys?select=sync_id,user_id&sync_id=in.(${ids.join(',')})`)
  const users = keys.map((k) => k.user_id).filter((u) => UUID.test(u))
  if (!users.length) return out
  const people = await rows<{ user_id: string; email: string | null }>(`profiles?select=user_id,email&user_id=in.(${users.join(',')})`)
  const email = new Map(people.map((p) => [p.user_id, p.email ?? '']))
  for (const k of keys) out.set(k.sync_id, email.get(k.user_id) ?? '')
  return out
}

export async function usage(now = Date.now()): Promise<Usage> {
  const today = dayOf(now)
  const monthStart = `${today.slice(0, 7)}-01`
  const empty = totals([])
  const names = `name=in.(${USAGE_NAMES.join(',')})`
  const res = await rest(`usage_counters?select=name,day,subject,used&${names}&day=gte.${monthStart}&limit=20000`)
  if (!res.ok) {
    if (isMissing(res.status, await res.text().catch(() => ''))) return { available: false, today: empty, month: empty, top: [] }
    throw new StorageError(`supabase ${res.status}`)
  }
  const list = (await res.json()) as CounterRow[]
  const todays = list.filter((r) => r.day === today)
  const bySubject = new Map<string, CounterRow[]>()
  for (const r of todays) if (HEX64.test(r.subject)) bySubject.set(r.subject, [...(bySubject.get(r.subject) ?? []), r])
  const ranked = [...bySubject.entries()]
    .map(([subject, own]) => ({ subject, t: totals(own) }))
    .sort((a, b) => b.t.aiUsd - a.t.aiUsd || b.t.aiCalls - a.t.aiCalls || b.t.translateChars - a.t.translateChars)
    .slice(0, 5)
  const emails = await emailsOf(ranked.map((r) => r.subject)).catch(() => new Map<string, string>())
  return {
    available: true,
    today: totals(todays),
    month: totals(list),
    top: ranked.map((r) => ({ email: emails.get(r.subject) || 'bilinmeyen hesap', aiCalls: r.t.aiCalls, aiUsd: r.t.aiUsd, translateChars: r.t.translateChars })),
  }
}

export interface PersonDetail {
  /** The synced figures; all null where sync is not kept in Supabase (no sync_parts / people). */
  words: number | null
  answers: number | null
  texts: number | null
  lastSync: string | null
  /** Bytes of synced data on the server. */
  bytes: number | null
  lastSignIn: string | null
  provider: string
  today: { aiCalls: number; aiUsd: number; translateChars: number; ttsChars: number } | null
}

export async function personDetail(id: unknown, now = Date.now()): Promise<PersonDetail | 'bad' | 'missing'> {
  if (typeof id !== 'string' || !UUID.test(id)) return 'bad'
  const [figures, parts, key, auth] = await Promise.all([
    orNull(rows<{ words: number; answers: number; texts: number; last_sync: string | null }>(`people?select=words,answers,texts,last_sync&user_id=eq.${id}`)),
    orNull(rows<{ bytes: number }>(`sync_parts?select=bytes&user_id=eq.${id}&limit=2000`)),
    rows<{ sync_id: string }>(`sync_keys?select=sync_id&user_id=eq.${id}`),
    authAdmin(`users/${id}`).catch(() => null),
  ])
  if (!figures?.length && (!auth || auth.status === 404)) return 'missing'
  const user = auth?.ok ? ((await auth.json().catch(() => ({}))) as { last_sign_in_at?: string | null; app_metadata?: { provider?: string } }) : {}
  const syncId = key[0]?.sync_id
  let today: PersonDetail['today'] = null
  if (syncId && HEX64.test(syncId)) {
    const res = await rest(`usage_counters?select=name,day,subject,used&subject=eq.${syncId}&day=eq.${dayOf(now)}`).catch(() => null)
    if (res?.ok) {
      const t = totals((await res.json()) as CounterRow[])
      today = { aiCalls: t.aiCalls, aiUsd: t.aiUsd, translateChars: t.translateChars, ttsChars: t.ttsChars }
    }
  }
  const f = figures?.[0]
  return {
    words: figures ? Number(f?.words ?? 0) : null,
    answers: figures ? Number(f?.answers ?? 0) : null,
    texts: figures ? Number(f?.texts ?? 0) : null,
    lastSync: f?.last_sync ?? null,
    bytes: parts ? parts.reduce((n, p) => n + Number(p.bytes || 0), 0) : null,
    lastSignIn: user.last_sign_in_at ?? null,
    provider: user.app_metadata?.provider ?? '',
    today,
  }
}

/** Approves everyone waiting; how many. */
export async function approveAll(): Promise<number> {
  const res = await rest('profiles?approved=eq.false&rejected=eq.false&select=user_id', {
    method: 'PATCH',
    headers: { prefer: 'return=representation' },
    body: JSON.stringify({ approved: true, rejected: false }),
  })
  if (!res.ok) throw new StorageError(`supabase ${res.status}`)
  clearAccessCache()
  return ((await res.json()) as unknown[]).length
}

// --- The owner's block list (0011) -----------------------------------------------------------------------------------

export type BlockKind = 'email' | 'domain'
export interface Block {
  kind: BlockKind
  value: string
  note: string
  createdAt: string
}

const EMAIL = /^[^\s@]{1,64}@[a-z0-9-]+(\.[a-z0-9-]+)+$/
const DOMAIN = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/

/** A typed address or domain made into a block: '@example.com' and 'example.com' are the domain. */
export function blockOf(raw: unknown): { kind: BlockKind; value: string } | null {
  if (typeof raw !== 'string') return null
  const v = raw.trim().toLowerCase()
  if (v.length < 3 || v.length > 254) return null
  if (EMAIL.test(v)) return { kind: 'email', value: v }
  const domain = v.replace(/^@/, '')
  return DOMAIN.test(domain) ? { kind: 'domain', value: domain } : null
}

export async function listBlocks(): Promise<Block[] | 'missing'> {
  const res = await rest('owner_blocks?select=kind,value,note,created_at&order=created_at.desc&limit=500')
  if (!res.ok) {
    if (isMissing(res.status, await res.text().catch(() => ''))) return 'missing'
    throw new StorageError(`supabase ${res.status}`)
  }
  return ((await res.json()) as { kind: BlockKind; value: string; note: string; created_at: string }[]).map((b) => ({ kind: b.kind, value: b.value, note: b.note, createdAt: b.created_at }))
}

export async function addBlock(raw: unknown, note: unknown): Promise<'ok' | 'bad' | 'missing'> {
  const block = blockOf(raw)
  if (!block) return 'bad'
  const text = typeof note === 'string' ? note.trim().slice(0, 200) : ''
  const res = await rest('owner_blocks?on_conflict=kind,value', {
    method: 'POST',
    headers: { prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ ...block, note: text }),
  })
  if (!res.ok) {
    if (isMissing(res.status, await res.text().catch(() => ''))) return 'missing'
    throw new StorageError(`supabase ${res.status}`)
  }
  return 'ok'
}

export async function removeBlock(kind: unknown, value: unknown): Promise<'ok' | 'bad' | 'missing'> {
  if ((kind !== 'email' && kind !== 'domain') || typeof value !== 'string' || !blockOf(value)) return 'bad'
  const res = await rest(`owner_blocks?kind=eq.${kind}&value=eq.${encodeURIComponent(value.trim().toLowerCase())}`, { method: 'DELETE', headers: { prefer: 'return=minimal' } })
  if (!res.ok) {
    if (isMissing(res.status, await res.text().catch(() => ''))) return 'missing'
    throw new StorageError(`supabase ${res.status}`)
  }
  return 'ok'
}
