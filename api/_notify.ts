import webpush from 'web-push'
import type { InboxItem } from './_friends.js'
import { reminderStore } from './_reminders.js'

/** The public half of the app's VAPID key pair (the browsers subscribe with it; the private half is VAPID_PRIVATE_KEY). */
export const VAPID_PUBLIC_KEY = 'BB1ttPY6-CMNk_Zl7lmm6aJuyxi0cIHr6TUagJ0u_Fpjt3YdaK6vM6c2koor8osB4pIXbPbv57X7TUBmJOhuCIg'

/** How long one send may take: an address that never answers must not hold a request. */
const SEND_TIMEOUT_MS = 5000

export interface PushMessage {
  title: string
  body: string
  url: string
  /** Tells the service worker what the notification is (a friend's message is shown as it is, without the day's word question). */
  kind: 'friend'
}

/** A sender's name as it may appear in a notification: one short line, nothing that could be markup. */
const clean = (v: string) => v.replace(/[\p{Cc}<>"“”]/gu, '').trim().slice(0, 30) || 'Bir arkadaşın'

/** What a friend's message says in a push notification: who it is from and what kind, never the content of a gift or a text. */
export function friendMessage(item: Pick<InboxItem, 'kind' | 'from'>): PushMessage {
  const who = clean(item.from.name)
  const body =
    item.kind === 'cheer'
      ? `👏 ${who} seni tebrik etti`
      : item.kind === 'nudge'
        ? `👋 ${who} seni dürttü: bugün biraz çalışmaya ne dersin?`
        : item.kind === 'gift'
          ? `🎁 ${who} sana bir kelime gönderdi`
          : `📖 ${who} sana bir metin gönderdi`
  return { title: 'Diloloji', body, url: '/', kind: 'friend' }
}

/**
 * Sends a push notification to the devices of an account that asked for friends' messages (a record with
 * `friends` set, saved by a signed-in device). Without VAPID_PRIVATE_KEY nothing is sent. Expired addresses are
 * removed. Never throws: the message is in the inbox already, the notification is a courtesy.
 */
export async function pushToOwner(owner: string, message: PushMessage): Promise<number> {
  if (!process.env.VAPID_PRIVATE_KEY) return 0
  try {
    const store = await reminderStore()
    const devices = (await store.byOwner(owner)).filter(({ record }) => record.friends === true && record.subscription)
    if (!devices.length) return 0
    webpush.setVapidDetails('https://kelime-koc.vercel.app', VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY)
    let sent = 0
    await Promise.all(
      devices.map(async ({ key, record }) => {
        try {
          await webpush.sendNotification(record.subscription!, JSON.stringify(message), { TTL: 24 * 3600, urgency: 'normal', timeout: SEND_TIMEOUT_MS })
          sent++
        } catch (e) {
          const status = (e as { statusCode?: number }).statusCode
          if (status === 404 || status === 410) await store.remove(key).catch(() => {})
        }
      }),
    )
    return sent
  } catch {
    return 0
  }
}
