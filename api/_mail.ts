/**
 * Mail through Resend (RESEND_API_KEY, a Vercel environment variable; RESEND_FROM names the sender,
 * "Diloloji <hatirlatma@your-domain>" once a domain is verified there; until then Resend's sandbox
 * sender only delivers to the account's own address). Without the key the mail reminders are off.
 */
import { button, escapeHtml, fallbackLink, mailLayout, paragraph, strong } from './_mailLayout.js'
import { extraHosts } from './_origin.js'

export const APP_URL = (process.env.APP_URL?.trim() || 'https://diloloji.com').replace(/\/$/, '')

/**
 * The sites the app is served from. Each keeps its own data in the browser, so a link in a mail must
 * open the site the learner registered from: the other one would show an empty app.
 */
const SITE_HOSTS = ['diloloji.com', 'www.diloloji.com']

/** The origin of a page address (or an Origin/Referer header) when it is one of the app's sites, else undefined. */
export function siteFrom(address: string | null | undefined): string | undefined {
  if (!address) return undefined
  try {
    const url = new URL(address)
    return url.protocol === 'https:' && (SITE_HOSTS.includes(url.hostname) || extraHosts().includes(url.hostname)) ? url.origin : undefined
  } catch {
    return undefined
  }
}

export const mailConfigured = () => !!process.env.RESEND_API_KEY?.trim()

const SANDBOX_SENDER = 'Diloloji <onboarding@resend.dev>'
const sender = () => process.env.RESEND_FROM?.trim() || SANDBOX_SENDER

/**
 * True while mails go out from Resend's shared test address: those are delivered only to the Resend
 * account's own address and land in spam. Reminders need RESEND_FROM on a domain verified at Resend.
 */
export const usingSandboxSender = () => sender() === SANDBOX_SENDER || /@resend\.dev>?$/i.test(sender())

export const EMAIL = /^[^\s@<>"',;]{1,64}@[^\s@<>"',;]{1,255}\.[A-Za-z]{2,}$/

export interface Mail {
  to: string
  subject: string
  html: string
  text: string
  /** The one-click unsubscribe address (RFC 8058): mail clients show their own "unsubscribe" with it. */
  unsubscribe?: string
}

/** The first mail to an address: nothing more is sent until its link is opened. */
export function confirmMail(to: string, confirmUrl: string, cancelUrl: string): Mail {
  return {
    to,
    subject: 'Diloloji hatırlatmalarını onayla',
    html: mailLayout({
      preheader: 'Tek dokunuşla onayla; onaylamazsan mail gelmez.',
      title: 'Hatırlatma maillerini onayla',
      mascot: 'wave',
      body: `${paragraph(`Diloloji'de ${strong(escapeHtml(to))} adresine günlük çalışma hatırlatması gönderilmesini istedin. Onaylarsan, o gün çalışmadıysan seçtiğin saatte kısa bir hatırlatma gelir.`)}${button(confirmUrl, 'Onayla')}${fallbackLink(confirmUrl)}`,
      footer: `Bunu sen istemediysen hiçbir şey yapma: onaylamadıkça mail gelmez. İstersen <a class="m-link" href="${escapeHtml(cancelUrl)}" style="color:#57677e;text-decoration:underline">adresini şimdi sil</a>.`,
      site: APP_URL,
    }),
    text: `Hatırlatma maillerini onayla\n\nDiloloji'de ${to} adresine günlük çalışma hatırlatması gönderilmesini istedin. Onaylarsan, o gün çalışmadıysan seçtiğin saatte kısa bir hatırlatma gelir.\n\nOnaylamak için: ${confirmUrl}\n\nBunu sen istemediysen hiçbir şey yapma: onaylamadıkça mail gelmez. Adresini silmek için: ${cancelUrl}\n\nDiloloji · kelime öğrenme uygulaması`,
    unsubscribe: cancelUrl,
  }
}

/** The daily reminder: numbers and a link only, nothing a stranger could have typed into it. */
export function reminderMail(to: string, line: string, unsubscribeUrl: string, site = APP_URL): Mail {
  return {
    to,
    subject: 'Diloloji: bugünkü çalışman seni bekliyor',
    html: mailLayout({
      preheader: line,
      title: 'Bugünkü çalışman seni bekliyor',
      mascot: 'cheer',
      body: `${paragraph(escapeHtml(line))}${button(`${site}/?go=quick`, 'Hızlı tekrara başla')}`,
      footer: `Bu mailleri sen istedin (Ayarlar → Hatırlatıcı). <a class="m-link" href="${escapeHtml(unsubscribeUrl)}" style="color:#57677e;text-decoration:underline">Hatırlatmaları kapat</a>.`,
      site,
    }),
    text: `Bugünkü çalışman seni bekliyor\n\n${line}\n\nBaşla: ${site}/?go=quick\n\nBu mailleri sen istedin (Ayarlar → Hatırlatıcı). Kapatmak için: ${unsubscribeUrl}\n\nDiloloji · kelime öğrenme uygulaması`,
    unsubscribe: unsubscribeUrl,
  }
}

/** Sunday evening: the week in one line (figures the server checked), and a link to the progress page. */
export function weeklyMail(to: string, line: string, unsubscribeUrl: string, site = APP_URL): Mail {
  return {
    to,
    subject: 'Diloloji: haftanın özeti',
    html: mailLayout({
      preheader: line,
      title: 'Haftanın özeti',
      mascot: 'cheer',
      body: `${paragraph(escapeHtml(line))}${paragraph('Ayrıntılar, en çok kaçırdığın kelimeler ve gelecek haftanın küçük planı İlerleme sayfasında.')}${button(`${site}/?go=progress`, 'İlerlemeni aç')}`,
      footer: `Bu mailleri sen istedin (Ayarlar → Hatırlatıcı). <a class="m-link" href="${escapeHtml(unsubscribeUrl)}" style="color:#57677e;text-decoration:underline">Mailleri kapat</a>.`,
      site,
    }),
    text: `Haftanın özeti\n\n${line}\n\nİlerlemeni aç: ${site}/?go=progress\n\nBu mailleri sen istedin (Ayarlar → Hatırlatıcı). Kapatmak için: ${unsubscribeUrl}\n\nDiloloji · kelime öğrenme uygulaması`,
    unsubscribe: unsubscribeUrl,
  }
}

const BATCH = 50

/** Sends the mails (Resend's batch endpoint, up to 50 a request); how many went and how many did not. */
export async function sendMail(mails: Mail[]): Promise<{ sent: number; failed: number }> {
  const key = process.env.RESEND_API_KEY?.trim()
  if (!key) return { sent: 0, failed: mails.length }
  let sent = 0
  let failed = 0
  for (let i = 0; i < mails.length; i += BATCH) {
    const chunk = mails.slice(i, i + BATCH)
    const body = chunk.map((m) => ({
      from: sender(),
      to: [m.to],
      ...(process.env.RESEND_REPLY_TO?.trim() ? { reply_to: process.env.RESEND_REPLY_TO.trim() } : {}),
      subject: m.subject,
      html: m.html,
      text: m.text,
      ...(m.unsubscribe ? { headers: { 'List-Unsubscribe': `<${m.unsubscribe}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } } : {}),
    }))
    const res = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    }).catch(() => null)
    if (res?.ok) sent += chunk.length
    else failed += chunk.length
  }
  return { sent, failed }
}
