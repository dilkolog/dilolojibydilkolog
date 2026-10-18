import { useEffect } from 'react'
import type { Settings } from '../data/db'
import { db } from '../data/instance'
import { displayForm } from '../engine/exercises'
import { isRetired } from '../engine/retire'
import { prefs } from './prefs'

const LAST_KEY = 'kelime-koc:last-reminder'

export const notificationsSupported = () => typeof window !== 'undefined' && 'Notification' in window

export async function requestNotifications(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return 'denied'
  return Notification.permission === 'default' ? Notification.requestPermission() : Notification.permission
}

/** The reminder text: the streak at stake and, when there are any, the words about to fade. */
export function reminderBody(streak: number, plan = '', due = 0): string {
  const parts = [
    streak > 0 ? `🔥 ${streak} günlük serin var.` : '',
    due > 0 ? `🌱 ${due} kelimen solmak üzere: ${Math.max(2, Math.min(5, Math.round(due / 3)))} dakikalık hızlı tekrar yeter.` : 'Bugünkü kelime çalışman seni bekliyor.',
  ].filter(Boolean)
  const base = parts.join(' ')
  return plan ? `${plan}: ${base}` : base
}

/** One due word as a question for the reminder (micro-retrieval), the most overdue of a few. */
async function dueQuestion(): Promise<{ word: string; gloss: string } | null> {
  const now = Date.now()
  const due = (await db.wordStates.toArray())
    .filter((st) => !isRetired(st, prefs.autoRetire))
    .map((st) => ({ st, due: Math.min(...Object.values(st.skills).map((c) => c.due.getTime())) }))
    .filter((x) => Number.isFinite(x.due) && x.due <= now)
    .sort((a, b) => a.due - b.due)
    .slice(0, 5)
  // A random one of those, skipping any whose entry is gone or has no meaning yet.
  for (const { st } of due.sort(() => Math.random() - 0.5)) {
    const entry = await db.vocabulary.get(st.entryId)
    if (entry?.senses[0]?.gloss) return { word: displayForm(entry), gloss: entry.senses[0].gloss }
  }
  return null
}

export async function showReminder(streak: number, plan = '', due = 0) {
  const question = await dueQuestion().catch(() => null)
  const body = reminderBody(streak, plan, due)
  // A tap opens a short review of exactly those words (see App, "?go=quick"); with a question,
  // "Cevabı göster" answers it without opening the app (handled in push-sw.js).
  const options = {
    body: question ? `Aklından geçir, sonra bak. ${body}` : body,
    icon: '/pwa-192.png',
    // Android's status bar draws the badge from its alpha only: a plain silhouette, not the app icon.
    badge: '/notification-badge.png',
    tag: 'daily-reminder',
    data: { url: '/?go=quick', question },
  }
  const title = question ? `${question.word} = ?` : 'Diloloji'
  // Through the service worker when there is one: works while the tab is in the background.
  const reg = await navigator.serviceWorker?.getRegistration().catch(() => undefined)
  if (reg) await reg.showNotification(title, { ...options, ...(question ? { actions: [{ action: 'reveal', title: 'Cevabı göster' }, { action: 'open', title: 'Kısa tekrar' }] } : {}) } as NotificationOptions)
  else new Notification(title, options)
}

const today = () => new Date().toDateString()

/**
 * While the app is open (even in a background tab) a notification is shown at the chosen time
 * if nothing was studied today. Closed apps can't be woken without a server; for that, use the
 * calendar file below.
 */
export function useReminder(reminder: Settings['reminder'] | undefined, answeredToday: number, streak: number, plan = '', due = 0) {
  useEffect(() => {
    if (!reminder?.enabled || !notificationsSupported()) return
    const check = () => {
      if (Notification.permission !== 'granted' || answeredToday > 0) return
      let last: string | null = null
      try {
        last = localStorage.getItem(LAST_KEY)
      } catch {
        // Storage unavailable: worst case the reminder repeats once.
      }
      if (last === today()) return
      const [h, m] = reminder.time.split(':').map(Number)
      const at = new Date()
      at.setHours(h, m, 0, 0)
      if (new Date() < at) return
      try {
        localStorage.setItem(LAST_KEY, today())
      } catch {
        // ignore
      }
      void showReminder(streak, plan, due)
    }
    check()
    const t = window.setInterval(check, 30_000)
    return () => window.clearInterval(t)
  }, [reminder?.enabled, reminder?.time, answeredToday, streak, plan, due])
}

/** A daily recurring calendar event with an alert, for the system calendar (works when the app is closed). */
export function calendarFile(time: string, url: string): string {
  const [h, m] = time.split(':')
  const d = new Date()
  const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Diloloji//TR',
    'BEGIN:VEVENT',
    `UID:kelime-koc-daily-${ymd}@local`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${ymd}T${h}${m}00`,
    'DURATION:PT15M',
    'RRULE:FREQ=DAILY',
    'SUMMARY:Diloloji – günlük çalışma',
    `DESCRIPTION:Bugünkü kelimelerini çalış: ${url}`,
    `URL:${url}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    'DESCRIPTION:Kelime çalışma zamanı',
    'TRIGGER:PT0M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}
