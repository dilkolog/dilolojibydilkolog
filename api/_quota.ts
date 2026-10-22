import { accountOf, readText, writeJson } from './_account.js'

/**
 * A daily allowance per account for what costs the owner a shared quota (DeepL's monthly characters): sign-up is
 * open, so without it one account (or a script with one) could use up the month for everyone.
 *
 * The count is a small file per account and day (quota/<name>/<day>/<id>.json). This instance remembers what it
 * last read or wrote, so a busy reader costs one write per call and a read only now and then. Two instances may
 * each count a few calls the other did not see: the allowance is approximate, a fence and not a meter.
 * A failing store lets the call through (the allowance must never take translation down).
 */
export interface QuotaStore {
  read(path: string): Promise<string | null>
  write(path: string, value: unknown): Promise<void>
}

const blobStore: QuotaStore = { read: readText, write: writeJson }

/** Characters of translation one account may ask for in a day (UTC). DeepL's free month is 500,000. */
export const DAILY_TRANSLATE_CHARS = 20_000

/** How long a count read from the store is trusted before it is read again (other instances count too). */
const FRESH_MS = 60_000

const known = new Map<string, { used: number; at: number }>()
export const resetQuota = () => known.clear()

const today = (now: number) => new Date(now).toISOString().slice(0, 10)
const pathOf = (name: string, id: string, now: number) => `quota/${name}/${today(now)}/${id}.json`

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

/** Whether `amount` more fits into today's allowance of the account. */
export async function quotaLeft(name: string, id: string, amount: number, max: number, store = blobStore, now = Date.now()): Promise<boolean> {
  try {
    return (await usedNow(pathOf(name, id, now), store, now)) + amount <= max
  } catch {
    return true
  }
}

/** Counts `amount` against today's allowance (after the call it paid for went through). */
export async function spendQuota(name: string, id: string, amount: number, store = blobStore, now = Date.now()): Promise<void> {
  const path = pathOf(name, id, now)
  try {
    const used = (await usedNow(path, store, now)) + amount
    known.set(path, { used, at: known.get(path)?.at ?? now })
    await store.write(path, { used })
  } catch {
    // Not counted this once: better than failing a translation that already cost.
  }
}

/** Calls a day per account to the endpoints that fetch from other sites (YouTube, news, programmes): each call costs
 * several outbound requests, and YouTube's search has a small daily quota shared by everyone. */
export const DAILY_CALLS = { clips: 60, youtube: 40, news: 150, listen: 150, share: 30 } as const

/**
 * For an endpoint that costs per call: counts the call against the account's day and says whether it is over
 * (then it is not counted). No account (local development) is never over.
 */
export async function overDaily(request: Request, name: keyof typeof DAILY_CALLS, store = blobStore, now = Date.now()): Promise<boolean> {
  const id = await accountOf(request).catch(() => null)
  if (!id) return false
  if (!(await quotaLeft(name, id, 1, DAILY_CALLS[name], store, now))) return true
  await spendQuota(name, id, 1, store, now)
  return false
}

export const dailyQuotaReached = () =>
  Response.json({ error: 'daily_quota' }, { status: 429, headers: { 'retry-after': '3600', 'cache-control': 'no-store' } })

