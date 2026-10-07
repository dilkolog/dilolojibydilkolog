import { del, put } from '@vercel/blob'
import { allowedIds } from './_allow.js'

/**
 * Push reminder subscriptions. The app registers its browser push subscription here and reports
 * when it was last studied; the daily cron (cron-reminder.ts) reminds those who haven't.
 *
 * POST /api/push  { action: 'save', subscription, tz, studiedDay?, streak, plan, group? }
 * POST /api/push  { action: 'remove', endpoint }
 *
 * When SYNC_ALLOWED is set (see _allow.ts), only devices of a listed account or sync code (`group`)
 * may save a reminder, so strangers can't fill the store; removing one's own is always allowed.
 */
export interface PushRecord {
  subscription: { endpoint: string; keys: { p256dh: string; auth: string } }
  /** Minutes, as Date#getTimezoneOffset (TR: -180). */
  tz: number
  /** Local YYYY-MM-DD of the last day with answers. */
  studiedDay: string | null
  streak: number
  plan: string
  /** Devices sharing a sync code: studying on any of them counts for all. */
  group: string | null
  /** No reminder on these weekdays (Date#getDay) or during the holiday. */
  restWeekdays?: number[]
  vacation?: { from: string; to: string } | null
  /** Reviews waiting on studiedDay's report day; 0 when unknown. */
  due?: number
  /** Local day the `due` count was reported. */
  reportedDay?: string | null
  /** The learner's week in one line (written on the device), for Sunday evening. */
  week?: string
}

export async function recordPath(endpoint: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint))
  return `push/${[...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 40)}.json`
}

const DAY = /^\d{4}-\d{2}-\d{2}$/
const isRange = (v: unknown): v is { from: string; to: string } =>
  !!v && typeof v === 'object' && DAY.test(String((v as { from?: unknown }).from)) && DAY.test(String((v as { to?: unknown }).to))

export async function POST(request: Request): Promise<Response> {
  const text = await request.text()
  if (text.length > 4000) return new Response('too large', { status: 413 })
  let body: Record<string, unknown>
  try {
    body = JSON.parse(text)
  } catch {
    return new Response('bad json', { status: 400 })
  }
  if (body.action === 'remove') {
    if (typeof body.endpoint !== 'string') return new Response('bad request', { status: 400 })
    await del(await recordPath(body.endpoint)).catch(() => {})
    return new Response(null, { status: 204 })
  }
  const sub = body.subscription as PushRecord['subscription'] | undefined
  if (body.action !== 'save' || !sub || typeof sub.endpoint !== 'string' || !sub.endpoint.startsWith('https://') || !sub.keys?.p256dh || !sub.keys?.auth) {
    return new Response('bad request', { status: 400 })
  }
  const allowed = await allowedIds()
  if (allowed && !(typeof body.group === 'string' && allowed.has(body.group))) return new Response('not allowed', { status: 403 })
  const record: PushRecord = {
    subscription: { endpoint: sub.endpoint, keys: { p256dh: String(sub.keys.p256dh), auth: String(sub.keys.auth) } },
    tz: Number.isFinite(body.tz) ? Math.max(-840, Math.min(840, Number(body.tz))) : 0,
    studiedDay: typeof body.studiedDay === 'string' && DAY.test(body.studiedDay) ? body.studiedDay : null,
    streak: Number.isFinite(body.streak) ? Math.max(0, Math.floor(Number(body.streak))) : 0,
    plan: typeof body.plan === 'string' ? body.plan.slice(0, 200) : '',
    group: typeof body.group === 'string' && /^[0-9a-f]{64}$/.test(body.group) ? body.group : null,
    restWeekdays: Array.isArray(body.restWeekdays) ? body.restWeekdays.filter((d): d is number => Number.isInteger(d) && d >= 0 && d <= 6) : [],
    vacation: isRange(body.vacation) ? { from: body.vacation.from, to: body.vacation.to } : null,
    due: Number.isFinite(body.due) ? Math.max(0, Math.min(999, Math.floor(Number(body.due)))) : 0,
    reportedDay: typeof body.reportedDay === 'string' && DAY.test(body.reportedDay) ? body.reportedDay : null,
    week: typeof body.week === 'string' ? body.week.slice(0, 200) : '',
  }
  await put(await recordPath(sub.endpoint), JSON.stringify(record), { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json' })
  return new Response(null, { status: 204 })
}
