import { quotaUsed, spendQuota, type QuotaStore } from './_quota.js'

/**
 * How much the social side is used, as small daily counters nobody can be picked out of: a whole-site count per day and
 * name (quota/use-<name>/<day>/all.json). Rough on purpose (two instances may each miss a count), and a failing store never
 * breaks the call that was counted. The owner reads them with the report tool (scripts/reports.mjs) to see whether the
 * friends side is used at all.
 */
export const USE_NAMES = ['friend-request', 'friend-add', 'friend-cheer', 'friend-nudge', 'friend-gift', 'friend-text', 'friend-joined', 'report'] as const
export type UseName = (typeof USE_NAMES)[number]

/** Counts one use today (never throws, not awaited by callers that do not need it). */
export function countUse(name: UseName, store?: QuotaStore): Promise<void> {
  return spendQuota(`use-${name}`, 'all', 1, store)
}

const dayOf = (now: number, back: number) => new Date(now - back * 86_400_000).toISOString().slice(0, 10)

/** The last `days` days (today first) of every counter: { 'friend-send': { '2026-11-02': 14, … }, … }. */
export async function usageLast(days: number, store?: QuotaStore, now = Date.now()): Promise<Record<UseName, Record<string, number>>> {
  const out = Object.fromEntries(USE_NAMES.map((n) => [n, {} as Record<string, number>])) as Record<UseName, Record<string, number>>
  await Promise.all(
    USE_NAMES.flatMap((name) =>
      Array.from({ length: days }, (_, back) => back).map(async (back) => {
        const used = await quotaUsed(`use-${name}`, 'all', store, now - back * 86_400_000)
        if (used > 0) out[name][dayOf(now, back)] = used
      }),
    ),
  )
  return out
}
