import { isOwnerSession, listReports, unpublishList } from './_owner.js'
import { deletePerson, listPeople, pendingCount, updatePerson, type PeopleFilter } from './_adminPeople.js'
import { checkHealth, problems } from './_health.js'
import { addBlock, approveAll, listBlocks, personDetail, removeBlock, stats, usage } from './_adminStats.js'
import { forgetSettings, getSettings, LIMITS, limitOf, MAX_ANNOUNCEMENT, saveSettings } from './_settings.js'
import { DEFAULT_DAILY_BUDGET_USD, DEFAULT_DAILY_CALLS, DEFAULT_SITE_DAILY_BUDGET_USD } from './ai.js'
import { DAILY_TRANSLATE_CHARS, DAILY_TTS_CHARS } from './_quota.js'
import { secretMatches } from './_secret.js'
import { overLimit, tooMany } from './_rate.js'
import { StorageError } from './_account.js'

/**
 * The owner's admin screen (src/ui/admin): open only to the owner signed in, that is a Supabase session whose confirmed
 * e-mail is OWNER_EMAIL (api/_owner.ts); the steps that cannot be undone also want OWNER_STEP_SECRET (below). The
 * endpoints are listed at `ownerView` (GET) and `POST`. (The ADMIN_TOKEN bearer, the old approval list by sync id and
 * the moves from R2 went on 2026-11-13: the moves had finished.)
 */
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'cache-control': 'no-store' } })

async function authorised(request: Request): Promise<Response | null> {
  return (await isOwnerSession(request)) ? null : json({ error: 'forbidden' }, 403)
}

/**
 * The steps that cannot be undone or that spend the owner's money: deleting a person or a username's data, approving
 * everyone at once, and the limits and switches. With OWNER_STEP_SECRET set (a Worker secret, at least 16 characters),
 * they also need it in `x-owner-secret`: the owner's mailbox or Google account alone (which is what the signed-in admin
 * screen rests on) is then not enough. Without it set, nothing changes.
 */
export const STEP_ACTIONS = ['person-delete', 'approve-all', 'settings'] as const

async function secondFactor(request: Request): Promise<Response | null> {
  const secret = process.env.OWNER_STEP_SECRET?.trim() ?? ''
  if (secret.length < 16) return null
  const given = request.headers.get('x-owner-secret') ?? ''
  if (!given) return json({ error: 'owner_secret' }, 403)
  // A guess costs a request out of a small allowance.
  if (overLimit(request, 'owner-secret', 10)) return tooMany()
  return (await secretMatches(given, secret)) ? null : json({ error: 'owner_secret_wrong' }, 403)
}

export async function GET(request: Request): Promise<Response> {
  const refused = await authorised(request)
  if (refused) return refused
  const q = new URL(request.url).searchParams
  return ownerView(q.get('view') ?? '', q)
}

export async function POST(request: Request): Promise<Response> {
  const refused = await authorised(request)
  if (refused) return refused
  const body = (await request.json().catch(() => null)) as {
    action?: string
    id?: string
    user?: unknown
    change?: unknown
    level?: unknown
    confirm?: unknown
    block?: unknown
    value?: unknown
    kind?: unknown
    note?: unknown
    settings?: unknown
    text?: unknown
  } | null
  if (body?.action && (STEP_ACTIONS as readonly string[]).includes(body.action)) {
    const second = await secondFactor(request)
    if (second) return second
  }
  if (body?.action === 'person') return person(body)
  if (body?.action === 'person-delete') return personDelete(body)
  if (body?.action === 'approve-all') return ownerStep(async () => json({ ok: true, approved: await approveAll() }))
  if (body?.action === 'settings') return settingsChange(body.settings)
  if (body?.action === 'announce') return announce(body.text)
  if (body?.action === 'block') return ownerStep(async () => blockAnswer(await addBlock(body.value, body.note)))
  if (body?.action === 'unblock') return ownerStep(async () => blockAnswer(await removeBlock(body.kind, body.value)))
  if (body?.action === 'unpublish') return json({ ok: await unpublishList(String(body.id ?? '')).catch(() => false) })
  return json({ error: 'bad request' }, 400)
}

// --- The owner's admin screen (GET ?view=…, POST person / unpublish) ------------------------------------------------

const FILTERS: PeopleFilter[] = ['pending', 'approved', 'rejected', 'all']

/**
 * GET /api/admin?view=me      → { owner: true } (the screen's way to know it may show itself)
 * GET /api/admin?view=people&filter=pending|approved|rejected|all&q=… → { people, levels, pending }
 * GET /api/admin?view=reports&days=1..30 → { reports }
 * GET /api/admin?view=system  → { health, problems }
 */
async function ownerView(view: string, q: URLSearchParams): Promise<Response> {
  try {
    if (view === 'me') return json({ owner: true })
    if (view === 'people') {
      const filter = FILTERS.find((f) => f === q.get('filter')) ?? 'pending'
      const [list, pending] = await Promise.all([listPeople(filter, q.get('q')), pendingCount()])
      return json({ ...list, pending })
    }
    if (view === 'reports') {
      const days = Math.min(30, Math.max(1, Number(q.get('days')) || 7))
      return json({ reports: await listReports(days) })
    }
    if (view === 'stats') return json(await stats())
    if (view === 'usage') return json(await usage())
    if (view === 'person') {
      const detail = await personDetail(q.get('user'))
      if (detail === 'bad') return json({ error: 'bad request' }, 400)
      if (detail === 'missing') return json({ error: 'no such person' }, 404)
      return json(detail)
    }
    if (view === 'settings') return json(await settingsView())
    if (view === 'blocks') {
      const blocks = await listBlocks()
      return json(blocks === 'missing' ? { available: false, blocks: [] } : { available: true, blocks })
    }
    if (view === 'system') {
      const health = await checkHealth()
      return json({ health, problems: await problems(health) })
    }
    return json({ error: 'unknown view' }, 400)
  } catch (e) {
    if (e instanceof StorageError) return json({ error: 'storage unavailable' }, 502)
    throw e
  }
}

