import { rest, supabaseOn } from './_supabase.js'

/**
 * The owner's switches from the admin screen, kept in Supabase `server_flags` under the name 'settings' (the table is
 * from 0003; no new migration). Each instance remembers them for a minute, so a change reaches every request within
 * that. Without Supabase, or when the row cannot be read, every value falls back to its Worker variable or default:
 * a failed read never closes anything.
 *
 * - Daily limits per account: AI calls and money, translated characters, natural-voice characters; the AI money of the
 *   whole site in a day (aiSiteBudgetUsd).
 * - autoApprove: a new person is approved at their first sign-in (no waiting list).
 * - facebookLogin: the sign-in page offers Facebook (the owner turns it on once the Meta app is set up).
 * - announcement: one short message every signed-in person gets once in their bell.
 */

export interface Announcement {
  id: string
  text: string
  at: string
}

export interface ServerSettings {
  aiDailyCalls?: number
  aiDailyBudgetUsd?: number
  aiSiteBudgetUsd?: number
  translateChars?: number
  ttsChars?: number
  autoApprove?: boolean
  facebookLogin?: boolean
  announcement?: Announcement | null
}

/** Each limit's allowed range (the screen shows the same). */
export const LIMITS = {
  aiDailyCalls: { min: 1, max: 2000 },
  aiDailyBudgetUsd: { min: 0.01, max: 50 },
  aiSiteBudgetUsd: { min: 0.5, max: 500 },
  translateChars: { min: 500, max: 500_000 },
  ttsChars: { min: 500, max: 500_000 },
} as const
export type LimitName = keyof typeof LIMITS

export const MAX_ANNOUNCEMENT = 220
/** An announcement older than this is no longer handed out. */
export const ANNOUNCEMENT_DAYS = 30

const REMEMBER_MS = 60_000
let remembered: { at: number; value: ServerSettings } | null = null
export const forgetSettings = () => void (remembered = null)

const inRange = (name: LimitName, v: unknown): number | undefined => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v) : NaN
  if (!Number.isFinite(n)) return undefined
  const { min, max } = LIMITS[name]
  return n >= min && n <= max ? (name === 'aiDailyBudgetUsd' || name === 'aiSiteBudgetUsd' ? Math.round(n * 100) / 100 : Math.round(n)) : undefined
}

function cleanAnnouncement(v: unknown): Announcement | null | undefined {
  if (v === null) return null
  if (!v || typeof v !== 'object') return undefined
  const a = v as Record<string, unknown>
  const text = typeof a.text === 'string' ? a.text.replace(/[\p{Cc}\p{Cf}]/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_ANNOUNCEMENT) : ''
  if (!text || typeof a.id !== 'string' || !/^[a-z0-9-]{4,40}$/.test(a.id) || typeof a.at !== 'string' || Number.isNaN(Date.parse(a.at))) return undefined
  return { id: a.id, text, at: a.at }
}

/** Only known fields with sane values survive (what is stored and what the screen sends go through here). */
export function cleanSettings(raw: unknown): ServerSettings {
  const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const out: ServerSettings = {}
  for (const name of Object.keys(LIMITS) as LimitName[]) {
    const v = inRange(name, r[name])
    if (v !== undefined) out[name] = v
  }
  if (typeof r.autoApprove === 'boolean') out.autoApprove = r.autoApprove
  if (typeof r.facebookLogin === 'boolean') out.facebookLogin = r.facebookLogin
  const a = cleanAnnouncement(r.announcement)
  if (a !== undefined) out.announcement = a
  return out
}

export async function getSettings(now = Date.now()): Promise<ServerSettings> {
  if (!supabaseOn()) return {}
  if (remembered && now - remembered.at < REMEMBER_MS) return remembered.value
  let value: ServerSettings = {}
  try {
    const res = await rest('server_flags?name=eq.settings&select=value')
    if (res.ok) value = cleanSettings(((await res.json()) as { value: unknown }[])[0]?.value)
    else if (remembered) value = remembered.value
  } catch {
    if (remembered) value = remembered.value
  }
  remembered = { at: now, value }
  return value
}

/** Merges `change` into what is stored (a field set to null is removed; the announcement null clears it). */
export async function saveSettings(change: Record<string, unknown>): Promise<ServerSettings> {
  forgetSettings()
  const current = await getSettings()
  const merged: Record<string, unknown> = { ...current }
  for (const [key, value] of Object.entries(change)) {
    if (value === null && key !== 'announcement') delete merged[key]
    else merged[key] = value
  }
  const next = cleanSettings(merged)
  const res = await rest('server_flags?on_conflict=name', {
    method: 'POST',
    headers: { prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ name: 'settings', value: next, updated_at: new Date().toISOString() }),
  })
  if (!res.ok) throw new Error(`supabase ${res.status}`)
  remembered = { at: Date.now(), value: next }
  return next
}

const envNumber = (name: string) => {
  const n = Number(process.env[name])
  return Number.isFinite(n) && n > 0 ? n : undefined
}

/** The limit in force: the owner's setting, else the Worker variable, else the code's default. */
export async function limitOf(name: LimitName, fallback: number, env?: string): Promise<number> {
  const set = (await getSettings())[name]
  return set ?? (env ? envNumber(env) : undefined) ?? fallback
}

/** The announcement still handed out (not older than 30 days), if any. */
export async function currentAnnouncement(now = Date.now()): Promise<Announcement | null> {
  const a = (await getSettings(now)).announcement
  if (!a) return null
  return now - Date.parse(a.at) <= ANNOUNCEMENT_DAYS * 86_400_000 ? a : null
}
