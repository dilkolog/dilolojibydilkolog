/**
 * POST /api/ai: the Anthropic Messages API behind the owner's key (ANTHROPIC_API_KEY, a Worker secret), so
 * the AI features need no key from the people using the site.
 * GET /api/ai: whether the server has a key (the app shows the AI features only when it does).
 *
 * The key is the owner's money on a public address, so: only the app's own pages may ask, only an approved
 * account, a few calls a minute, AI_DAILY_CALLS calls (default 150) and AI_DAILY_BUDGET_USD (default 0.75) a day
 * per account and AI_SITE_DAILY_BUDGET_USD (default 5) for the whole site (the money is counted from the usage Anthropic reports, priced by the model that answered, so a few big
 * calls cannot hide behind the call count and a fallback model is not priced as the one asked for), a request body of
 * at most MAX_BODY bytes holding only the fields the app sends (FIELDS: no tools, no streaming, no other paid options),
 * only the models the app offers, only the beta features the app uses, and max_tokens capped. The call and an estimate
 * of its money (all of max_tokens) are set aside before it goes out (one statement in Supabase, so requests sent at
 * once cannot all see room left), then corrected to what it cost; a counter that cannot be read refuses the call. What each account may do is the owner's call: profiles.ai_level
 * (kapali, kelime, calisma, tam; src/ai/levels.ts) says which features its requests may name (the x-ai-feature header),
 * and the day's money is shared out by level. A request names its feature honestly or it is not the app's: the
 * level keeps the app's own screens in line and bulk misuse in bounds, the money limit is the hard stop. The answer goes back as Anthropic wrote it (the SDK reads usage and refusals from it).
 */

import { accountOf, requireApproved } from './_account.js'
import { fromApp } from './_origin.js'
import { overLimit, tooMany } from './_rate.js'
import { dailyQuotaReached, quotaGiveBack, quotaReserve, spendQuota } from './_quota.js'
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
/** What the whole site may spend on the AI in a day (UTC), every account together: the owner's ceiling. */
export const DEFAULT_SITE_DAILY_BUDGET_USD = 5
/** The counter subject that holds the whole site's day (not an account id: those are 64 hex characters). */
const SITE = 'site'
/** The beta features the app asks for (src/ai/claude.ts; the SDK adds structured outputs to every parse). Nothing else is passed on. */
export const BETAS = ['server-side-fallback-2026-07-01', 'structured-outputs-2025-12-15']
/** The request fields the app sends; anything else (tools, streaming, speed or service tiers, containers…) is refused. */
export const FIELDS = ['model', 'messages', 'system', 'max_tokens', 'temperature', 'thinking', 'output_config', 'fallbacks']
/** Output tokens a call is expected to use (the app asks for up to MAX_TOKENS but its answers are far shorter). */
const RESERVE_OUTPUT = 4_000
/** Input tokens set aside for a picture (a downscaled photo is well under this). */
const RESERVE_IMAGE = 5_000

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'cache-control': 'no-store' } })
/** The owner's limits (admin screen), else the Worker variables, else the defaults. */
const dailyCalls = async () => Math.max(1, await limitOf('aiDailyCalls', DEFAULT_DAILY_CALLS, 'AI_DAILY_CALLS'))
const dailyBudget = async (level: AiLevel = 'tam') => Math.round((await limitOf('aiDailyBudgetUsd', DEFAULT_DAILY_BUDGET_USD, 'AI_DAILY_BUDGET_USD')) * UNIT * BUDGET_SHARE[level])
const siteBudget = async () => Math.round((await limitOf('aiSiteBudgetUsd', DEFAULT_SITE_DAILY_BUDGET_USD, 'AI_SITE_DAILY_BUDGET_USD')) * UNIT)

/** The level the owner gave the request's account: the default one when none is set; without accounts (local development) everything is open. */
export async function levelOf(request: Request): Promise<AiLevel> {
  const id = await accountOf(request).catch(() => null)
  if (!id) return 'tam'
  const set = await aiLevelOf(id)
  return isAiLevel(set) ? set : DEFAULT_AI_LEVEL
}

/** The price of a model; one the app does not know (a fallback Anthropic chose) is priced as the dearest. */
const priceOf = (model: unknown): [number, number] => (typeof model === 'string' && PRICE[model]) || Object.values(PRICE).reduce((a, b) => (b[0] + b[1] > a[0] + a[1] ? b : a))

