/**
 * The invite link: `/?davet=<friend code>`. Whoever opens it is a new arrival or an old friend, signed in or
 * not, so the code is kept on the device until there is an account to use it with (a Google or mail sign-in
 * leaves the page and comes back); then InviteAccept adds the inviter as a friend (a friend is mutual).
 */
const KEY = 'diloloji:invite-in'
/** A link older than this is let go: it was opened long ago and never used. */
const KEEP_DAYS = 14
const PARAM = 'davet'
/** The friend code's alphabet (api/_friends.ts CODE): no 0, 1, I, L, O. */
const CODE = /^[2-9A-HJKMNP-Z]{8}$/

/** The code in a typed or pasted form (ABCD-EFGH, lower case), or null if it cannot be one. */
export function cleanCode(raw: string | null | undefined): string | null {
  const code = (raw ?? '').replace(/[\s-]/g, '').toUpperCase()
  return CODE.test(code) ? code : null
}

/** The link to pass on for a friend code. */
export const inviteLink = (code: string, origin = location.origin) => `${origin}/?${PARAM}=${code}`

/** Takes `?davet=…` off the address (the rest of it stays) and keeps the code; the code, or null if the address had none. */
export function captureInvite(now = Date.now()): string | null {
  const params = new URLSearchParams(location.search)
  if (!params.has(PARAM)) return null
  const code = cleanCode(params.get(PARAM))
  params.delete(PARAM)
  const rest = params.toString()
  history.replaceState(null, '', `${location.pathname}${rest ? `?${rest}` : ''}${location.hash}`)
  if (!code) return null
  try {
    localStorage.setItem(KEY, JSON.stringify({ code, at: now }))
  } catch {
    // Not kept: the link has to be opened again after signing in.
  }
  return code
}

/** The code waiting to be used, if one was kept and is not too old. */
export function pendingInvite(now = Date.now()): string | null {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? 'null') as { code?: unknown; at?: unknown } | null
    const code = cleanCode(typeof v?.code === 'string' ? v.code : null)
    if (code && typeof v?.at === 'number' && now - v.at < KEEP_DAYS * 86_400_000) return code
  } catch {
    // Nothing usable.
  }
  return null
}

export function clearInvite(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // Nothing to clear.
  }
}
