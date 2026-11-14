import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const admin = await import('../../api/admin')
const { tokenAal } = await import('../../api/_supabase')

/** An access token as Supabase issues it: only its payload matters here (Supabase checks the signature). */
const token = (claims: Record<string, unknown>) => `h.${btoa(JSON.stringify(claims)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')}.s`
const OWNER_AAL1 = token({ sub: 'o', aal: 'aal1' })
const OWNER_AAL2 = token({ sub: 'o', aal: 'aal2' })
const OTHER = token({ sub: 'x', aal: 'aal2' })

let ownerFactors: { status: string }[] = []

beforeEach(() => {
  ownerFactors = []
  vi.stubEnv('SUPABASE_URL', 'https://proj.supabase.co')
  vi.stubEnv('SUPABASE_SECRET_KEY', 'sb_secret_test')
  vi.stubEnv('OWNER_EMAIL', 'sahip@example.com')
  vi.stubGlobal('fetch', async (input: string, init: RequestInit = {}) => {
    const url = new URL(String(input))
    if (url.pathname === '/auth/v1/user') {
      const bearer = new Headers(init.headers).get('authorization')?.replace('Bearer ', '')
      if (bearer === OWNER_AAL1 || bearer === OWNER_AAL2) return Response.json({ id: '11111111-1111-1111-1111-111111111111', email: 'sahip@example.com', email_confirmed_at: '2026-01-01T00:00:00Z', factors: ownerFactors })
      if (bearer === OTHER) return Response.json({ id: '22222222-2222-2222-2222-222222222222', email: 'biri@example.com', email_confirmed_at: '2026-01-01T00:00:00Z' })
      return Response.json({}, { status: 401 })
    }
    return Response.json([])
  })
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

const view = async (bearer: string, name: string) => {
  const res = await admin.GET(new Request(`https://app.test/api/admin?view=${name}`, { headers: { authorization: `Bearer ${bearer}` } }))
  return { status: res.status, body: (await res.json()) as Record<string, unknown> }
}

describe('the owner\'s second factor (TOTP, aal2)', () => {
  it('reads the level from the token Supabase accepted', () => {
    expect([tokenAal(OWNER_AAL1), tokenAal(OWNER_AAL2), tokenAal('not-a-token')]).toEqual(['aal1', 'aal2', null])
  })

  it('without a factor set up, the signed-in owner gets in as before', async () => {
    expect((await view(OWNER_AAL1, 'reports')).status).toBe(200)
    expect((await view(OTHER, 'me')).status).toBe(403)
  })

  it('with a factor, a session that has not given its code learns it must, and gets nothing else', async () => {
    ownerFactors = [{ status: 'verified' }]
    expect(await view(OWNER_AAL1, 'me')).toEqual({ status: 200, body: { owner: true, mfa: 'code' } })
    expect(await view(OWNER_AAL1, 'reports')).toEqual({ status: 403, body: { error: 'mfa_required' } })
    const post = await admin.POST(new Request('https://app.test/api/admin', { method: 'POST', headers: { authorization: `Bearer ${OWNER_AAL1}` }, body: JSON.stringify({ action: 'approve-all' }) }))
    expect(post.status).toBe(403)
    expect((await view(OWNER_AAL2, 'reports')).status).toBe(200)
  })

  it('a factor only half set up (never verified) asks for nothing yet', async () => {
    ownerFactors = [{ status: 'unverified' }]
    expect((await view(OWNER_AAL1, 'reports')).status).toBe(200)
  })

  it('with OWNER_MFA=required, an owner without a factor is sent to set one up first', async () => {
    vi.stubEnv('OWNER_MFA', 'required')
    expect(await view(OWNER_AAL1, 'me')).toEqual({ status: 200, body: { owner: true, mfa: 'setup' } })
    expect(await view(OWNER_AAL1, 'reports')).toEqual({ status: 403, body: { error: 'mfa_setup' } })
  })
})