/** What an answer cost, in budget units, from the usage it reports and the model that wrote it (0 when it reports no usage). */
export function costUnits(model: unknown, usage: unknown): number {
  const price = priceOf(model)
  const u = usage as { input_tokens?: unknown; output_tokens?: unknown; cache_read_input_tokens?: unknown; cache_creation_input_tokens?: unknown } | null
  if (!u || typeof u !== 'object') return 0
  const n = (x: unknown) => (typeof x === 'number' && x > 0 ? x : 0)
  const usd = (n(u.input_tokens) * price[0] + n(u.output_tokens) * price[1] + n(u.cache_read_input_tokens) * price[0] * 0.1 + n(u.cache_creation_input_tokens) * price[0] * 1.25) / 1_000_000
  return Math.ceil(usd * UNIT)
}

export async function GET(request: Request): Promise<Response> {
  if (!fromApp(request)) return json({ error: 'forbidden' }, 403)
  const denied = await requireApproved(request)
  if (denied) return denied
  const level = await levelOf(request)
  return json({ available: !!process.env.ANTHROPIC_API_KEY?.trim() && level !== 'kapali', level, features: featuresOf(level) })
}

const isObject = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const onlyKeys = (v: Record<string, unknown>, keys: string[]) => Object.keys(v).every((k) => keys.includes(k))

/** A content block the app sends: text, or a picture sent inline (never a link the API would fetch). */
function goodBlock(block: unknown): boolean {
  if (!isObject(block)) return false
  if (block.type === 'text') return typeof block.text === 'string' && onlyKeys(block, ['type', 'text'])
  if (block.type === 'image') {
    const src = block.source
    return isObject(src) && src.type === 'base64' && typeof src.data === 'string' && typeof src.media_type === 'string' && onlyKeys(block, ['type', 'source'])
  }
  return false
}

const goodMessage = (m: unknown) =>
  isObject(m) && (m.role === 'user' || m.role === 'assistant') && onlyKeys(m, ['role', 'content']) && (typeof m.content === 'string' || (Array.isArray(m.content) && m.content.length > 0 && m.content.every(goodBlock)))

/** Why a request body may not go on, or null. An allow-list: a field the app does not send could change the price. */
export function refuse(body: unknown): string | null {
  if (!isObject(body)) return 'bad body'
  const b = body
  if (typeof b.model !== 'string' || !MODELS.includes(b.model)) return 'bad model'
  if (b.stream) return 'no streaming'
  if (b.tools !== undefined || b.mcp_servers !== undefined || b.container !== undefined) return 'no tools'
  const extra = Object.keys(b).find((k) => !FIELDS.includes(k))
  if (extra) return `field not allowed: ${extra.slice(0, 40)}`
  if (!Array.isArray(b.messages) || b.messages.length === 0 || !b.messages.every(goodMessage)) return 'bad messages'
  if (b.system !== undefined && typeof b.system !== 'string' && !(Array.isArray(b.system) && b.system.every(goodBlock))) return 'bad system'
  if (typeof b.max_tokens !== 'number' || !(b.max_tokens > 0) || b.max_tokens > MAX_TOKENS) return 'bad max_tokens'
  if (b.temperature !== undefined && !(typeof b.temperature === 'number' && b.temperature >= 0 && b.temperature <= 1)) return 'bad temperature'
  if (b.fallbacks !== undefined && b.fallbacks !== 'default') return 'bad fallbacks'
  if (b.thinking !== undefined && !(isObject(b.thinking) && ['adaptive', 'disabled'].includes(b.thinking.type as string) && onlyKeys(b.thinking, ['type']))) return 'bad thinking'
  if (b.output_config !== undefined) {
    const c = b.output_config
    if (!isObject(c) || !onlyKeys(c, ['effort', 'format'])) return 'bad output_config'
    if (c.effort !== undefined && !['low', 'medium', 'high'].includes(c.effort as string)) return 'bad effort'
    if (c.format !== undefined && !(isObject(c.format) && c.format.type === 'json_schema')) return 'bad format'
  }
  return null
}

/** The beta header to pass on: only the app's own features, each once; null when none is left. */
export function betaHeader(value: string | null): string | null {
  const asked = (value ?? '').split(',').map((b) => b.trim()).filter(Boolean)
  const kept = BETAS.filter((b) => asked.includes(b))
  return kept.length ? kept.join(',') : null
}

/**
 * What a call may cost, in budget units: `expected` with the output it usually writes, `worst` with all of its
 * max_tokens. A call holds `worst` while it runs (so requests sent at once cannot each spend past the day) and is let
 * in when `expected` still fits: see `reserve`.
 */
