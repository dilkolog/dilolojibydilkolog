/**
 * The one look of every mail Diloloji sends: the reminder mails (api/_mail.ts) and the Supabase account mails
 * (supabase/templates, built from api/_mailTemplates.ts). Tables and inline styles, because mail clients ignore
 * most of the rest; a small <style> block carries only what inline styles cannot (dark mode).
 *
 * It follows DESIGN.md as far as a mail can: slate neutrals on a slate-100 page, a white card with a rule,
 * Lexend when the reader's device has it (then the system font), a tactile button (a darker bottom edge), the
 * three language colours as one thin stripe, and Monki. The accent is the logo's indigo: a mail has no
 * "active language" to take its colour from. Pictures are kept few and small (the logo and one Monki pose,
 * served from /mail on the app's own site) and the mail reads fine with them blocked: the name is text.
 */

export const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

// DESIGN.md tokens (light), plus the logo's indigo for the button and links.
const C = {
  page: '#f1f5f9',
  card: '#ffffff',
  box: '#f8fafc',
  rule: '#e2e8f0',
  ink: '#0f172a',
  soft: '#57677e',
  accent: '#4338ca',
  edge: '#312e81',
  en: '#2f6de6',
  fr: '#c6317c',
  es: '#e6a313',
}

const FONT = "'Lexend',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"

/** The Monki pose beside the heading (public/mail/monki-<pose>.png). */
export type Mascot = 'wave' | 'cheer' | 'think'

export interface MailPage {
  /** The line the inbox list shows after the subject. */
  preheader: string
  /** The heading of the card. */
  title: string
  /** A pose beside the heading; none for notices that should read serious. */
  mascot?: Mascot
  /** The card's content (paragraph, button, … below). */
  body: string
  /** Why the mail came, in a few words (HTML). */
  footer: string
  /** The site the pictures and the footer link point to. */
  site: string
}

// Dark mode: Apple Mail and Outlook.com read it, Gmail inverts the colours its own way. !important because the
// colours above are inline.
const DARK = `@media (prefers-color-scheme: dark){.m-page{background:#0f172a !important}.m-card{background:#1e293b !important;border-color:#334155 !important}.m-box{background:#0f172a !important;border-color:#334155 !important}.m-ink{color:#f1f5f9 !important}.m-soft{color:#a3b1c6 !important}.m-link{color:#a5b4fc !important}.m-btn{background:#4f46e5 !important}}`

/** A paragraph of the card (HTML: escape what was typed by a person, see escapeHtml). */
export const paragraph = (html: string) => `<p class="m-ink" style="margin:0 0 12px;font-size:16px;line-height:1.6;color:${C.ink}">${html}</p>`

export const strong = (text: string) => `<strong>${text}</strong>`

/** A button that survives mail clients (a table cell carries the colour and the darker bottom edge). */
export function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 4px"><tr><td class="m-btn" bgcolor="${C.accent}" style="background:${C.accent};border-radius:14px;border-bottom:4px solid ${C.edge}"><a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 28px 12px;font-family:${FONT};font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:14px">${escapeHtml(label)}</a></td></tr></table>`
}

/**
 * Under the button: for a client that does not show it, the same address as a short link. The long
 * address itself is not printed (it is a token, and it was the ugliest part of the mail); a link can
 * still be copied by holding it.
 */
export function fallbackLink(href: string): string {
  return `<p class="m-soft" style="margin:14px 0 0;font-size:13px;line-height:1.5;color:${C.soft}">Düğme çalışmıyor mu? <a class="m-link" href="${escapeHtml(href)}" style="color:${C.accent};font-weight:600;text-decoration:underline">Bağlantıyı tarayıcında aç</a>.</p>`
}

/** A short code to type into the app, set large in an inner box. */
export function codeBox(code: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0"><tr><td class="m-box m-ink" align="center" style="background:${C.box};border:1px solid ${C.rule};border-radius:14px;padding:18px 12px;font-family:${FONT};font-size:30px;font-weight:700;letter-spacing:6px;color:${C.ink}">${code}</td></tr></table>`
}

