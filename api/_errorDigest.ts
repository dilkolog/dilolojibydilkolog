import { readText, writeJson } from './_account.js'
import { APP_URL, EMAIL, mailConfigured, sendMail, type Mail } from './_mail.js'
import { escapeHtml, mailLayout, paragraph } from './_mailLayout.js'

/**
 * The week's most frequent errors, mailed to the owner on Monday. Errors come from two places: the browsers' own
 * reports (api/log.ts) and the Worker's uncaught errors (worker/index.ts). Each is counted under a signature (the
 * message with its numbers and ids blurred) in one small file per week, `errors/<monday>.json`; nothing else is kept
 * and no person is attached (the reports were scrubbed on the device). The counts are approximate on purpose: a
 * busy minute is written once (see FLUSH_MS) and two Workers writing at once may lose a count.
 *
 * Needs `ERROR_DIGEST_TO` (the owner's address) and the mail key; without them the errors are still counted and
 * the digest is just not sent.
 */

export type ErrorKind = 'client' | 'worker'

export interface ErrorItem {
  n: number
  kind: ErrorKind
  name: string
  message: string
  where: string
  first: string
  last: string
}

export interface ErrorWeek {
  /** The Monday (UTC) the week begins, YYYY-MM-DD. */
  week: string
  items: Record<string, ErrorItem>
  /** When the digest of this week went out. */
  sentAt?: string
}

/** Different errors kept per week: a flood of unique messages must not grow the file without end. */
export const MAX_ITEMS = 150
/** Errors are written at most this often per Worker instance (the ones in between are counted in memory and go along). */
export const FLUSH_MS = 10_000
export const TOP = 5

const DAY = 86_400_000

/** The Monday (UTC) of the week `ms` falls in. */
export function weekStart(ms: number): string {
  const d = new Date(ms)
  const sinceMonday = (d.getUTCDay() + 6) % 7
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - sinceMonday * DAY).toISOString().slice(0, 10)
}

export const weekPath = (week: string) => `errors/${week}.json`

/** The message with what varies from one occurrence to the next (numbers, ids, long hex) blurred, so the same error counts as one. */
export function blur(message: string): string {
  return message
    .toLowerCase()
    .replace(/\b[0-9a-f]{8,}\b/g, '…')
    .replace(/\d+/g, '#')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
}

export const signature = (kind: ErrorKind, name: string, message: string, where: string) => `${kind}|${name.slice(0, 40)}|${blur(message)}|${where.slice(0, 30)}`.slice(0, 220)

const clip = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/\p{Cc}/gu, ' ').slice(0, max) : '')

const pending = new Map<string, { item: ErrorItem; n: number }>()
let lastFlush = 0

/** Counts an error. Never throws: an error report must not make an error of its own. */
export async function noteError(kind: ErrorKind, report: { name?: unknown; message?: unknown; where?: unknown }, now = Date.now()): Promise<void> {
  try {
    const name = clip(report.name, 40)
    const message = clip(report.message, 200)
    const where = clip(report.where, 30)
    if (!name && !message) return
    const sig = signature(kind, name, message, where)
    const at = new Date(now).toISOString()
    const seen = pending.get(sig)
    if (seen) {
      seen.n++
      seen.item.last = at
    } else if (pending.size < MAX_ITEMS) pending.set(sig, { item: { n: 0, kind, name, message, where, first: at, last: at }, n: 1 })
    if (now - lastFlush >= FLUSH_MS) await flushErrors(now)
  } catch {
    // Counting is best effort.
  }
}

/** Writes what has been counted into the current week's file. */
export async function flushErrors(now = Date.now()): Promise<void> {
  lastFlush = now
  if (!pending.size) return
  const batch = [...pending]
  pending.clear()
  const path = weekPath(weekStart(now))
  try {
    const stored = await readText(path)
    const file: ErrorWeek = stored ? (JSON.parse(stored) as ErrorWeek) : { week: weekStart(now), items: {} }
    for (const [sig, { item, n }] of batch) {
      const have = file.items[sig]
      if (have) {
        have.n += n
        have.last = item.last
      } else if (Object.keys(file.items).length < MAX_ITEMS) file.items[sig] = { ...item, n }
    }
    await writeJson(path, file)
  } catch {
    // The storage is down: these counts are lost, the errors themselves are still in the Workers logs.
  }
}