/** Runs one owner action, turning a storage failure into 502. */
async function ownerStep(run: () => Promise<Response>): Promise<Response> {
  try {
    return await run()
  } catch (e) {
    if (e instanceof StorageError) return json({ error: 'storage unavailable' }, 502)
    return json({ error: 'failed' }, 502)
  }
}

const blockAnswer = (result: 'ok' | 'bad' | 'missing') =>
  result === 'ok' ? json({ ok: true }) : result === 'missing' ? json({ error: 'owner_blocks missing: run migration 0011' }, 409) : json({ error: 'bad request' }, 400)

/** The limits in force, what the owner set, and the defaults (the screen shows all three). */
async function settingsView() {
  forgetSettings()
  const settings = await getSettings()
  const [aiDailyCalls, aiDailyBudgetUsd, aiSiteBudgetUsd, translateChars, ttsChars] = await Promise.all([
    limitOf('aiDailyCalls', DEFAULT_DAILY_CALLS, 'AI_DAILY_CALLS'),
    limitOf('aiDailyBudgetUsd', DEFAULT_DAILY_BUDGET_USD, 'AI_DAILY_BUDGET_USD'),
    limitOf('aiSiteBudgetUsd', DEFAULT_SITE_DAILY_BUDGET_USD, 'AI_SITE_DAILY_BUDGET_USD'),
    limitOf('translateChars', DAILY_TRANSLATE_CHARS),
    limitOf('ttsChars', DAILY_TTS_CHARS),
  ])
  return {
    settings,
    effective: { aiDailyCalls, aiDailyBudgetUsd, aiSiteBudgetUsd, translateChars, ttsChars },
    defaults: { aiDailyCalls: DEFAULT_DAILY_CALLS, aiDailyBudgetUsd: DEFAULT_DAILY_BUDGET_USD, aiSiteBudgetUsd: DEFAULT_SITE_DAILY_BUDGET_USD, translateChars: DAILY_TRANSLATE_CHARS, ttsChars: DAILY_TTS_CHARS },
    ranges: LIMITS,
  }
}

/** POST { action: 'settings', settings: { aiDailyCalls?, …, autoApprove?, facebookLogin? } }: a limit set to null goes back to its default. */
async function settingsChange(raw: unknown): Promise<Response> {
  if (!raw || typeof raw !== 'object') return json({ error: 'bad request' }, 400)
  const change: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    if (key in LIMITS || key === 'autoApprove' || key === 'facebookLogin') change[key] = value
  }
  if (!Object.keys(change).length) return json({ error: 'bad request' }, 400)
  return ownerStep(async () => {
    await saveSettings(change)
    return json(await settingsView())
  })
}

/** POST { action: 'announce', text } sends one announcement to everyone's bell; text '' (or null) takes it back. */
async function announce(text: unknown): Promise<Response> {
  const clean = typeof text === 'string' ? text.trim() : ''
  if (clean.length > MAX_ANNOUNCEMENT) return json({ error: 'too long' }, 400)
  const announcement = clean ? { id: `a-${Date.now().toString(36)}`, text: clean, at: new Date().toISOString() } : null
  return ownerStep(async () => {
    const saved = await saveSettings({ announcement })
    return json({ ok: true, announcement: saved.announcement ?? null })
  })
}

/** POST { action: 'person-delete', user, confirm: <the person's e-mail>, block?: true } (block: the address may not sign up again). */
async function personDelete(body: { user?: unknown; confirm?: unknown; block?: unknown }): Promise<Response> {
  try {
    const result = await deletePerson(body.user, body.confirm)
    if (result === 'ok') {
      const blocked = body.block === true ? await addBlock(body.confirm, 'Hesabı silindi').catch(() => 'failed' as const) : null
      return json({ ok: true, ...(blocked ? { blocked } : {}) })
    }
    if (result === 'missing') return json({ error: 'no such person' }, 404)
    if (result === 'owner') return json({ error: 'an owner account is not deleted here' }, 403)
    if (result === 'confirm') return json({ error: 'confirm with the e-mail' }, 400)
    return json({ error: 'bad request' }, 400)
  } catch (e) {
    if (e instanceof StorageError) return json({ error: 'storage unavailable' }, 502)
    return json({ error: 'delete failed' }, 502)
  }
}

/** POST { action: 'person', user, change?: 'approve'|'reject'|'wait', level?: 'kapali'|'kelime'|'calisma'|'tam'|null } */
async function person(body: { user?: unknown; change?: unknown; level?: unknown }): Promise<Response> {
  try {
    const result = await updatePerson(body.user, body.change, body.level)
    if (result === 'ok') return json({ ok: true })
    if (result === 'missing') return json({ error: 'ai_level column missing: run migration 0007' }, 409)
    return json({ error: 'bad request' }, 400)
  } catch (e) {
    if (e instanceof StorageError) return json({ error: 'storage unavailable' }, 502)
    throw e
  }
}
