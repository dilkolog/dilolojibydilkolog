/**
 * A small brake for the endpoints anyone can reach: at most `max` calls per address in a window.
 * The count lives in the memory of the running function instance, so it is a brake on bursts and
 * scripts, not an exact global quota (instances come and go, and several may run at once). Nothing
 * is stored; the address is only a map key and is never logged or written.
 */
const hits = new Map<string, number[]>()
const MAX_KEYS = 5000

/** The caller's address as Vercel's proxy reports it ("unknown" when it does not). */
export function clientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || request.headers.get('x-real-ip')?.trim() || 'unknown'
}

/** True when this call is over the limit (and then it is not counted). */
export function overLimit(request: Request, name: string, max: number, windowMs = 60_000, now = Date.now()): boolean {
  const key = `${name}|${clientKey(request)}`
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs)
  if (recent.length >= max) {
    hits.set(key, recent)
    return true
  }
  recent.push(now)
  hits.set(key, recent)
  if (hits.size > MAX_KEYS) {
    for (const [k, times] of hits) if (!times.some((t) => now - t < windowMs)) hits.delete(k)
    // Still too many live keys: forget the oldest rather than grow without end.
    for (const k of hits.keys()) {
      if (hits.size <= MAX_KEYS) break
      hits.delete(k)
    }
  }
  return false
}

export const tooMany = () => new Response(JSON.stringify({ error: 'too many requests' }), { status: 429, headers: { 'content-type': 'application/json', 'retry-after': '60', 'cache-control': 'no-store' } })

export const resetRate = () => hits.clear()