/** The three language colours as one thin stripe on the card's top edge. */
const stripe = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td width="34%" height="4" style="height:4px;line-height:4px;font-size:0;background:${C.en}">&nbsp;</td><td width="33%" height="4" style="height:4px;line-height:4px;font-size:0;background:${C.fr}">&nbsp;</td><td width="33%" height="4" style="height:4px;line-height:4px;font-size:0;background:${C.es}">&nbsp;</td></tr></table>`

export function mailLayout(page: MailPage): string {
  const site = page.site.replace(/\/$/, '')
  const hidden = `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;line-height:1px">${escapeHtml(page.preheader)}${'&nbsp;&zwnj;'.repeat(40)}</div>`
  const mascot = page.mascot
    ? `<td width="92" align="right" valign="bottom" style="padding-left:12px"><img src="${site}/mail/monki-${page.mascot}.png" width="${page.mascot === 'cheer' ? 78 : 70}" alt="" style="display:block;border:0;height:auto"></td>`
    : ''
  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark"><title>Diloloji</title><style>${DARK}</style></head><body class="m-page" style="margin:0;padding:0;background:${C.page}">${hidden}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="m-page" style="background:${C.page}"><tr><td align="center" style="padding:24px 12px 32px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px"><tr><td style="padding:0 4px 14px"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td valign="middle" style="padding-right:10px"><img src="${site}/mail/logo.png" width="34" height="34" alt="" style="display:block;border:0;border-radius:9px"></td><td valign="middle" class="m-ink" style="font-family:${FONT};font-size:20px;font-weight:700;color:${C.ink}">Diloloji</td></tr></table></td></tr><tr><td class="m-card" style="background:${C.card};border:1px solid ${C.rule};border-radius:20px;overflow:hidden">${stripe}<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:26px 26px 28px;font-family:${FONT};color:${C.ink}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 14px"><tr><td valign="bottom"><h1 class="m-ink" style="margin:0;font-family:${FONT};font-size:24px;line-height:1.25;font-weight:700;color:${C.ink}">${escapeHtml(page.title)}</h1></td>${mascot}</tr></table>${page.body}</td></tr></table></td></tr><tr><td class="m-soft" style="padding:16px 10px 0;font-family:${FONT};font-size:12px;line-height:1.55;color:${C.soft}">${page.footer}<br><a class="m-link" href="${site}" style="color:${C.soft};text-decoration:underline">diloloji.com</a> · kelime öğrenme uygulaması</td></tr></table></td></tr></table></body></html>`
}

/**
 * The page a link in a mail opens (confirm the address, switch the reminders off): the same card as the mail,
 * as a web page. `extra` is trusted HTML under the text (a form whose button has class "go").
 */
export function landingPage(page: { title: string; text: string; extra?: string; mascot?: Mascot; site: string }): string {
  const site = page.site.replace(/\/$/, '')
  const css = `body{margin:0;background:${C.page};color:${C.ink};font:16px/1.6 ${FONT}}.wrap{max-width:30rem;margin:0 auto;padding:12vh 1rem 2rem}.brand{display:flex;align-items:center;gap:.6rem;margin:0 .25rem .9rem;font-size:1.25rem;font-weight:700}.brand img{border-radius:9px}.card{background:${C.card};border:1px solid ${C.rule};border-radius:20px;overflow:hidden}.bar{display:flex;height:4px}.bar i{flex:1}.in{padding:1.6rem 1.6rem 1.8rem}.top{display:flex;align-items:flex-end;justify-content:space-between;gap:.75rem;margin-bottom:.6rem}h1{margin:0;font-size:1.5rem;line-height:1.25}p{margin:0 0 .8rem}.go{font:inherit;font-weight:600;padding:.85rem 1.8rem .7rem;border:0;border-bottom:4px solid ${C.edge};border-radius:14px;background:${C.accent};color:#fff;cursor:pointer}.go:active{transform:translateY(3px);border-bottom-width:1px}a{color:${C.accent};font-weight:600}.back{margin:1.1rem .25rem 0;font-size:.9rem}@media (prefers-color-scheme:dark){body{background:#0f172a;color:#f1f5f9}.card{background:#1e293b;border-color:#334155}a{color:#a5b4fc}.go{background:#4f46e5}}`
  const mascot = page.mascot ? `<img src="${site}/mail/monki-${page.mascot}.png" width="64" alt="">` : ''
  return `<!doctype html><html lang="tr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><title>${escapeHtml(page.title)} · Diloloji</title><style>${css}</style><body><div class="wrap"><div class="brand"><img src="${site}/mail/logo.png" width="34" height="34" alt="">Diloloji</div><div class="card"><div class="bar"><i style="background:${C.en}"></i><i style="background:${C.fr}"></i><i style="background:${C.es}"></i></div><div class="in"><div class="top"><h1>${escapeHtml(page.title)}</h1>${mascot}</div><p>${page.text}</p>${page.extra ?? ''}</div></div><p class="back"><a href="${site}">Diloloji'ye dön</a></p></div></body></html>`
}
