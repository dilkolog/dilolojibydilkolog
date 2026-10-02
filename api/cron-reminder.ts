import { del, get, list } from '@vercel/blob'
import webpush from 'web-push'
import type { PushRecord } from './push.js'

/**
 * Daily (vercel.json cron, ~20:00 Turkey time): a push reminder to every device whose learner
 * hasn't studied today, on any of their synced devices. Expired subscriptions are removed.
 */
const PUBLIC_KEY = 'BB1ttPY6-CMNk_Zl7lmm6aJuyxi0cIHr6TUagJ0u_Fpjt3YdaK6vM6c2koor8osB4pIXbPbv57X7TUBmJOhuCIg'

const localDay = (tz: number, now: number) => new Date(now - tz * 60_000).toISOString().slice(0, 10)

export function reminderText(r: PushRecord, now: number): string {
  const yesterday = localDay(r.tz, now - 86_400_000)
  const today = localDay(r.tz, now)
  // A count reported yesterday is still a fair lower bound for today.
  const due = r.due && (r.reportedDay === today || r.reportedDay === yesterday) ? r.due : 0
  const parts = [
    r.streak > 0 && r.studiedDay === yesterday ? `🔥 ${r.streak} günlük serin var.` : '',
    due > 0 ? `🌱 ${due} kelimen solmak üzere: ${Math.max(2, Math.min(5, Math.round(due / 3)))} dakikalık hızlı tekrar yeter.` : 'Bugünkü kelime çalışman seni bekliyor.',
  ].filter(Boolean)
  return r.plan ? `${r.plan}: ${parts.join(' ')}` : parts.join(' ')
}

/** A chosen rest day or a holiday: no reminder. */
export function resting(r: PushRecord, now: number): boolean {
  const day = localDay(r.tz, now)
  if (r.vacation && day >= r.vacation.from && day <= r.vacation.to) return true
  return !!r.restWeekdays?.includes(new Date(`${day}T12:00:00Z`).getUTCDay())
}

export async function GET(request: Request): Promise<Response> {
  if (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return new Response('unauthorized', { status: 401 })
  webpush.setVapidDetails('https://kelime-koc.vercel.app', PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY ?? '')
  const now = Date.now()

  const records: { path: string; record: PushRecord }[] = []
  let cursor: string | undefined
  do {
    const page = await list({ prefix: 'push/', cursor })
    for (const b of page.blobs) {
      const res = await get(b.pathname, { access: 'private', useCache: false }).catch(() => null)
      if (!res || res.statusCode !== 200 || !res.stream) continue
      try {
        records.push({ path: b.pathname, record: JSON.parse(await new Response(res.stream).text()) as PushRecord })
      } catch {
        // A broken record is skipped.
      }
    }
    cursor = page.hasMore ? page.cursor : undefined
  } while (cursor)

  const studiedGroups = new Set(records.filter(({ record: r }) => r.group && r.studiedDay === localDay(r.tz, now)).map(({ record: r }) => r.group))
  let sent = 0
  let removed = 0
  for (const { path, record: r } of records) {
    if (r.studiedDay === localDay(r.tz, now) || (r.group && studiedGroups.has(r.group)) || resting(r, now)) continue
    try {
      await webpush.sendNotification(r.subscription, JSON.stringify({ title: 'Kelime Koçu', body: reminderText(r, now), url: '/?go=quick' }), { TTL: 4 * 3600, urgency: 'normal' })
      sent++
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) {
        await del(path).catch(() => {})
        removed++
      }
    }
  }
  return Response.json({ devices: records.length, sent, removed })
}
