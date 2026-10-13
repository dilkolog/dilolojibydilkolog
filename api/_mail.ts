/**
 * Mail through Resend (RESEND_API_KEY, a Vercel environment variable; RESEND_FROM names the sender,
 * "Diloloji <hatirlatma@your-domain>" once a domain is verified there; until then Resend's sandbox
 * sender only delivers to the account's own address). Without the key the mail reminders are off.
 */
export const APP_URL = 'https://kelime-koc.vercel.app'

export const mailConfigured = () => !!process.env.RESEND_API_KEY?.trim()

const sender = () => process.env.RESEND_FROM?.trim() || 'Diloloji <onboarding@resend.dev>'

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

function layout(body: string, footer: string): string {
  return `<!doctype html><html lang="tr"><body style="margin:0;padding:24px;background:#f6f4ef;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1f2933"><div style="max-width:480px;margin:0 auto;background:#fff;border-radius:14px;padding:24px">${body}</div><p style="max-width:480px;margin:12px auto 0;font-size:12px;color:#6b7280">${footer}</p></body></html>`
}

const button = (href: string, label: string) =>
  `<p style="margin:20px 0 4px"><a href="${escapeHtml(href)}" style="display:inline-block;background:#2f6f5e;color:#fff;text-decoration:none;padding:12px 20px;border-radius:10px;font-weight:600">${escapeHtml(label)}</a></p>`

/** The first mail to an address: nothing more is sent until its link is opened. */
export function confirmMail(to: string, confirmUrl: string, cancelUrl: string): Mail {
  return {
    to,
    subject: 'Diloloji hatırlatmalarını onayla',
    html: layout(
      `<h1 style="font-size:20px;margin:0 0 8px">Hatırlatma maillerini onayla</h1><p style="margin:0">Diloloji'de bu adrese günlük çalışma hatırlatması gönderilmesini istedin. Onaylarsan, o gün çalışmadıysan seçtiğin saatte kısa bir hatırlatma gelir.</p>${button(confirmUrl, 'Onayla')}`,
      `Bunu sen istemediysen hiçbir şey yapma, onaylamadıkça mail gelmez. <a href="${escapeHtml(cancelUrl)}">Adresimi sil</a>`,
    ),
    text: `Diloloji'de bu adrese günlük çalışma hatırlatması gönderilmesini istedin.\n\nOnaylamak için: ${confirmUrl}\n\nBunu sen istemediysen hiçbir şey yapma, onaylamadıkça mail gelmez. Adresini silmek için: ${cancelUrl}`,
  }
}

/** The daily reminder: numbers and a link only, nothing a stranger could have typed into it. */
export function reminderMail(to: string, line: string, unsubscribeUrl: string): Mail {
  return {
    to,
    subject: 'Diloloji: bugünkü çalışman seni bekliyor',
    html: layout(`<p style="margin:0;font-size:16px;line-height:1.5">${escapeHtml(line)}</p>${button(`${APP_URL}/?go=quick`, 'Hızlı tekrara başla')}`, `Bu mailleri istemiyorsan <a href="${escapeHtml(unsubscribeUrl)}">hatırlatmaları kapat</a>.`),
    text: `${line}\n\nBaşla: ${APP_URL}/?go=quick\n\nHatırlatmaları kapatmak için: ${unsubscribeUrl}`,
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
