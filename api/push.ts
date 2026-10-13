import { del, get, put } from '@vercel/blob'
import { allowedIds } from './_allow.js'
import { accountOf, requireApproved, sha256 } from './_account.js'
import { confirmMail, EMAIL, mailConfigured, sendMail, siteFrom, usingSandboxSender, APP_URL } from './_mail.js'
import { overLimit, tooMany } from './_rate.js'

/**
 * Push reminder subscriptions. The app registers its browser push subscription here and reports
 * when it was last studied; the daily cron (cron-reminder.ts) reminds those who haven't.
 *
 * POST /api/push  { action: 'save', subscription, tz, studiedDay?, streak, plan, group? }
 * POST /api/push  { action: 'remove', endpoint }
 *
 * Mail reminders (Resend, see _mail.ts; only for an approved account, and only after the address has
 * opened the link in the first mail):
 * POST /api/push  { action: 'email', email, tz, studiedDay?, streak, due, hour, …, update?, resend? }
 * POST /api/push  { action: 'email-status' | 'email-remove', email }
 * GET  /api/push?mail=status   → { available, sandbox }  (sandbox: still Resend's test sender; mails go to spam)
 * GET  /api/push?c=<token>     → confirms the address (a page)       GET/POST ?u=<token> → turns the mails off
 *
 * When SYNC_ALLOWED is set (see _allow.ts), only devices of a listed account or sync code (`group`)
 * may save a reminder, so strangers can't fill the store; removing one's own is always allowed.
 */
export interface PushRecord {
  /** A browser's push subscription; a record kept for mail reminders has `email` instead. */
  subscription?: { endpoint: string; keys: { p256dh: string; auth: string } }
  /** Mail reminders: the address, whether its owner opened the confirmation link, the link's secret, the account that owns it, and when a confirmation was last sent. */
  email?: string
  confirmed?: boolean
  token?: string
  owner?: string | null
  confirmSentAt?: number
  /** The site the address was registered from (its mails link there: each site has its own data in the browser). */
  site?: string
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
  /** Local hour (0–23) to remind at: the chosen time or the usual study hour; 20 when missing. */
  hour?: number
}

export async function recordPath(endpoint: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint))
  return `push/${[...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 40)}.json`
}

/**
 * The browsers' own push services: the server later POSTs to the saved address, so an address anyone could
 * make up (an internal host, a server that never answers) is not accepted.
 */
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /^android\.googleapis\.com$/, /(^|\.)push\.services\.mozilla\.com$/, /(^|\.)push\.apple\.com$/, /(^|\.)notify\.windows\.com$/]
export function isPushService(endpoint: string): boolean {
  try {
    const url = new URL(endpoint)
    return url.protocol === 'https:' && !url.port && PUSH_HOSTS.some((re) => re.test(url.hostname))
  } catch {
    return false
  }
}

const DAY = /^\d{4}-\d{2}-\d{2}$/
const isRange = (v: unknown): v is { from: string; to: string } =>
  !!v && typeof v === 'object' && DAY.test(String((v as { from?: unknown }).from)) && DAY.test(String((v as { to?: unknown }).to))

/** What a device reports about the day, every field checked and clamped. */
function stateFields(body: Record<string, unknown>) {
  return {
    tz: Number.isFinite(body.tz) ? Math.max(-840, Math.min(840, Number(body.tz))) : 0,
    studiedDay: typeof body.studiedDay === 'string' && DAY.test(body.studiedDay) ? body.studiedDay : null,
    streak: Number.isFinite(body.streak) ? Math.max(0, Math.floor(Number(body.streak))) : 0,
    plan: typeof body.plan === 'string' ? body.plan.slice(0, 200) : '',
    restWeekdays: Array.isArray(body.restWeekdays) ? body.restWeekdays.filter((d): d is number => Number.isInteger(d) && d >= 0 && d <= 6) : [],
    vacation: isRange(body.vacation) ? { from: body.vacation.from, to: body.vacation.to } : null,
    due: Number.isFinite(body.due) ? Math.max(0, Math.min(999, Math.floor(Number(body.due)))) : 0,
    reportedDay: typeof body.reportedDay === 'string' && DAY.test(body.reportedDay) ? body.reportedDay : null,
    hour: Number.isInteger(body.hour) && Number(body.hour) >= 0 && Number(body.hour) <= 23 ? Number(body.hour) : 20,
  }
}

