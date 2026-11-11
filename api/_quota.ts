import { accountOf, readText, writeJson } from './_account.js'
import { rest, supabaseOn } from './_supabase.js'

/**
 * A daily allowance per account for what costs the owner a shared quota (DeepL's monthly characters, the AI's money):
 * without it one account (or a script with one) could use up the month for everyone. The same counters keep the
 * site-wide usage and notice counts (`_usage.ts`, `_reports.ts`, `_signupNotice.ts`).
 *
 * Where the counts live:
 * - **Supabase** (`usage_counters`, migration 0009): exact. A check and its count are one statement (`counter_take`),
 *   so two requests at once cannot both slip under the line, and every instance sees the same number.
 * - **R2 files** (quota/<name>/<day>/<id>.json) until 0009 has run, without Supabase (local development), or when a test
 *   passes its own store: approximate. This instance remembers what it last read or wrote, so two instances may each
 *   count a few calls the other did not see.
 * A failing store lets the call through for the free or cheap services (translation, speech, the fetching endpoints):
 * the allowance must never take them down. The AI is the owner's money, so it uses `quotaReserve`, which refuses instead.
 */
export interface QuotaStore {
  read(path: string): Promise<string | null>
  write(path: string, value: unknown): Promise<void>
}

const blobStore: QuotaStore = { read: readText, write: writeJson }

/** Characters of translation one account may ask for in a day (UTC). DeepL's free month is 500,000. */
export const DAILY_TRANSLATE_CHARS = 20_000

/** Characters of natural-voice speech (Google Cloud TTS) one account may ask for in a day: Neural2 and WaveNet have 1,000,000 free characters a month. */
export const DAILY_TTS_CHARS = 8_000

/** How long a count read from the store is trusted before it is read again (other instances count too). */
const FRESH_MS = 60_000

const known = new Map<string, { used: number; at: number }>()
export const resetQuota = () => known.clear()

const today = (now: number) => new Date(now).toISOString().slice(0, 10)
const pathOf = (name: string, id: string, now: number) => `quota/${name}/${today(now)}/${id}.json`

// --- Supabase counters ---------------------------------------------------------------------------------------------

/** After the functions turned out missing (0009 not run yet), the files are used and the table asked again later. */
const MISSING_MS = 5 * 60_000
let missingUntil = 0
export const resetCounterTable = () => void (missingUntil = 0)

/** Whether this call should count in Supabase: it is set up, the default store is asked for, and 0009 is not known missing. */
const inTable = (store: QuotaStore, now: number) => store === blobStore && supabaseOn() && now >= missingUntil

class Missing extends Error {}

/** Calls one of the counter functions; a missing function marks the table as not there yet (the caller falls back). */
async function counter<T>(fn: string, args: Record<string, unknown>, now: number): Promise<T> {
  const res = await rest(`rpc/${fn}`, { method: 'POST', body: JSON.stringify(args) })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    // PostgREST answers 404 / PGRST202 for an unknown function (and 42883 from Postgres): 0009 has not run.
    if (res.status === 404 || /PGRST202|42883/.test(body)) {
      missingUntil = now + MISSING_MS
      throw new Missing(fn)
    }
    throw new Error(`supabase ${res.status}`)
  }
  return (await res.json()) as T
}

async function usedNow(path: string, store: QuotaStore, now: number): Promise<number> {
  const hit = known.get(path)
  if (hit && now - hit.at < FRESH_MS) return hit.used
  const raw = await store.read(path)
  const stored = raw ? Number((JSON.parse(raw) as { used?: unknown }).used) : 0
  // This instance may have counted calls the store has not seen yet (a write in flight): keep the larger.
  const used = Math.max(Number.isFinite(stored) ? stored : 0, hit?.used ?? 0)
  if (known.size > 5000) known.clear()
  known.set(path, { used, at: now })
  return used
}

/** What the account has used of today's allowance (0 when the store cannot be read). */
export async function quotaUsed(name: string, id: string, store = blobStore, now = Date.now()): Promise<number> {
  if (inTable(store, now)) {
    try {
      return Number(await counter<number>('counter_used', { p_name: name, p_subject: id, p_day: today(now) }, now)) || 0
    } catch (e) {
      if (!(e instanceof Missing)) return 0
    }
  }
  try {
    return await usedNow(pathOf(name, id, now), store, now)
  } catch {
    return 0
  }
}

/** Whether `amount` more fits into today's allowance of the account. */
export async function quotaLeft(name: string, id: string, amount: number, max: number, store = blobStore, now = Date.now()): Promise<boolean> {
  if (inTable(store, now)) {
    try {
      return Number(await counter<number>('counter_used', { p_name: name, p_subject: id, p_day: today(now) }, now)) + amount <= max
    } catch (e) {
      if (!(e instanceof Missing)) return true
    }
  }
  try {
    return (await usedNow(pathOf(name, id, now), store, now)) + amount <= max
  } catch {
    return true
  }
}

