/**
 * GET /api/translate?text=…&from=fr&to=tr: one sentence translated by DeepL with the server's
 * key (DEEPL_AUTH_KEY, a Vercel environment variable), so the app has translations ready on
 * every device without anyone pasting a key.
 * GET /api/translate?usage=1: this month's characters used and the limit, for Settings.
 *
 * The key is the owner's, on a public address, so: only the app's own pages may ask (Origin or
 * Referer, or a same-origin fetch), one sentence of at most MAX_CHARS at a time, and an answer is
 * cached by the CDN for a long time, so the same sentence never costs twice. DeepL's free plan
 * (500,000 characters a month) stops when used up and never charges.
 */

import { requireApproved } from './_account.js'
import { fromApp } from './_origin.js'

export { fromApp }

/** Longest text translated in one request: a sentence or two, not a book. */
export const MAX_CHARS = 600

const LANGS = { en: 'EN', fr: 'FR', es: 'ES', tr: 'TR' } as const
type Lang = keyof typeof LANGS
/** Target codes: English needs a variant. */
const TARGET: Record<Lang, string> = { en: 'EN-GB', fr: 'FR', es: 'ES', tr: 'TR' }

/** Free-plan keys end in ":fx" and go to the free endpoint. */
export const endpoint = (key: string) => (key.endsWith(':fx') ? 'https://api-free.deepl.com' : 'https://api.deepl.com')

const json = (body: unknown, status = 200, cache = 'no-store') => Response.json(body, { status, headers: { 'cache-control': cache } })

export async function GET(request: Request): Promise<Response> {
  const key = process.env.DEEPL_AUTH_KEY?.trim()
  if (!key) return json({ error: 'not configured' }, 503)
  if (!fromApp(request)) return json({ error: 'forbidden' }, 403)
  const denied = await requireApproved(request)
  if (denied) return denied
  const params = new URL(request.url).searchParams
  const auth = { authorization: `DeepL-Auth-Key ${key}` }

  if (params.get('usage')) {
    const res = await fetch(`${endpoint(key)}/v2/usage`, { headers: auth, signal: AbortSignal.timeout(8000) }).catch(() => null)
    if (!res?.ok) return json({ error: 'unavailable' }, 502)
    const u = (await res.json()) as { character_count?: number; character_limit?: number }
    return json({ count: u.character_count ?? 0, limit: u.character_limit ?? 0 })
  }

  const text = (params.get('text') ?? '').trim()
  const to = params.get('to') as Lang | null
  const from = params.get('from') as Lang | null
  if (!text || text.length > MAX_CHARS) return json({ error: 'bad text' }, 400)
  if (!to || !(to in LANGS) || (from && !(from in LANGS)) || from === to) return json({ error: 'bad language' }, 400)

  const res = await fetch(`${endpoint(key)}/v2/translate`, {
    method: 'POST',
    headers: { ...auth, 'content-type': 'application/json' },
    body: JSON.stringify({ text: [text], target_lang: TARGET[to], ...(from ? { source_lang: LANGS[from] } : {}) }),
    signal: AbortSignal.timeout(10000),
  }).catch(() => null)
  // 456: this month's characters are used up; 429: too many at once. Both say "later", not "broken".
  if (!res) return json({ error: 'unavailable' }, 502)
  if (res.status === 456) return json({ error: 'quota' }, 429)
  if (res.status === 429) return json({ error: 'busy' }, 429)
  if (!res.ok) return json({ error: 'unavailable' }, 502)
  const out = (await res.json()) as { translations?: { text: string }[] }
  const translation = out.translations?.[0]?.text?.trim()
  if (!translation) return json({ error: 'unavailable' }, 502)
  // The same sentence translates the same way: the CDN answers it from now on.
  return json({ translation }, 200, 'public, s-maxage=31536000, stale-while-revalidate=86400')
}
