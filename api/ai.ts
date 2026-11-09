/**
 * POST /api/ai: the Anthropic Messages API behind the owner's key (ANTHROPIC_API_KEY, a Worker secret), so
 * the AI features need no key from the people using the site.
 * GET /api/ai: whether the server has a key (the app shows the AI features only when it does).
 *
 * The key is the owner's money on a public address, so: only the app's own pages may ask, only an approved
 * account, a few calls a minute, AI_DAILY_CALLS calls (default 150) and AI_DAILY_BUDGET_USD (default 0.75) a day
 * per account (the money is counted from the usage Anthropic reports, so a few big calls cannot hide behind the
 * call count), a request body of at most MAX_BODY bytes, only the models the app offers, no tools and no streaming
 * (the app uses neither), and max_tokens capped. What each account may do is the owner's call: profiles.ai_level
 * (kapali, kelime, calisma, tam; src/ai/levels.ts) says which features its requests may name (the x-ai-feature header),
 * and the day's money is shared out by level. A request names its feature honestly or it is not the app's: the
 * level keeps the app's own screens in line and bulk misuse in bounds, the money limit is the hard stop. The answer goes back as Anthropic wrote it (the SDK reads usage and refusals from it).
 */

import { accountOf, requireApproved } from './_account.js'
import { fromApp } from './_origin.js'
import { overLimit, tooMany } from './_rate.js'
import { dailyQuotaReached, quotaRefund, quotaTake, spendQuota } from './_quota.js'
import { aiLevelOf } from './_supabase.js'
import { limitOf } from './_settings.js'
import { BUDGET_SHARE, DEFAULT_AI_LEVEL, FEATURE_LEVEL, featuresOf, isAiFeature, isAiLevel, levelAllows, type AiLevel } from '../src/ai/levels.js'

export { fromApp }

/** The photo-to-words feature sends a downscaled picture: base64 of about a megabyte is the biggest body. */
export const MAX_BODY = 1_200_000
export const MAX_TOKENS = 16_000
export const DEFAULT_DAILY_CALLS = 150
/** The models the app lets people choose (src/ai/usage.ts AI_MODELS) and the one the safety fallback may pick. */
export const MODELS = ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-4-5']
/** USD per million tokens (input, output), as in src/ai/usage.ts AI_MODELS. */
const PRICE: Record<string, [number, number]> = { 'claude-opus-5-5': [4, 20], 'claude-sonnet-5-5': [2, 10], 'claude-haiku-4-5': [1, 5] }
/** The money is counted in ten-thousandths of a dollar, so the day's file holds whole numbers. */
const UNIT = 10_000
export const DEFAULT_DAILY_BUDGET_USD = 0.75
const BETA = /^[a-z0-9][a-z0-9.,\- ]{0,200}$/

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'cache-control': 'no-store' } })
/** The owner's limits (admin screen), else the Worker variables, else the defaults. */
const dailyCalls = async () => Math.max(1, await limitOf('aiDailyCalls', DEFAULT_DAILY_CALLS, 'AI_DAILY_CALLS'))
const dailyBudget = async (level: AiLevel = 'tam') => Math.round((await limitOf('aiDailyBudgetUsd', DEFAULT_DAILY_BUDGET_USD, 'AI_DAILY_BUDGET_USD')) * UNIT * BUDGET_SHARE[level])

/** The level the owner gave the request's account: the default one when none is set; without accounts (local development) everything is open. */
export async function levelOf(request: Request): Promise<AiLevel> {
  const id = await accountOf(request).catch(() => null)
  if (!id) return 'tam'
  const set = await aiLevelOf(id)
  return isAiLevel(set) ? set : DEFAULT_AI_LEVEL
}

/** What an answer cost, in budget units, from the usage it reports (0 when it reports none). */
export function costUnits(model: string, usage: unknown): number {
  const price = PRICE[model]
  const u = usage as { input_tokens?: unknown; output_tokens?: unknown; cache_read_input_tokens?: unknown; cache_creation_input_tokens?: unknown } | null
  if (!price || !u) return 0
  const n = (x: unknown) => (typeof x === 'number' && x > 0 ? x : 0)
  const usd = (n(u.input_tokens) * price[0] + n(u.output_tokens) * price[1] + n(u.cache_read_input_tokens) * price[0] * 0.1 + n(u.cache_creation_input_tokens) * price[0] * 1.25) / 1_000_000
  return Math.ceil(usd * UNIT)
}

