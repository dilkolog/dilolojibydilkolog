/**
 * The same mailbox under another spelling: Gmail ignores dots and everything after "+", a few other providers ignore the
 * "+tag". The sign-up check lives in the database (supabase/migrations/0008_email_aliases.sql, `normalize_email`); this
 * is its twin so the rules are written once in a form that is tested (and the migration is tested against these lists).
 */
export const GMAIL_HOSTS = ['gmail.com', 'googlemail.com'] as const
export const PLUS_ONLY_HOSTS = ['outlook.com', 'hotmail.com', 'live.com', 'msn.com', 'icloud.com', 'me.com', 'proton.me', 'protonmail.com', 'pm.me', 'fastmail.com'] as const

export function normalizeEmail(address: string): string {
  const e = address.trim().toLowerCase()
  const at = e.indexOf('@')
  const local = at < 0 ? e : e.slice(0, at)
  const rawHost = at < 0 ? '' : e.slice(at + 1)
  if (!local || !rawHost || rawHost.includes('@')) return e
  const host = rawHost === 'googlemail.com' ? 'gmail.com' : rawHost
  const tagless = local.split('+')[0]
  if (host === 'gmail.com') return `${tagless.replaceAll('.', '')}@${host}`
  if ((PLUS_ONLY_HOSTS as readonly string[]).includes(host)) return `${tagless}@${host}`
  return `${local}@${host}`
}

/** Whether two addresses reach the same mailbox though they are written differently. */
export const sameMailbox = (a: string, b: string): boolean => a.trim().toLowerCase() !== b.trim().toLowerCase() && normalizeEmail(a) === normalizeEmail(b)
