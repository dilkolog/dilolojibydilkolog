import { get } from '@vercel/blob'
import { readText, writeJson } from './_account.js'
import { APP_URL, EMAIL, mailConfigured, sendMail, type Mail } from './_mail.js'
import { escapeHtml, mailLayout, paragraph } from './_mailLayout.js'
import { rest, supabaseOn } from './_supabase.js'

/**
 * Is the site healthy? Two ways to know:
 * - GET /api/health (health.ts): the Worker answers, Supabase and R2 can be reached. An outside monitor (UptimeRobot or
 *   similar, set up by the owner) polls it every few minutes and mails when the site is down: a Worker that is down
 *   cannot say so itself.
 * - Every hour the scheduled job runs the same checks plus the settings the site needs (secrets present), and mails the
 *   owner when the set of problems changes: once when something breaks, once when it is fixed, never every hour.
 */

export type CheckState = 'ok' | 'down' | 'off'

export interface Health {
  ok: boolean
  supabase: CheckState
  storage: CheckState
}

const timed = <T>(p: Promise<T>, ms = 5000) => Promise.race([p, new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms))])

/** Supabase answers (any HTTP answer from its API counts: a missing table is not an outage). */
async function supabaseState(): Promise<CheckState> {
  if (!supabaseOn()) return 'off'
  try {
    const res = await timed(rest('server_flags?select=name&limit=1'))
    return res.status < 500 ? 'ok' : 'down'
  } catch {
    return 'down'
  }
}

/** R2 answers a read (a file that is not there is an answer too). */
async function storageState(): Promise<CheckState> {
  try {
    await timed(get('health/ping.txt', { access: 'private', useCache: false }))
    return 'ok'
  } catch {
    return 'down'
  }
}

export async function checkHealth(): Promise<Health> {
  const [supabase, storage] = await Promise.all([supabaseState(), storageState()])
  return { ok: supabase !== 'down' && storage !== 'down', supabase, storage }
}

/** The Worker secrets the site needs, with what stops without each. Names only: values are never read out. */
const NEEDED: [string, string][] = [
  ['SUPABASE_URL', 'giriş, eşitleme ve onay'],
  ['SUPABASE_SECRET_KEY', 'giriş, eşitleme ve onay'],
  ['CRON_SECRET', 'saatlik hatırlatmalar'],
  ['RESEND_API_KEY', 'mailler (bu uyarı dahil)'],
  ['OWNER_EMAIL', 'size giden bildirimler ve yönetim ekranı'],
  ['ANTHROPIC_API_KEY', 'YZ özellikleri'],
  ['DEEPL_AUTH_KEY', 'çeviri'],
]

/** What is wrong right now, each a short Turkish line (empty when all is well). */
export async function problems(health?: Health): Promise<string[]> {
  const h = health ?? (await checkHealth())
  const out: string[] = []
  if (h.supabase === 'down') out.push('Supabase’e ulaşılamıyor: giriş, eşitleme ve onay çalışmıyor olabilir.')
  if (h.storage === 'down') out.push('Cloudflare R2 depolamasına ulaşılamıyor.')
  for (const [name, what] of NEEDED) if (!process.env[name]?.trim()) out.push(`${name} tanımlı değil (${what}).`)
  return out
}

/** Kept in R2, not in Supabase: the state must be readable while Supabase is the thing that is down. */
const STATE_PATH = 'health/state.json'

interface HealthState {
  problems: string[]
  /** Since when the problems have been as they are. */
  since: string
}

const ownerAddress = () => [process.env.OWNER_EMAIL, process.env.ERROR_DIGEST_TO].map((v) => v?.trim().split(',')[0]?.trim() ?? '').find((v) => EMAIL.test(v)) ?? ''

const timeText = (at: string) => new Date(at).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', dateStyle: 'medium', timeStyle: 'short' })

export function healthMail(to: string, now: string[], before: string[], since: string, site = APP_URL): Mail {
  const fixed = before.filter((p) => !now.includes(p))
  const broken = now.filter((p) => !before.includes(p))
  const allClear = now.length === 0
  const subject = allClear ? 'Diloloji: sorunlar giderildi' : `Diloloji: ${broken.length ? 'yeni sorun' : 'sorun sürüyor'} (${now.length})`
  const list = (items: string[]) => `<ul style="margin:8px 0 12px;padding-left:20px">${items.map((p) => `<li style="margin:4px 0">${escapeHtml(p)}</li>`).join('')}</ul>`
  const body = [
    broken.length ? `${paragraph('Yeni:')}${list(broken)}` : '',
    !allClear && broken.length !== now.length ? `${paragraph('Süren:')}${list(now.filter((p) => !broken.includes(p)))}` : '',
    fixed.length ? `${paragraph('Düzelen:')}${list(fixed)}` : '',
    paragraph(escapeHtml(allClear ? 'Saatlik denetimde her şey yerinde.' : `Saatlik denetim, ${timeText(since)} itibarıyla.`)),
  ].join('')
  return {
    to,
    subject,
    html: mailLayout({
      preheader: allClear ? 'Her şey yerinde.' : (broken[0] ?? now[0] ?? ''),
      title: allClear ? 'Sorunlar giderildi' : 'Sitede bir sorun var',
      mascot: allClear ? 'cheer' : 'think',
      body,
      footer: 'Bu mail yalnızca site sahibine gider (OWNER_EMAIL) ve yalnızca sorunlar değişince gelir. Site tamamen kapanırsa bu denetim de çalışamaz: onun için dış gözcü (UptimeRobot) /api/health adresini yoklar.',
      site,
    }),
    text: [broken.length ? `Yeni:\n${broken.map((p) => `- ${p}`).join('\n')}` : '', !allClear ? `Şu an:\n${now.map((p) => `- ${p}`).join('\n')}` : '', fixed.length ? `Düzelen:\n${fixed.map((p) => `- ${p}`).join('\n')}` : '', allClear ? 'Her şey yerinde.' : '']
      .filter(Boolean)
      .join('\n\n'),
  }
}

export type AlertResult = 'same' | 'sent' | 'off' | 'failed'

/**
 * The hourly check: mails the owner when the problems differ from last time (broken, fixed, or changed), then keeps the
 * new state. The first run with no problems keeps the state quietly. Never throws.
 */
export async function healthAlert(now = Date.now()): Promise<AlertResult> {
  try {
    const current = (await problems()).sort()
    let state: HealthState | null = null
    try {
      state = JSON.parse((await readText(STATE_PATH)) ?? 'null') as HealthState | null
    } catch {
      state = null
    }
    const before = (state?.problems ?? []).slice().sort()
    if (JSON.stringify(before) === JSON.stringify(current)) return 'same'
    const at = new Date(now).toISOString()
    const keep = () => writeJson(STATE_PATH, { problems: current, since: at } satisfies HealthState).catch(() => undefined)
    // Nothing known before and nothing wrong now: no news.
    if (!state && current.length === 0) {
      await keep()
      return 'same'
    }
    const to = ownerAddress()
    if (!to || !mailConfigured()) {
      await keep()
      return 'off'
    }
    const { sent } = await sendMail([healthMail(to, current, before, at)])
    if (!sent) return 'failed'
    await keep()
    return 'sent'
  } catch (e) {
    console.error('[health-alert-failed]', e)
    return 'failed'
  }
}
