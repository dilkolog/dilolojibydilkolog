import webpush from 'web-push'
import type { PushRecord } from './push.js'
import { APP_URL, mailConfigured, reminderMail, sendMail, siteFrom, type Mail } from './_mail.js'
import { VAPID_PUBLIC_KEY } from './_notify.js'
import { dueNow, localHour } from './_due.js'
import { reminderStore } from './_reminders.js'

/**
 * Every hour (vercel.json: one daily cron per UTC hour, `?h=` its hour, as the Hobby plan runs each
 * cron once a day and anywhere within its hour): a push reminder (and a mail, to the confirmed addresses
 * of mail records; see _reminders.ts for where they are kept) to the devices whose local hour is
 * their reminder hour (default 20:00) and whose learner hasn't studied today, on any of their synced
 * devices. Expired subscriptions are removed.
 */

const localDay = (tz: number, now: number) => new Date(now - tz * 60_000).toISOString().slice(0, 10)

export function reminderText(r: PushRecord, now: number): string {
  const yesterday = localDay(r.tz, now - 86_400_000)
  const today = localDay(r.tz, now)
  // A count reported yesterday is still a fair lower bound for today.
  const due = r.due && (r.reportedDay === today || r.reportedDay === yesterday) ? r.due : 0
  const parts = [
    r.streak > 0 && r.studiedDay === yesterday ? `🔥 ${r.streak} günlük serin var.` : '',
    due > 0 ? `🌱 ${due} kelimen solmak üzere: ${Math.max(2, Math.min(5, Math.round(due / 3)))} dakikalık hızlı tekrar yeter.` : 'Bugünkü kelime çalışman seni bekliyor.',
    // A word missed lately, to recall before opening the app (reported today or yesterday, like the count).
    r.word && (r.reportedDay === today || r.reportedDay === yesterday) ? `🧠 “${r.word}” ne demekti?` : '',
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

export { dueNow, localHour }

/** Notifications sent at a time, and how long one send may take. */
const BATCH = 10
const SEND_TIMEOUT_MS = 5000

export async function GET(request: Request): Promise<Response> {
  if (!process.env.CRON_SECRET || request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) return new Response('unauthorized', { status: 401 })
  const pushOn = !!process.env.VAPID_PRIVATE_KEY
  const mailOn = mailConfigured()
  // Without either key every send would fail the same way: said once, not a 500 after the first call.
  if (!pushOn && !mailOn) return new Response('VAPID_PRIVATE_KEY and RESEND_API_KEY are not set', { status: 503 })
  if (pushOn) webpush.setVapidDetails('https://diloloji.com', VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY!)
  const now = Date.now()
  const h = new URL(request.url).searchParams.get('h')
  const utcHour = h && /^\d{1,2}$/.test(h) && Number(h) <= 23 ? Number(h) : new Date(now).getUTCHours()

  const store = await reminderStore()
  // Blob: only the records due in this hour (an index per hour); tables: all of them.
  const records = await store.due(utcHour)

  const studiedGroups = new Set(records.filter(({ record: r }) => r.group && r.studiedDay === localDay(r.tz, now)).map(({ record: r }) => r.group))
  let sent = 0
  let removed = 0
  let mailed = 0
  const mails: Mail[] = []
  const due = records.filter(({ record: r }) => dueNow(r, utcHour)).flatMap(({ key, record: r }) => {
    // Sunday evening: the week in one line, studied today or not (not on a holiday). Mail has no week line:
    // it carries only what the server can build from numbers.
    const week = r.email ? undefined : weeklyText(r, now)
    if (!week && (r.studiedDay === localDay(r.tz, now) || (r.group && studiedGroups.has(r.group)) || resting(r, now))) return []
    if (r.email) {
      // An address nobody has confirmed gets nothing.
      if (mailOn && r.confirmed && r.token) {
        const site = siteFrom(r.site) ?? APP_URL
        mails.push(reminderMail(r.email, reminderText({ ...r, plan: '', word: '' }, now), `${site}/api/push?u=${key.replace(/^mail-/, '')}.${r.token}`, site))
      }
      return []
    }
    if (!pushOn || !r.subscription) return []
    return [{ key, r, subscription: r.subscription, message: week ? { title: 'Haftan', body: week, url: '/?go=progress' } : { title: 'Diloloji', body: reminderText(r, now), url: '/?go=quick' } }]
  })
  // In parallel batches, each send with a time limit: one address that never answers must not stall the rest.
  for (let i = 0; i < due.length; i += BATCH) {
    await Promise.all(
      due.slice(i, i + BATCH).map(async ({ key, subscription, message }) => {
        try {
          await webpush.sendNotification(subscription, JSON.stringify(message), { TTL: 4 * 3600, urgency: 'normal', timeout: SEND_TIMEOUT_MS })
          sent++
        } catch (e) {
          const status = (e as { statusCode?: number }).statusCode
          if (status === 404 || status === 410) {
            await store.remove(key).catch(() => {})
            removed++
          }
        }
      }),
    )
  }
  if (mails.length) mailed = (await sendMail(mails)).sent
  return Response.json({ devices: records.length, sent, removed, mailed })
}