/** Counts `amount` against today's allowance (after the call it paid for went through). */
export async function spendQuota(name: string, id: string, amount: number, store = blobStore, now = Date.now()): Promise<void> {
  if (inTable(store, now)) {
    try {
      await counter<number>('counter_add', { p_name: name, p_subject: id, p_amount: amount, p_day: today(now) }, now)
      return
    } catch (e) {
      // Not counted this once (Supabase unreachable): better than failing a call that already cost.
      if (!(e instanceof Missing)) return
    }
  }
  const path = pathOf(name, id, now)
  try {
    const used = (await usedNow(path, store, now)) + amount
    known.set(path, { used, at: known.get(path)?.at ?? now })
    await store.write(path, { used })
  } catch {
    // Not counted this once: better than failing a translation that already cost.
  }
}

/**
 * Takes `amount` from today's allowance if it still fits, and says whether it did. In Supabase the check and the count
 * are one statement (exact under concurrent requests); in the files it is the check followed by the count.
 */
export async function quotaTake(name: string, id: string, amount: number, max: number, store = blobStore, now = Date.now()): Promise<boolean> {
  if (inTable(store, now)) {
    try {
      return (await counter<boolean>('counter_take', { p_name: name, p_subject: id, p_amount: amount, p_max: max, p_day: today(now) }, now)) === true
    } catch (e) {
      if (!(e instanceof Missing)) return true
    }
  }
  if (!(await quotaLeft(name, id, amount, max, store, now))) return false
  await spendQuota(name, id, amount, store, now)
  return true
}

/** The counter store could not answer (`quotaReserve` refuses then, where the other calls let the request through). */
export class QuotaUnavailable extends Error {}

/**
 * Like `quotaTake`, but closed when the store fails: for what costs the owner money (the AI), a counter that cannot be
 * read must not mean "unlimited". Throws QuotaUnavailable then; false when the amount does not fit.
 */
export async function quotaReserve(name: string, id: string, amount: number, max: number, store = blobStore, now = Date.now()): Promise<boolean> {
  if (inTable(store, now)) {
    try {
      return (await counter<boolean>('counter_take', { p_name: name, p_subject: id, p_amount: amount, p_max: max, p_day: today(now) }, now)) === true
    } catch (e) {
      if (!(e instanceof Missing)) throw new QuotaUnavailable(name)
    }
  }
  const path = pathOf(name, id, now)
  let used: number
  try {
    used = await usedNow(path, store, now)
  } catch {
    throw new QuotaUnavailable(name)
  }
  if (used + amount > max) return false
  // The files are approximate anyway (see above); a failed write here is counted in this instance's memory at least.
  known.set(path, { used: used + amount, at: known.get(path)?.at ?? now })
  await store.write(path, { used: used + amount }).catch(() => {})
  return true
}

/**
 * Gives back part of what `quotaReserve` or `quotaTake` took (the call failed, or cost less than was set aside).
 * Never below zero. A failure is ignored: the account then has a little less left today, never more.
 */
export async function quotaGiveBack(name: string, id: string, amount: number, store = blobStore, now = Date.now()): Promise<void> {
  if (!(amount > 0)) return
  if (inTable(store, now)) {
    // Called directly, not through counter(): an old project without counter_give (migration 0013) must not switch every
    // counter back to the files.
    await rest('rpc/counter_give', { method: 'POST', body: JSON.stringify({ p_name: name, p_subject: id, p_amount: amount, p_day: today(now) }) }).catch(() => null)
    return
  }
  const path = pathOf(name, id, now)
  try {
    const used = Math.max(0, (await usedNow(path, store, now)) - amount)
    known.set(path, { used, at: known.get(path)?.at ?? now })
    await store.write(path, { used })
  } catch {
    // Not given back this once.
  }
}

/** Drops counters older than `keepDays` (the hourly job); nothing to do for the files, which are per day already. */
export async function pruneCounters(keepDays = 120, now = Date.now()): Promise<number> {
  if (!inTable(blobStore, now)) return 0
  try {
    return Number(await counter<number>('counter_prune', { p_keep_days: keepDays }, now)) || 0
  } catch {
    return 0
  }
}

/** Calls a day per account to the endpoints that fetch from other sites (YouTube, news, programmes): each call costs
 * several outbound requests, and YouTube's search has a small daily quota shared by everyone. */
export const DAILY_CALLS = { clips: 60, youtube: 40, news: 150, page: 40, listen: 150, share: 30, assess: 60 } as const

/**
 * For an endpoint that costs per call: counts the call against the account's day and says whether it is over
 * (then it is not counted). No account (local development) is never over.
 */
export async function overDaily(request: Request, name: keyof typeof DAILY_CALLS, store = blobStore, now = Date.now()): Promise<boolean> {
  const id = await accountOf(request).catch(() => null)
  if (!id) return false
  return !(await quotaTake(name, id, 1, DAILY_CALLS[name], store, now))
}

export const dailyQuotaReached = () =>
  Response.json({ error: 'daily_quota' }, { status: 429, headers: { 'retry-after': '3600', 'cache-control': 'no-store' } })

