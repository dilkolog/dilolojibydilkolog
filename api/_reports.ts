import { readText, writeJson } from './_account.js'
import { cardOwner, inboxItemOf } from './_friends.js'
import { APP_URL, EMAIL, mailConfigured, sendMail, type Mail } from './_mail.js'
import { escapeHtml, mailLayout, paragraph } from './_mailLayout.js'
import { quotaLeft, quotaUsed, spendQuota, type QuotaStore } from './_quota.js'
import { SHARE_ID, shareStore } from './share.js'

/**
 * Reports on what people send one another (Google Play's user-generated content rules): a person (their name or
 * card), a message in one's inbox, a list in the community library, a reading club room.
 *
 * Each report is kept (reports/<day>/<id>.json, with the server's own copy of what was reported where it has one, so
 * the owner sees what was there, not what the reporter says was there) and mailed to the owner (OWNER_EMAIL or
 * ERROR_DIGEST_TO; at most MAILS_A_DAY a day, the rest are in the store). A library list reported by HIDE_AFTER
 * different people leaves the library on its own (the list itself stays, so the owner can look and decide).
 * A person may file REPORTS_A_DAY reports a day: enough for any real need, too few to bury the owner.
 */
export const REASONS = ['spam', 'sexual', 'harassment', 'violence', 'personal', 'copyright', 'other'] as const
export type ReportReason = (typeof REASONS)[number]
export const REPORT_KINDS = ['user', 'message', 'set', 'club'] as const
export type ReportKind = (typeof REPORT_KINDS)[number]

const REASON_TEXT: Record<ReportReason, string> = {
  spam: 'Spam ya da reklam',
  sexual: 'Cinsel ya da müstehcen içerik',
  harassment: 'Taciz, zorbalık ya da nefret söylemi',
  violence: 'Şiddet ya da tehdit',
  personal: 'Kişisel bilgilerin paylaşılması',
  copyright: 'Telif hakkı ihlali',
  other: 'Başka bir sorun',
}
const KIND_TEXT: Record<ReportKind, string> = {
  user: 'Kullanıcı',
  message: 'Arkadaştan gelen ileti',
  set: 'Topluluk listesi',
  club: 'Okuma kulübü odası',
}

export const REPORTS_A_DAY = 20
export const MAILS_A_DAY = 50
export const HIDE_AFTER = 3
const MAX_NOTE = 500
const MAX_CONTENT = 2000
const ROOM = /^[2-9A-HJKMNP-Z]{6}$/
const ITEM_ID = /^[\w-]{1,80}$/
const FRIEND_CODE = /^[2-9A-HJKMNP-Z]{8}$/

export interface Report {
  id: string
  at: string
  kind: ReportKind
  reason: ReportReason
  note: string
  /** The reporting account. */
  reporter: string
  /** What was reported: a friend code, an inbox message id, a list id, a room code. */
  target: string
  /** Whose it is, where the server knows: their account and the name others see. */
  about?: { owner?: string; name?: string; code?: string }
  /** What it said: the server's copy (message, list) or, for a room, what the reporter's screen showed. */
  content: string
  /** A library list that left the library with this report. */
  hidden?: true
}

export type ReportResult = 'ok' | 'bad_request' | 'not_found' | 'too_many'

/** Plain text, no control or direction characters (line breaks kept), at most `max` characters. */
const plain = (v: unknown, max: number) =>
  typeof v === 'string'
    ? v
        .replace(/[\p{Cf}\u0000-\u0009\u000B-\u001F\u007F-\u009F]+/gu, ' ')
        .replace(/[ \t]+/g, ' ')
        .trim()
        .slice(0, max)
    : ''

const sha = async (text: string) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))].map((b) => b.toString(16).padStart(2, '0')).join('')

const newId = () => [...crypto.getRandomValues(new Uint8Array(8))].map((b) => b.toString(16).padStart(2, '0')).join('')