/**
 * What a request is counted as before its answer is known: its text as input (four characters a token, at most
 * RESERVE_INPUT of them: a photo's base64 is far fewer tokens than characters) and up to RESERVE_OUTPUT tokens of answer.
 * A usual call's cost, not the worst one: the app's own parallel calls must still fit into a day's money.
 */
const RESERVE_INPUT = 50_000
const RESERVE_OUTPUT = 4_000
export function reserveUnits(model: string, bodyLength: number, maxTokens: number): number {
  return costUnits(model, { input_tokens: Math.min(RESERVE_INPUT, Math.ceil(bodyLength / 4)), output_tokens: Math.min(RESERVE_OUTPUT, maxTokens) })
}

export async function GET(request: Request): Promise<Response> {
  if (!fromApp(request)) return json({ error: 'forbidden' }, 403)
  const denied = await requireApproved(request)
  if (denied) return denied
  const level = await levelOf(request)
  return json({ available: !!process.env.ANTHROPIC_API_KEY?.trim() && level !== 'kapali', level, features: featuresOf(level) })
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

  const feature = request.headers.get('x-ai-feature')?.trim()
  if (!isAiFeature(feature)) return json({ error: 'bad feature' }, 400)
  const level = await levelOf(request)
  if (!levelAllows(level, feature)) return json({ error: 'ai_level', level, needs: FEATURE_LEVEL[feature] }, 403)

  // The day's call and an estimate of its money are taken before the call, each in one step: requests sent at once
  // cannot all pass a check made before any of them was counted. The money line is "nothing more once the day's money
  // is used up" (the last call may go over it), so the estimate is allowed on top of the budget; calls in flight count.
  const account = await accountOf(request).catch(() => null)
  const { model, max_tokens: maxTokens } = body as { model: string; max_tokens: number }
  const takenAt = Date.now()
  const reserved = account ? reserveUnits(model, text.length, maxTokens) : 0
  if (account && !(await quotaTake('ai', account, 1, await dailyCalls(), undefined, takenAt))) return dailyQuotaReached()
  if (account && !(await quotaTake('ai-cost', account, reserved, (await dailyBudget(level)) + reserved, undefined, takenAt))) {
    await quotaRefund('ai', account, 1, undefined, takenAt)
    return dailyQuotaReached()
  }
  /** A call that did not go through costs nothing: the call and its money are given back. */
  const giveBack = async () => {
    if (!account) return
    await quotaRefund('ai', account, 1, undefined, takenAt)
    await quotaRefund('ai-cost', account, reserved, undefined, takenAt)
  }

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
  if (!res?.ok) await giveBack()
  if (!res) return json({ error: 'unavailable' }, 502)
  // The key's own failures (a wrong or empty key, no credit) must not reach the page as the user's: they are the owner's to fix.
  if (res.status === 401 || res.status === 403) {
    console.error(`[ai-proxy] Anthropic answered ${res.status}: check ANTHROPIC_API_KEY and the account's credit`)
    return json({ error: 'unavailable' }, 502)
  }
  const answer = await res.text().catch(() => '')
  // The money is settled from what Anthropic says it used: the difference to the estimate is added or given back.
  if (account && res.ok) {
    let usage: unknown = null
    try {
      usage = (JSON.parse(answer) as { usage?: unknown }).usage
    } catch {
      // Not JSON: the estimate stands.
    }
    const units = usage ? costUnits(model, usage) : reserved
    if (units > reserved) await spendQuota('ai-cost', account, units - reserved, undefined, takenAt)
    else await quotaRefund('ai-cost', account, reserved - units, undefined, takenAt)
  }
  return new Response(answer, { status: res.status, headers: { 'content-type': res.headers.get('content-type') ?? 'application/json', 'cache-control': 'no-store' } })
}
