/**
 * POST /api/ai: the Anthropic Messages API behind the owner's key (ANTHROPIC_API_KEY, a Worker secret), so
 * the AI features need no key from the people using the site.
 * GET /api/ai: whether the server has a key (the app shows the AI features only when it does).
 *
 * The key is the owner's money on a public address, so: only the app's own pages may ask, only an approved
 * account, a few calls a minute and AI_DAILY_CALLS a day per account (default 150), a request body of at most
 * MAX_BODY bytes, only the models the app offers, no tools and no streaming (the app uses neither), and
 * max_tokens capped. The answer goes back as Anthropic wrote it (the SDK reads usage and refusals from it).
 */

import { accountOf, requireApproved } from './_account.js'
import { fromApp } from './_origin.js'
import { overLimit, tooMany } from './_rate.js'
import { dailyQuotaReached, quotaLeft, spendQuota } from './_quota.js'

export { fromApp }

/** The photo-to-words feature sends a downscaled picture: base64 of about a megabyte is the biggest body. */
export const MAX_BODY = 3_000_000
export const MAX_TOKENS = 16_000
export const DEFAULT_DAILY_CALLS = 150
/** The models the app lets people choose (src/ai/usage.ts AI_MODELS) and the one the safety fallback may pick. */
export const MODELS = ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-4-5']
const BETA = /^[a-z0-9][a-z0-9.,\- ]{0,200}$/

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'cache-control': 'no-store' } })
const dailyCalls = () => Math.max(1, Number(process.env.AI_DAILY_CALLS) || DEFAULT_DAILY_CALLS)

export async function GET(request: Request): Promise<Response> {
  if (!fromApp(request)) return json({ error: 'forbidden' }, 403)
  const denied = await requireApproved(request)
  if (denied) return denied
  return json({ available: !!process.env.ANTHROPIC_API_KEY?.trim() })
}

/** Why a request body may not go on, or null. */
export function refuse(body: unknown): string | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'bad body'
  const b = body as Record<string, unknown>
  if (typeof b.model !== 'string' || !MODELS.includes(b.model)) return 'bad model'
  if (b.stream) return 'no streaming'
  if (b.tools !== undefined || b.mcp_servers !== undefined || b.container !== undefined) return 'no tools'
  if (!Array.isArray(b.messages) || b.messages.length === 0) return 'bad messages'
  if (typeof b.max_tokens !== 'number' || !(b.max_tokens > 0) || b.max_tokens > MAX_TOKENS) return 'bad max_tokens'
  return null
}

export async function POST(request: Request): Promise<Response> {
  const key = process.env.ANTHROPIC_API_KEY?.trim()
  if (!key) return json({ error: 'not configured' }, 503)
  if (!fromApp(request)) return json({ error: 'forbidden' }, 403)
  const denied = await requireApproved(request)
  if (denied) return denied
  if (overLimit(request, 'ai', 20)) return tooMany()
  const length = Number(request.headers.get('content-length') ?? 0)
  if (length > MAX_BODY) return json({ error: 'too large' }, 413)
  const text = await request.text().catch(() => '')
  if (!text || text.length > MAX_BODY) return json({ error: 'too large' }, 413)
  let body: unknown
  try {
    body = JSON.parse(text)
  } catch {
    return json({ error: 'bad body' }, 400)
  }
  const bad = refuse(body)
  if (bad) return json({ error: bad }, 400)

  const account = await accountOf(request).catch(() => null)
  if (account && !(await quotaLeft('ai', account, 1, dailyCalls()))) return dailyQuotaReached()

  const beta = request.headers.get('anthropic-beta')?.trim()
  const res = await fetch('https://api.anthropic.com/v1/messages?beta=true', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      ...(beta && BETA.test(beta) ? { 'anthropic-beta': beta } : {}),
    },
    body: text,
    signal: AbortSignal.timeout(150_000),
  }).catch(() => null)
  if (!res) return json({ error: 'unavailable' }, 502)
  if (account && res.ok) await spendQuota('ai', account, 1)
  // The key's own failures (a wrong or empty key, no credit) must not reach the page as the user's: they are the owner's to fix.
  if (res.status === 401 || res.status === 403) {
    console.error(`[ai-proxy] Anthropic answered ${res.status}: check ANTHROPIC_API_KEY and the account's credit`)
    return json({ error: 'unavailable' }, 502)
  }
  return new Response(res.body, { status: res.status, headers: { 'content-type': res.headers.get('content-type') ?? 'application/json', 'cache-control': 'no-store' } })
}