/** Where an address's record is kept: the address itself never appears in a path. */
export async function mailKey(email: string): Promise<string> {
  return (await sha256(`mail:${email.trim().toLowerCase()}`)).slice(0, 40)
}
export const mailPath = (key: string) => `push/mail-${key}.json`

async function readRecord(path: string): Promise<PushRecord | null> {
  const blob = await get(path, { access: 'private', useCache: false }).catch(() => null)
  if (!blob || blob.statusCode !== 200 || !blob.stream) return null
  try {
    return JSON.parse(await new Response(blob.stream).text()) as PushRecord
  } catch {
    return null
  }
}

const writeRecord = (path: string, record: PushRecord) => put(path, JSON.stringify(record), { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json' })

const page = (title: string, text: string, status = 200, site = APP_URL) =>
  new Response(
    `<!doctype html><html lang="tr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:30rem;margin:15vh auto;padding:0 1.5rem;color:#1f2933"><h1 style="font-size:1.3rem">${title}</h1><p>${text}</p><p><a href="${site}">Diloloji'ye dön</a></p></body></html>`,
    { status, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } },
  )

/** `<key>.<token>`: the link in a mail finds its record and proves it was sent to its owner. */
const tokenParts = (raw: string | null) => {
  const m = /^([0-9a-f]{40})\.([0-9a-f]{24})$/.exec(raw ?? '')
  return m ? { key: m[1], token: m[2] } : null
}

export async function GET(request: Request): Promise<Response> {
  if (overLimit(request, 'push', 60)) return tooMany()
  const q = new URL(request.url).searchParams
  if (q.get('mail') === 'status') return Response.json({ available: mailConfigured(), sandbox: mailConfigured() && usingSandboxSender() }, { headers: { 'cache-control': 'no-store' } })
  const confirm = tokenParts(q.get('c'))
  const stop = tokenParts(q.get('u'))
  const link = confirm ?? stop
  // The page offers the way back to the site the link was opened on.
  const here = siteFrom(request.url) ?? APP_URL
  if (!link) return new Response('bad request', { status: 400 })
  const record = await readRecord(mailPath(link.key))
  if (!record || record.token !== link.token) return page('Bağlantı geçersiz', 'Bu bağlantının süresi dolmuş ya da adres zaten silinmiş.', 404, here)
  if (confirm) {
    await writeRecord(mailPath(link.key), { ...record, confirmed: true })
    return page('Onaylandı', 'Hatırlatma mailleri açıldı: o gün çalışmadıysan seçtiğin saatte kısa bir hatırlatma gelir. Her mailde kapatma bağlantısı var.', 200, here)
  }
  await del(mailPath(link.key)).catch(() => {})
  return page('Hatırlatmalar kapatıldı', 'Bu adrese artık mail göndermeyeceğiz ve adresin silindi.', 200, here)
}

/** The mail reminders: registering an address, its status, taking it out. */
async function handleMail(request: Request, body: Record<string, unknown>): Promise<Response> {
  if (!mailConfigured()) return Response.json({ error: 'not configured' }, { status: 503 })
  const denied = await requireApproved(request)
  if (denied) return denied
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  if (email.length > 254 || !EMAIL.test(email)) return Response.json({ error: 'bad email' }, { status: 400 })
  const owner = await accountOf(request)
  const key = await mailKey(email)
  const path = mailPath(key)
  const existing = await readRecord(path)
  // An address belongs to the account that registered it; the unsubscribe link in its mails is for anyone else.
  if (existing && (existing.owner ?? null) !== owner) return Response.json({ error: 'taken' }, { status: 409 })
  const state = existing ? (existing.confirmed ? 'on' : 'pending') : 'none'
  if (body.action === 'email-status') return Response.json({ state })
  if (body.action === 'email-remove') {
    if (existing) await del(path).catch(() => {})
    return new Response(null, { status: 204 })
  }
  if (!existing && body.update) return Response.json({ state: 'none' })
  const created = !existing
  const token = existing?.token ?? [...crypto.getRandomValues(new Uint8Array(12))].map((b) => b.toString(16).padStart(2, '0')).join('')
  const now = Date.now()
  // A new address gets its confirmation at once; a pending one again only when asked, and not within the hour.
  const sendConfirm = created || (!existing.confirmed && body.resend === true && now - (existing.confirmSentAt ?? 0) > 3_600_000)
  // Mails link to the site the learner is using now (it has their data); the record keeps it for the daily reminders.
  const site = siteFrom(request.headers.get('origin') ?? request.headers.get('referer')) ?? existing?.site ?? APP_URL
  const record: PushRecord = {
    ...stateFields(body),
    site,
    plan: '',
    email,
    owner,
    token,
    confirmed: existing?.confirmed ?? false,
    confirmSentAt: sendConfirm ? now : existing?.confirmSentAt,
    group: owner,
  }
  if (sendConfirm) {
    const sent = await sendMail([confirmMail(email, `${site}/api/push?c=${key}.${token}`, `${site}/api/push?u=${key}.${token}`)])
    if (!sent.sent) return Response.json({ error: 'send failed' }, { status: 502 })
  }
  await writeRecord(path, record)
  return Response.json({ state: record.confirmed ? 'on' : 'pending' })
}

export async function POST(request: Request): Promise<Response> {
  if (overLimit(request, 'push', 60)) return tooMany()
  // A mail client's one-click unsubscribe (RFC 8058): the link of the mail, called with POST.
  const stop = tokenParts(new URL(request.url).searchParams.get('u'))
  if (stop) {
    const record = await readRecord(mailPath(stop.key))
    if (record && record.token === stop.token) await del(mailPath(stop.key)).catch(() => {})
    return new Response(null, { status: 204 })
  }
  const text = await request.text()
  if (text.length > 4000) return new Response('too large', { status: 413 })
  let body: Record<string, unknown>
  try {
    body = JSON.parse(text)
  } catch {
    return new Response('bad json', { status: 400 })
  }
  if (body.action === 'email' || body.action === 'email-status' || body.action === 'email-remove') return handleMail(request, body)
  if (body.action === 'remove') {
    if (typeof body.endpoint !== 'string') return new Response('bad request', { status: 400 })
    await del(await recordPath(body.endpoint)).catch(() => {})
    return new Response(null, { status: 204 })
  }
  const sub = body.subscription as PushRecord['subscription'] | undefined
  if (body.action !== 'save' || !sub || typeof sub.endpoint !== 'string' || !isPushService(sub.endpoint) || !sub.keys?.p256dh || !sub.keys?.auth) {
    return new Response('bad request', { status: 400 })
  }
  const allowed = await allowedIds()
  if (allowed && !(typeof body.group === 'string' && allowed.has(body.group))) return new Response('not allowed', { status: 403 })
  const record: PushRecord = {
    subscription: { endpoint: sub.endpoint, keys: { p256dh: String(sub.keys.p256dh), auth: String(sub.keys.auth) } },
    ...stateFields(body),
    group: typeof body.group === 'string' && /^[0-9a-f]{64}$/.test(body.group) ? body.group : null,
    week: typeof body.week === 'string' ? body.week.slice(0, 200) : '',
  }
  await put(await recordPath(sub.endpoint), JSON.stringify(record), { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json' })
  return new Response(null, { status: 204 })
}
