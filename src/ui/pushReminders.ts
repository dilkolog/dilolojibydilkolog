import { credentialId } from '../data/sync'
import { getCredential } from './syncRunner'

/**
 * Reminders that arrive while the app is closed: the browser's push subscription is registered
 * with our server, which sends one at the reminder hour (the usual study hour, or the chosen time)
 * on days nothing was studied.
 * Needs a service worker; on iPhone the app must be added to the Home Screen first.
 */
const VAPID_PUBLIC_KEY = 'BB1ttPY6-CMNk_Zl7lmm6aJuyxi0cIHr6TUagJ0u_Fpjt3YdaK6vM6c2koor8osB4pIXbPbv57X7TUBmJOhuCIg'

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
}

async function save(sub: PushSubscription, state: PushState) {
  const cred = await getCredential()
  await fetch('/api/push', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      action: 'save',
      subscription: sub.toJSON(),
      tz: new Date().getTimezoneOffset(),
      studiedDay: state.studiedToday ? localDay() : null,
      streak: state.streak,
      plan: state.plan,
      group: cred ? await credentialId(cred) : null,
      restWeekdays: state.restWeekdays,
      vacation: state.vacation,
      due: state.due,
      reportedDay: localDay(),
      week: state.week,
      hour: state.hour,
    }),
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

/** Tells the server what today looks like, so a learner who has studied isn't reminded. Silent on failure. */
export async function reportPushState(state: PushState): Promise<void> {
  try {
    const sub = await pushSubscription()
    if (sub) await save(sub, state)
  } catch {
    // Offline: the next report catches up.
  }
}
