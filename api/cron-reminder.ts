import { del, get, list } from '@vercel/blob'
import webpush from 'web-push'
import type { PushRecord } from './push.js'

/**
 * Every hour (vercel.json: one daily cron per UTC hour, `?h=` its hour, as the Hobby plan runs each
 * cron once a day and anywhere within its hour): a push reminder to the devices whose local hour is
 * their reminder hour (default 20:00) and whose learner hasn't studied today, on any of their synced
 * devices. Expired subscriptions are removed.
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

/** On the learner's Sunday, their week (reported in the last two days), unless they are on holiday. */
export function weeklyText(r: PushRecord, now: number): string | undefined {
  const day = localDay(r.tz, now)
  if (new Date(`${day}T12:00:00Z`).getUTCDay() !== 0 || !r.week) return undefined
  if (r.vacation && day >= r.vacation.from && day <= r.vacation.to) return undefined
  const yesterday = localDay(r.tz, now - 86_400_000)
  return r.reportedDay === day || r.reportedDay === yesterday ? r.week : undefined
}

/** A chosen rest day or a holiday: no reminder. */
export function resting(r: PushRecord, now: number): boolean {
  const day = localDay(r.tz, now)
  if (r.vacation && day >= r.vacation.from && day <= r.vacation.to) return true
  return !!r.restWeekdays?.includes(new Date(`${day}T12:00:00Z`).getUTCDay())
}

/** The learner's local hour (0–23) during UTC hour `utcHour`; `tz` as Date#getTimezoneOffset. */
export const localHour = (tz: number, utcHour: number) => Math.floor((((utcHour * 60 - tz) % 1440) + 1440) % 1440 / 60)

/** This run's reminders are for the devices whose reminder hour it is now where they are. */
export const dueNow = (r: PushRecord, utcHour: number) => localHour(r.tz, utcHour) === (r.hour ?? 20)

export async function GET(request: Request): Promise<Response> {
  if (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return new Response('unauthorized', { status: 401 })
  webpush.setVapidDetails('https://kelime-koc.vercel.app', PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY ?? '')
  const now = Date.now()
  const h = new URL(request.url).searchParams.get('h')
  const utcHour = h && /^\d{1,2}$/.test(h) && Number(h) <= 23 ? Number(h) : new Date(now).getUTCHours()

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
    if (!dueNow(r, utcHour)) continue
    // Sunday evening: the week in one line, studied today or not (not on a holiday).
    const week = weeklyText(r, now)
    if (!week && (r.studiedDay === localDay(r.tz, now) || (r.group && studiedGroups.has(r.group)) || resting(r, now))) continue
    try {
      const message = week ? { title: 'Haftan', body: week, url: '/?go=progress' } : { title: 'Kelime Koçu', body: reminderText(r, now), url: '/?go=quick' }
      await webpush.sendNotification(r.subscription, JSON.stringify(message), { TTL: 4 * 3600, urgency: 'normal' })
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