/** The reported thing as the server has it, or null when there is nothing under that target (any more). */
async function snapshot(reporter: string, kind: ReportKind, target: string, shown: string): Promise<Pick<Report, 'about' | 'content'> | null> {
  if (kind === 'user') {
    if (!FRIEND_CODE.test(target)) return null
    const card = await cardOwner(target)
    return card
      ? {
          about: { owner: card.owner, name: card.name, code: target },
          content: `Adı: ${card.name}`,
        }
      : null
  }
  if (kind === 'message') {
    if (!ITEM_ID.test(target)) return null
    const item = await inboxItemOf(reporter, target)
    if (!item) return null
    const card = await cardOwner(item.from.code).catch(() => null)
    const content =
      item.kind === 'text' && item.text
        ? `Metin: “${item.text.title}”\n\n${item.text.body}`
        : item.kind === 'gift' && item.gift
          ? `Kelime: ${item.gift.lemma} = ${item.gift.meaning}${item.gift.example ? `\nÖrnek: ${item.gift.example}` : ''}`
          : `İleti türü: ${item.kind}`
    return {
      about: { owner: card?.owner, name: item.from.name, code: item.from.code },
      content: content.slice(0, MAX_CONTENT),
    }
  }
  if (kind === 'set') {
    if (!SHARE_ID.test(target)) return null
    const found = await (await shareStore()).get(target)
    if (!found) return null
    const words = found.doc.words.filter((w) => !w.deleted)
    const list = words
      .slice(0, 40)
      .map((w) => `${w.word} = ${w.meaning}`)
      .join('\n')
    return {
      about: { owner: found.doc.owner, name: found.doc.name },
      content: `Liste: “${found.doc.name}” (${words.length} kelime)\n\n${list}`.slice(0, MAX_CONTENT),
    }
  }
  // A room lives only in the memory of its Durable Object: what the reporter saw is all there is.
  if (!ROOM.test(target)) return null
  return { content: plain(shown, MAX_CONTENT) || '(içerik yok)' }
}

/**
 * Counts who reported a library list (each person once, by a hash of their account) and takes it off the library
 * when HIDE_AFTER people have; its owner reporting it does not count. True when this report took it off.
 */
async function countForList(id: string, reporter: string, owner: string | undefined): Promise<boolean> {
  if (reporter === owner) return false
  const path = `reports/sets/${id}.json`
  const raw = await readText(path)
  let seen: string[] = []
  try {
    const parsed = raw ? (JSON.parse(raw) as { by?: unknown; hidden?: unknown }) : {}
    if (parsed.hidden) return false
    if (Array.isArray(parsed.by)) seen = parsed.by.filter((x): x is string => typeof x === 'string')
  } catch {
    // A broken file starts the count again.
  }
  const me = await sha(reporter)
  if (seen.includes(me)) return false
  seen = [...seen, me]
  const hide = seen.length >= HIDE_AFTER
  if (hide) await (await shareStore()).unpublish(id)
  await writeJson(path, {
    by: seen,
    ...(hide ? { hidden: new Date().toISOString() } : {}),
  })
  return hide
}

const ownerAddress = () => [process.env.OWNER_EMAIL, process.env.ERROR_DIGEST_TO].map((v) => v?.trim() ?? '').find((v) => EMAIL.test(v)) ?? ''

const timeText = (at: string) =>
  new Date(at).toLocaleString('tr-TR', {
    timeZone: 'Europe/Istanbul',
    dateStyle: 'medium',
    timeStyle: 'short',
  })

