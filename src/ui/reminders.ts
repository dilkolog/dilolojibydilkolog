import { useEffect } from 'react'
import type { Settings } from '../data/db'

const LAST_KEY = 'kelime-koc:last-reminder'

export const notificationsSupported = () => typeof window !== 'undefined' && 'Notification' in window

export async function requestNotifications(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return 'denied'
  return Notification.permission === 'default' ? Notification.requestPermission() : Notification.permission
}

export async function showReminder(streak: number, plan = '') {
  const base = streak > 0 ? `🔥 ${streak} günlük serin var, bugün de devam et!` : 'Bugünkü kelime çalışman seni bekliyor.'
  const body = plan ? `${plan}: ${base}` : base
  const options = { body, icon: '/pwa-192.png', tag: 'daily-reminder' }
  // Through the service worker when there is one: works while the tab is in the background.
  const reg = await navigator.serviceWorker?.getRegistration().catch(() => undefined)
  if (reg) await reg.showNotification('Kelime Koçu', options)
  else new Notification('Kelime Koçu', options)
}

const today = () => new Date().toDateString()

/**
 * While the app is open (even in a background tab) a notification is shown at the chosen time
 * if nothing was studied today. Closed apps can't be woken without a server; for that, use the
 * calendar file below.
 */
export function useReminder(reminder: Settings['reminder'] | undefined, answeredToday: number, streak: number, plan = '') {
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
      const due = new Date()
      due.setHours(h, m, 0, 0)
      if (new Date() < due) return
      try {
        localStorage.setItem(LAST_KEY, today())
      } catch {
        // ignore
      }
      void showReminder(streak, plan)
    }
    check()
    const t = window.setInterval(check, 30_000)
    return () => window.clearInterval(t)
  }, [reminder?.enabled, reminder?.time, answeredToday, streak, plan])
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
    'PRODID:-//Kelime Kocu//TR',
    'BEGIN:VEVENT',
    `UID:kelime-koc-daily-${ymd}@local`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${ymd}T${h}${m}00`,
    'DURATION:PT15M',
    'RRULE:FREQ=DAILY',
    'SUMMARY:Kelime Koçu – günlük çalışma',
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
