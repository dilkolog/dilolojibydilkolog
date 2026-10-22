import { APP_URL, EMAIL, mailConfigured, sendMail, type Mail } from './_mail.js'
import { escapeHtml, mailLayout, paragraph } from './_mailLayout.js'
import { quotaUsed, spendQuota, type QuotaStore } from './_quota.js'

/**
 * A mail to the site's owner when a new person starts using the app: their first sign-in (the email confirmed, or
 * Google), when their account is linked (api/access.ts vault-link). An unconfirmed sign-up sends nothing, so a bot
 * that never confirms is not announced. The owner's address is `OWNER_EMAIL` (or `ERROR_DIGEST_TO`); without one,
 * or without the mail key, nothing is sent.
 *
 * At most MAX_A_DAY mails a day (UTC): a wave of sign-ups must not fill the owner's inbox or use up the mail quota.
 * The last one of the day says so; the rest are in Supabase → Authentication → Users.
 */
export const MAX_A_DAY = 30

export interface NewPerson {
  email: string
  name: string
  username?: string
}

const ownerAddress = () => [process.env.OWNER_EMAIL, process.env.ERROR_DIGEST_TO].map((v) => v?.trim() ?? '').find((v) => EMAIL.test(v)) ?? ''

const timeText = (now: number) => new Date(now).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', dateStyle: 'medium', timeStyle: 'short' })

/** The mail itself. `nth` is the day's count of new people so far, this one included. */
export function signupMail(to: string, person: NewPerson, nth: number, now: number, site = APP_URL): Mail {
  const last = nth >= MAX_A_DAY
  const who = person.username ? `@${person.username}` : person.name
  const rows: [string, string][] = [
    ['Ad', person.name],
    ...(person.username ? ([['Kullanıcı adı', `@${person.username}`]] as [string, string][]) : []),
    ['E-posta', person.email || '(yok)'],
    ['Zaman', timeText(now)],
    ['Bugün', `${nth}. yeni hesap`],
  ]
  const table = `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" class="m-ink" style="font-size:15px;line-height:1.5">${rows.map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;opacity:.7;white-space:nowrap;vertical-align:top">${escapeHtml(k)}</td><td style="padding:4px 0;font-weight:600">${escapeHtml(v)}</td></tr>`).join('')}</table>`
  const lastNote = last ? `Bugün ${MAX_A_DAY} yeni hesaba ulaşıldı; bugün için başka bildirim gelmeyecek. Beklenmedik bir artışsa Supabase → Authentication → Users listesine bak.` : ''
  return {
    to,
    subject: last ? `Diloloji: yeni hesap (${who}) · bugünün son bildirimi` : `Diloloji: yeni hesap (${who})`,
    html: mailLayout({
      preheader: `${person.name} Diloloji'yi kullanmaya başladı.`,
      title: 'Yeni bir öğrenci',
      mascot: 'cheer',
      body: `${paragraph('Biri Diloloji hesabını açıp ilk kez giriş yaptı.')}${table}${lastNote ? paragraph(escapeHtml(lastNote)) : ''}`,
      footer: 'Bu bildirim yalnızca site sahibine gider (OWNER_EMAIL). Günde en çok 30 tane.',
      site,
    }),
    text: `Yeni hesap: ${rows.map(([k, v]) => `${k}: ${v}`).join(' · ')}${lastNote ? `\n\n${lastNote}` : ''}`,
  }
}

export type SignupNoticeResult = 'sent' | 'off' | 'capped' | 'failed'

/** Tells the owner about a new person (never throws: a failing mail must not fail anyone's sign-in). */
export async function noticeSignup(person: NewPerson, store?: QuotaStore, now = Date.now()): Promise<SignupNoticeResult> {
  try {
    const to = ownerAddress()
    if (!to || !mailConfigured()) return 'off'
    const nth = (await quotaUsed('signup-notice', 'owner', store, now)) + 1
    if (nth > MAX_A_DAY) return 'capped'
    await spendQuota('signup-notice', 'owner', 1, store, now)
    const { sent } = await sendMail([signupMail(to, person, nth, now)])
    return sent ? 'sent' : 'failed'
  } catch (e) {
    console.error('[signup-notice-failed]', e)
    return 'failed'
  }
}