export function callUnits(body: { model: string; max_tokens: number; system?: unknown; messages: unknown[] }): { expected: number; worst: number } {
  let chars = typeof body.system === 'string' ? body.system.length : JSON.stringify(body.system ?? '').length
  let images = 0
  for (const m of body.messages as { content: unknown }[]) {
    if (typeof m.content === 'string') chars += m.content.length
    else
      for (const b of m.content as { type: string; text?: string }[]) {
        if (b.type === 'image') images++
        else chars += b.text?.length ?? 0
      }
  }
  // About three characters a token for the app's languages (Turkish and French run shorter than English).
  const input = Math.ceil(chars / 3) + images * RESERVE_IMAGE
  return {
    expected: costUnits(body.model, { input_tokens: input, output_tokens: Math.min(body.max_tokens, RESERVE_OUTPUT) }),
    worst: costUnits(body.model, { input_tokens: input, output_tokens: body.max_tokens }),
  }
}

/** The day's money: the old name, kept for the tests and the screen's estimate. */
export const estimateUnits = (body: Parameters<typeof callUnits>[0]) => callUnits(body).expected

/**
 * Sets the call's worst case aside on a day counter, if the call fits. A call fits when what is spent or held already,
 * plus what it is expected to cost, is within `max`; it then holds its worst case until it is settled. So a lone call
 * is let in as before, calls sent together see each other's worst cases, and the day can be passed by at most one
 * call's unused headroom, never several times over. Throws QuotaUnavailable when the counter cannot be read.
 */
const reserve = (name: string, subject: string, units: { expected: number; worst: number }, max: number) =>
  quotaReserve(name, subject, units.worst, max + units.worst - units.expected)

/** Brings a counter from the worst case it held to what the call cost. */
async function settle(name: string, subject: string, held: number, cost: number) {
  if (cost > held) await spendQuota(name, subject, cost - held)
  else await quotaGiveBack(name, subject, held - cost)
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

  const account = await accountOf(request).catch(() => null)
  // The call and its worst case are set aside first (the account's day, then the whole site's), so requests sent at
  // once cannot all find room left.
  const units = callUnits(body as Parameters<typeof callUnits>[0])
  const reserved = account ? units.worst : 0
  if (account) {
    const taken: (() => Promise<void>)[] = []
    const undo = async () => {
      for (const give of taken) await give()
    }
    try {
      if (!(await quotaReserve('ai', account, 1, await dailyCalls()))) return dailyQuotaReached()
      taken.push(() => quotaGiveBack('ai', account, 1))
      if (!(await reserve('ai-cost', account, units, await dailyBudget(level)))) {
        await undo()
        return dailyQuotaReached()
      }
      taken.push(() => quotaGiveBack('ai-cost', account, reserved))
      if (!(await reserve('ai-site', SITE, units, await siteBudget()))) {
        await undo()
        console.error('[ai-proxy] the site-wide daily AI budget is used up (aiSiteBudgetUsd)')
        return dailyQuotaReached()
      }
    } catch {
      // The counters cannot be read: this is the owner's money, so no call goes out uncounted.
      await undo().catch(() => undefined)
      return json({ error: 'unavailable' }, 503)
    }
  }
  const giveBackAll = async () => {
    if (!account) return
    await quotaGiveBack('ai', account, 1)
    await quotaGiveBack('ai-cost', account, reserved)
    await quotaGiveBack('ai-site', SITE, reserved)
  }

  const beta = betaHeader(request.headers.get('anthropic-beta'))
  const res = await fetch('https://api.anthropic.com/v1/messages?beta=true', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      ...(beta ? { 'anthropic-beta': beta } : {}),
    },
    body: text,
    signal: AbortSignal.timeout(150_000),
  }).catch(() => null)
  if (!res) {
    await giveBackAll()
    return json({ error: 'unavailable' }, 502)
  }
  // The key's own failures (a wrong or empty key, no credit) must not reach the page as the user's: they are the owner's to fix.
  if (res.status === 401 || res.status === 403) {
    console.error(`[ai-proxy] Anthropic answered ${res.status}: check ANTHROPIC_API_KEY and the account's credit`)
    await giveBackAll()
    return json({ error: 'unavailable' }, 502)
  }
  const answer = await res.text().catch(() => '')
  if (account) {
    if (!res.ok) {
      // A refused or failed call costs nothing.
      await giveBackAll()
    } else {
      // The money from what Anthropic says it used, priced by the model that answered (a fallback may have).
      let reply: { usage?: unknown; model?: unknown } = {}
      try {
        reply = JSON.parse(answer) as typeof reply
      } catch {
        // Not JSON: the estimate stands.
      }
      // No usage reported: what it was expected to cost stands.
      const cost = reply.usage ? costUnits(reply.model ?? (body as { model: string }).model, reply.usage) : units.expected
      await settle('ai-cost', account, reserved, cost)
      await settle('ai-site', SITE, reserved, cost)
    }
  }
  return new Response(answer, { status: res.status, headers: { 'content-type': res.headers.get('content-type') ?? 'application/json', 'cache-control': 'no-store' } })
}
