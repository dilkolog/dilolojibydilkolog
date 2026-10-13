/**
 * Mail through Resend (RESEND_API_KEY, a Vercel environment variable; RESEND_FROM names the sender,
 * "Diloloji <hatirlatma@your-domain>" once a domain is verified there; until then Resend's sandbox
 * sender only delivers to the account's own address). Without the key the mail reminders are off.
 */
export const APP_URL = (process.env.APP_URL?.trim() || 'https://kelime-koc.vercel.app').replace(/\/$/, '')

/**
 * The sites the app is served from. Each keeps its own data in the browser, so a link in a mail must
 * open the site the learner registered from: the other one would show an empty app.
 */
const SITE_HOSTS = ['nigalingo.online', 'www.nigalingo.online', 'kelime-koc.vercel.app']

/** The origin of a page address (or an Origin/Referer header) when it is one of the app's sites, else undefined. */
export function siteFrom(address: string | null | undefined): string | undefined {
  if (!address) return undefined
  try {
    const url = new URL(address)
    return url.protocol === 'https:' && SITE_HOSTS.includes(url.hostname) ? url.origin : undefined
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

const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

const BRAND = '#2f6f5e'
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"

/**
 * One calm card on a warm background: a wordmark (text, no images: pictures are blocked by default and
 * count against a sender), a short preview line for the inbox list, the content, then a footer that says
 * why the mail came. Tables and inline styles, because mail clients ignore most of the rest.
 */
function layout(preheader: string, body: string, footer: string): string {
  const hidden = `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;line-height:1px">${escapeHtml(preheader)}${'&nbsp;&zwnj;'.repeat(40)}</div>`
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><title>Diloloji</title></head><body style="margin:0;padding:0;background:#f4f1ea">${hidden}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ea"><tr><td align="center" style="padding:28px 14px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px"><tr><td style="padding:0 4px 14px;font-family:${FONT};font-size:18px;font-weight:700;color:${BRAND};letter-spacing:.2px"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${BRAND};margin-right:8px"></span>Diloloji</td></tr><tr><td style="background:#ffffff;border-radius:16px;padding:28px 26px;font-family:${FONT};color:#1f2933;font-size:16px;line-height:1.55;border:1px solid #e6e1d6">${body}</td></tr><tr><td style="padding:16px 8px 0;font-family:${FONT};font-size:12px;line-height:1.5;color:#6b7280">${footer}</td></tr></table></td></tr></table></body></html>`
}

const heading = (text: string) => `<h1 style="margin:0 0 10px;font-size:22px;line-height:1.25;color:#14201c">${escapeHtml(text)}</h1>`

/** A button that survives mail clients (a table cell carries the colour), with the plain address under it. */
const button = (href: string, label: string) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 6px"><tr><td bgcolor="${BRAND}" style="border-radius:12px"><a href="${escapeHtml(href)}" style="display:inline-block;padding:13px 24px;font-family:${FONT};font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:12px">${escapeHtml(label)}</a></td></tr></table><p style="margin:10px 0 0;font-size:12px;line-height:1.5;color:#6b7280">Düğme çalışmazsa bu adresi tarayıcına yapıştır:<br><a href="${escapeHtml(href)}" style="color:#6b7280;word-break:break-all">${escapeHtml(href)}</a></p>`

/** The first mail to an address: nothing more is sent until its link is opened. */
export function confirmMail(to: string, confirmUrl: string, cancelUrl: string): Mail {
  return {
    to,
    subject: 'Diloloji hatırlatmalarını onayla',
    html: layout(
      'Tek dokunuşla onayla; onaylamazsan mail gelmez.',
      `${heading('Hatırlatma maillerini onayla')}<p style="margin:0">Diloloji'de <strong>${escapeHtml(to)}</strong> adresine günlük çalışma hatırlatması gönderilmesini istedin. Onaylarsan, o gün çalışmadıysan seçtiğin saatte kısa bir hatırlatma gelir.</p>${button(confirmUrl, 'Onayla')}`,
      `Bunu sen istemediysen hiçbir şey yapma: onaylamadıkça mail gelmez. İstersen <a href="${escapeHtml(cancelUrl)}" style="color:#6b7280">adresini şimdi sil</a>.<br>Diloloji · kelime öğrenme uygulaması`,
    ),
    text: `Hatırlatma maillerini onayla\n\nDiloloji'de ${to} adresine günlük çalışma hatırlatması gönderilmesini istedin. Onaylarsan, o gün çalışmadıysan seçtiğin saatte kısa bir hatırlatma gelir.\n\nOnaylamak için: ${confirmUrl}\n\nBunu sen istemediysen hiçbir şey yapma: onaylamadıkça mail gelmez. Adresini silmek için: ${cancelUrl}\n\nDiloloji · kelime öğrenme uygulaması`,
    unsubscribe: cancelUrl,
  }
}

/** The daily reminder: numbers and a link only, nothing a stranger could have typed into it. */
export function reminderMail(to: string, line: string, unsubscribeUrl: string, site = APP_URL): Mail {
  return {
    to,
    subject: 'Diloloji: bugünkü çalışman seni bekliyor',
    html: layout(
      line,
      `${heading('Bugünkü çalışman seni bekliyor')}<p style="margin:0">${escapeHtml(line)}</p>${button(`${site}/?go=quick`, 'Hızlı tekrara başla')}`,
      `Bu mailleri sen istedin (Ayarlar → Hatırlatıcı). <a href="${escapeHtml(unsubscribeUrl)}" style="color:#6b7280">Hatırlatmaları kapat</a>.<br>Diloloji · kelime öğrenme uygulaması`,
    ),
    text: `Bugünkü çalışman seni bekliyor\n\n${line}\n\nBaşla: ${site}/?go=quick\n\nBu mailleri sen istedin (Ayarlar → Hatırlatıcı). Kapatmak için: ${unsubscribeUrl}\n\nDiloloji · kelime öğrenme uygulaması`,
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