/** The owner's mail about a report. `nth` is the day's count of report mails, this one included. */
export function reportMail(to: string, r: Report, nth: number, site = APP_URL): Mail {
  const last = nth >= MAILS_A_DAY
  const rows: [string, string][] = [
    ['Tür', KIND_TEXT[r.kind]],
    ['Neden', REASON_TEXT[r.reason]],
    ...(r.about?.name ? ([['Kimin', r.about.name + (r.about.code ? ` (kod ${r.about.code})` : '')]] as [string, string][]) : []),
    ...(r.about?.owner ? ([['Hesap kimliği', r.about.owner]] as [string, string][]) : []),
    ['Hedef', r.target],
    ['Şikâyet eden', r.reporter],
    ['Zaman', timeText(r.at)],
    ['Kayıt', `reports/${r.at.slice(0, 10)}/${r.id}.json`],
  ]
  const table = `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" class="m-ink" style="font-size:15px;line-height:1.5">${rows.map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;opacity:.7;white-space:nowrap;vertical-align:top">${escapeHtml(k)}</td><td style="padding:4px 0;font-weight:600;word-break:break-all">${escapeHtml(v)}</td></tr>`).join('')}</table>`
  const quote = (text: string) => `<blockquote style="margin:12px 0;padding:8px 12px;border-left:3px solid #94a3b8;white-space:pre-wrap;font-size:14px">${escapeHtml(text)}</blockquote>`
  const what =
    r.kind === 'set'
      ? r.hidden
        ? `Liste ${HIDE_AFTER} farklı kişi tarafından şikâyet edildiği için topluluk kütüphanesinden kendiliğinden kaldırıldı (liste silinmedi).`
        : `Liste ${HIDE_AFTER} farklı kişi şikâyet edince kütüphaneden kendiliğinden kalkar.`
      : r.kind === 'club'
        ? 'Oda yalnızca bellekte yaşar; aşağıdaki içerik şikâyet edenin ekranında görünendir.'
        : ''
  const lastNote = last ? `Bugün ${MAILS_A_DAY} şikâyet bildirimine ulaşıldı; bugünün geri kalanı yalnızca depoda (reports/).` : ''
  const subject = `Diloloji: şikâyet · ${KIND_TEXT[r.kind]} · ${REASON_TEXT[r.reason]}${last ? ' · bugünün son bildirimi' : ''}`
  return {
    to,
    subject,
    html: mailLayout({
      preheader: `${KIND_TEXT[r.kind]}: ${REASON_TEXT[r.reason]}`,
      title: 'Bir şikâyet geldi',
      mascot: 'think',
      body: `${table}${r.note ? `${paragraph('Şikâyet edenin notu:')}${quote(r.note)}` : ''}${paragraph('İçerik:')}${quote(r.content)}${what ? paragraph(escapeHtml(what)) : ''}${lastNote ? paragraph(escapeHtml(lastNote)) : ''}`,
      footer: 'Bu bildirim yalnızca site sahibine gider (OWNER_EMAIL). Kullanıcı içeriği politikası gereği şikâyetlere 24 saat içinde bakılması önerilir.',
      site,
    }),
    text: `${rows.map(([k, v]) => `${k}: ${v}`).join('\n')}${r.note ? `\n\nNot: ${r.note}` : ''}\n\nİçerik:\n${r.content}${what ? `\n\n${what}` : ''}${lastNote ? `\n\n${lastNote}` : ''}`,
  }
}

/** Tells the owner (never throws: the report is kept whether or not the mail goes). */
async function mailOwner(r: Report, store?: QuotaStore): Promise<void> {
  try {
    const to = ownerAddress()
    if (!to || !mailConfigured()) return
    const nth = (await quotaUsed('report-notice', 'owner', store)) + 1
    if (nth > MAILS_A_DAY) return
    await spendQuota('report-notice', 'owner', 1, store)
    await sendMail([reportMail(to, r, nth)])
  } catch (e) {
    console.error('[report-mail-failed]', e)
  }
}

/** Files a report from the account `reporter`. */
export async function fileReport(reporter: string, body: Record<string, unknown>, store?: QuotaStore): Promise<ReportResult> {
  const kind = REPORT_KINDS.find((k) => k === body.kind)
  const reason = REASONS.find((r) => r === body.reason)
  const raw = typeof body.target === 'string' ? body.target.trim() : ''
  // List ids are lower-case hex, codes upper-case; a message id is taken as it is.
  const target = kind === 'set' ? raw.toLowerCase() : kind === 'message' ? raw : raw.toUpperCase()
  if (!kind || !reason || !target) return 'bad_request'
  if (!(await quotaLeft('report', reporter, 1, REPORTS_A_DAY, store))) return 'too_many'
  const found = await snapshot(reporter, kind, target, plain(body.shown, MAX_CONTENT))
  if (!found) return 'not_found'
  await spendQuota('report', reporter, 1, store)
  const at = new Date().toISOString()
  const report: Report = {
    id: newId(),
    at,
    kind,
    reason,
    note: plain(body.note, MAX_NOTE),
    reporter,
    target,
    ...found,
  }
  if (kind === 'set' && (await countForList(target, reporter, found.about?.owner))) report.hidden = true
  await writeJson(`reports/${at.slice(0, 10)}/${report.id}.json`, report)
  await mailOwner(report, store)
  return 'ok'
}