/** The most frequent errors of a week, most first. */
export function topErrors(file: ErrorWeek, count = TOP): ErrorItem[] {
  return Object.values(file.items)
    .sort((a, b) => b.n - a.n || b.last.localeCompare(a.last))
    .slice(0, count)
}

const label = (e: ErrorItem) => `${e.kind === 'client' ? 'Tarayıcı' : 'Sunucu'}${e.where ? ` · ${e.where}` : ''}`
const dayOf = (iso: string) => iso.slice(0, 10)

/** The digest as a mail to the owner (every error text escaped: the browsers' reports are written by whoever sends them). */
export function digestMail(to: string, file: ErrorWeek, site = APP_URL): Mail {
  const top = topErrors(file)
  const total = Object.values(file.items).reduce((sum, e) => sum + e.n, 0)
  const kinds = Object.keys(file.items).length
  const intro = `${file.week} haftasında ${total} hata kaydı, ${kinds} farklı hata. En sık görülen ${top.length}:`
  const rows = top
    .map((e) => `<tr><td style="padding:8px 10px 8px 0;vertical-align:top;font-weight:700;white-space:nowrap">${e.n}×</td><td style="padding:8px 0;vertical-align:top;font-size:14px;line-height:1.5"><strong>${escapeHtml(e.name || 'Hata')}</strong>: ${escapeHtml(e.message)}<br><span style="font-size:12px;opacity:.7">${escapeHtml(label(e))} · ${dayOf(e.first)} → ${dayOf(e.last)}</span></td></tr>`)
    .join('')
  return {
    to,
    subject: `Diloloji: haftanın en sık ${top.length} hatası`,
    html: mailLayout({
      preheader: intro,
      title: 'Haftanın hataları',
      mascot: 'think',
      body: `${paragraph(escapeHtml(intro))}<table role="presentation" cellpadding="0" cellspacing="0" width="100%" class="m-ink">${rows}</table>${paragraph('Ayrıntı (yığın izi) için Cloudflare → Workers &amp; Pages → diloloji → Logs içinde <code>[client-error]</code> ya da <code>[worker-error]</code> ara.')}`,
      footer: 'Bu özet yalnızca site sahibine gider (ERROR_DIGEST_TO). Sayılar yaklaşıktır.',
      site,
    }),
    text: `${intro}\n\n${top.map((e) => `${e.n}× ${e.name || 'Hata'}: ${e.message}\n   ${label(e)} · ${dayOf(e.first)} → ${dayOf(e.last)}`).join('\n')}\n\nAyrıntı için Cloudflare Logs'ta [client-error] / [worker-error] ara.`,
  }
}

export type DigestResult = 'sent' | 'off' | 'none' | 'already' | 'failed'

/** Mails last week's digest once (Monday; later runs find `sentAt` and leave it). */
export async function sendErrorDigest(now = Date.now()): Promise<DigestResult> {
  const to = process.env.ERROR_DIGEST_TO?.trim()
  if (!to || !EMAIL.test(to) || !mailConfigured()) return 'off'
  const week = weekStart(now - 7 * DAY)
  const stored = await readText(weekPath(week))
  if (!stored) return 'none'
  const file = JSON.parse(stored) as ErrorWeek
  if (file.sentAt) return 'already'
  if (!Object.keys(file.items).length) return 'none'
  const { sent } = await sendMail([digestMail(to, file)])
  if (!sent) return 'failed'
  await writeJson(weekPath(week), { ...file, sentAt: new Date(now).toISOString() })
  return 'sent'
}
