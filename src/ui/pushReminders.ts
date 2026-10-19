import { accessFetch } from '../data/access'
import { getCredential } from './syncRunner'

/**
 * Reminders that arrive while the app is closed: the browser's push subscription is registered
 * with our server, which sends one at the reminder hour (the usual study hour, or the chosen time)
 * on days nothing was studied.
 * Needs a service worker; on iPhone the app must be added to the Home Screen first.
 */
const VAPID_PUBLIC_KEY = 'BE8yoqcmq54W_kmyHSDscvi2h2oyikdjd4fqkm0wLz7vlo-kqk7I9t2sxGZiPA2nNvYOM0NCfcB9LoVRp0cYr1c'

export const pushSupported = () => typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const b64 = (base64url + '='.repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}

/** Local YYYY-MM-DD, as the server computes it from the time zone offset. */
const localDay = (d = new Date()) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10)

async function registration(): Promise<ServiceWorkerRegistration | null> {
  if (!pushSupported()) return null
  return (await navigator.serviceWorker.getRegistration()) ?? null
}

export async function pushSubscription(): Promise<PushSubscription | null> {
  return (await (await registration())?.pushManager.getSubscription()) ?? null
}

export interface PushState {
  studiedToday: boolean
  streak: number
  plan: string
  restWeekdays: number[]
  vacation: { from: string; to: string } | null
  /** Reviews waiting today; the evening reminder names them. */
  due: number
  /** The week in one line, sent instead of the reminder on Sunday evening. */
  week: string
  /** Local hour (0–23) the server reminds at. */
  hour: number
  /** A word missed lately, for the push reminder to ask about (never sent in a mail). */
  word?: string
  /** Whether a friend's message may arrive as a push notification (the bell's "Arkadaş iletileri"; default yes). */
  friends?: boolean
}

/** What the server is told about the day (shared by the push and the mail reminders). */
export function dayFields(state: PushState) {
  return {
    tz: new Date().getTimezoneOffset(),
    studiedDay: state.studiedToday ? localDay() : null,
    streak: state.streak,
    restWeekdays: state.restWeekdays,
    vacation: state.vacation,
    due: state.due,
    reportedDay: localDay(),
    hour: state.hour,
  }
}

async function save(sub: PushSubscription, state: PushState) {
  const cred = await getCredential()
  // With the account's identity: the server then knows whose device this is, for a friend's message.
  await accessFetch('/api/push', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'save', subscription: sub.toJSON(), ...dayFields(state), plan: state.plan, week: state.week, word: state.word ?? '', friends: state.friends !== false, group: cred ? await (await import('../data/sync')).credentialId(cred) : null }),
  })
}

/** Asks for permission and subscribes; throws a readable message when it can't. */
export async function enablePush(state: PushState): Promise<void> {
  const reg = await registration()
  if (!reg) throw new Error('Bu tarayıcı kapalıyken bildirimi desteklemiyor. iPhone\'da önce Paylaş → Ana Ekrana Ekle ile uygulamayı yükle, oradan aç.')
  if ((await Notification.requestPermission()) !== 'granted') throw new Error('Bildirim izni verilmedi. Tarayıcının site ayarlarından izin verebilirsin.')
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) }))
  await save(sub, state)
}

export async function disablePush(): Promise<void> {
  const sub = await pushSubscription()
  if (!sub) return
  await fetch('/api/push', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'remove', endpoint: sub.endpoint }) }).catch(() => {})
  await sub.unsubscribe()
}

/**
 * Takes this device's record off the server without unsubscribing it (signing out): the next person to sign in
 * here registers it again with their own account, and the one who left no longer gets their reminders.
 */
export async function forgetPushRecord(): Promise<void> {
  try {
    const sub = await pushSubscription()
    if (sub) await fetch('/api/push', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'remove', endpoint: sub.endpoint }) })
  } catch {
    // Offline or no push here: nothing to take off.
  }
}

/** Tells the server what today looks like, so a learner who has studied isn't reminded. Silent on failure. */
export async function reportPushState(state: PushState): Promise<void> {
  try {
    const sub = await pushSubscription()
    if (sub) await save(sub, state)
  } catch {
    // Offline: the next report catches up.
  }
}
