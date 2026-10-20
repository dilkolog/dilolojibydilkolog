import { accessFetch, APPROVAL_MESSAGE, isApprovalRefusal } from '../data/access'
import { db } from '../data/instance'
import { dayFields, type PushState } from './pushReminders'

/**
 * Reminders by mail (Resend, on our server: see api/push.ts). The address is kept on the server to send
 * to, and registering it sends a confirmation mail first: nothing more arrives until its link is opened.
 * Only an approved account can use it. The address is kept on this device too (not in the backup).
 */
const META = 'reminderEmail'

export type MailState = 'pending' | 'on'
export interface MailReminder {
  email: string
  state: MailState
  /** Whether Sunday evening's summary of the week may come by mail too (default yes). */
  weekly?: boolean
}

/** Whether the server can send mail at all (the owner has set the Resend key), and whether it still uses Resend's test sender. */
export async function mailStatus(): Promise<{ available: boolean; sandbox: boolean }> {
  try {
    const res = await fetch('/api/push?mail=status')
    if (!res.ok) return { available: false, sandbox: false }
    const body = (await res.json()) as { available?: boolean; sandbox?: boolean }
    return { available: body.available === true, sandbox: body.sandbox === true }
  } catch {
    return { available: false, sandbox: false }
  }
}

export const mailAvailable = async () => (await mailStatus()).available

export async function getMail(): Promise<MailReminder | null> {
  return ((await db.meta.get(META))?.value as MailReminder | undefined) ?? null
}

const post = (body: Record<string, unknown>) => accessFetch('/api/push', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })

async function failure(res: Response): Promise<Error> {
  const error = ((await res.json().catch(() => ({}))) as { error?: string }).error
  if (isApprovalRefusal(error)) return new Error(APPROVAL_MESSAGE)
  if (res.status === 409) return new Error('Bu adres başka bir hesapta kayıtlı.')
  if (res.status === 400) return new Error('E-posta adresi geçerli görünmüyor.')
  if (res.status === 502) return new Error('Onay maili gönderilemedi. Biraz sonra tekrar dene.')
  return new Error('Açılamadı. Biraz sonra tekrar dene.')
}

/** Registers the address (the server mails the confirmation). Throws a readable message when it can't. */
export async function enableMail(email: string, state: PushState, resend = false): Promise<MailState> {
  const address = email.trim()
  const weekly = (await getMail())?.weekly !== false
  const res = await post({ action: 'email', email: address, ...dayFields(state), week: state.week, weeklyMail: weekly, resend })
  if (!res.ok) throw await failure(res)
  const { state: now } = (await res.json()) as { state: MailState }
  await db.meta.put({ key: META, value: { email: address, state: now, ...(weekly ? {} : { weekly: false }) } satisfies MailReminder })
  return now
}

export async function disableMail(): Promise<void> {
  const mail = await getMail()
  if (!mail) return
  const res = await post({ action: 'email-remove', email: mail.email }).catch(() => null)
  // Gone on the server, or never there; only a refusal (another account's address) keeps it here.
  if (res && !res.ok && res.status !== 409) throw await failure(res)
  await db.meta.delete(META)
}

/** Whether the confirmation link has been opened since; keeps the stored state in step. */
export async function refreshMail(): Promise<MailReminder | null> {
  const mail = await getMail()
  if (!mail) return null
  try {
    const res = await post({ action: 'email-status', email: mail.email })
    if (!res.ok) return mail
    const { state } = (await res.json()) as { state: MailState | 'none' }
    // Taken off (the unsubscribe link in a mail): nothing registered any more.
    if (state === 'none') {
      await db.meta.delete(META)
      return null
    }
    const next = { ...mail, state }
    await db.meta.put({ key: META, value: next })
    return next
  } catch {
    return mail
  }
}

/** Tells the server what today looks like, so the mail goes only to those who haven't studied. Silent on failure. */
export async function reportMailState(state: PushState): Promise<void> {
  try {
    const mail = await getMail()
    if (mail) await post({ action: 'email', email: mail.email, ...dayFields(state), week: state.week, weeklyMail: mail.weekly !== false, update: true })
  } catch {
    // Offline: the next report catches up.
  }
}

/** Turns Sunday's weekly summary mail on or off; the server hears of it with the next report (at once here). */
export async function setMailWeekly(weekly: boolean, state: PushState): Promise<void> {
  const mail = await getMail()
  if (!mail) return
  await db.meta.put({ key: META, value: { ...mail, weekly } satisfies MailReminder })
  const res = await post({ action: 'email', email: mail.email, ...dayFields(state), week: state.week, weeklyMail: weekly, update: true })
  if (!res.ok) throw await failure(res)
}
