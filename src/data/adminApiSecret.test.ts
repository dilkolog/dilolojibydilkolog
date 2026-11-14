import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./supabase', () => ({ currentSession: async () => ({ access_token: 'jwt' }), supabaseConfigured: () => true }))

const { approveAll, forgetOwnerSecret, loadReports, loadStats, setOwnerCodeAsker, setOwnerSecretAsker, AdminError } = await import('./adminApi')

const SECRET = 'the-second-secret-123'
let sent: (string | null)[] = []
beforeEach(() => {
  sent = []
  forgetOwnerSecret()
  vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
    const given = new Headers(init.headers).get('x-owner-secret')
    sent.push(given)
    if (given === SECRET) return Response.json({ ok: true, approved: 2 })
    return Response.json({ error: given ? 'owner_secret_wrong' : 'owner_secret' }, { status: 403 })
  })
})
afterEach(() => {
  setOwnerSecretAsker(null)
  setOwnerCodeAsker(null)
  vi.unstubAllGlobals()
})

describe('the admin screen and the second secret', () => {
  it('asks for it when the server wants it, sends the step again, and keeps it for the next step in this tab', async () => {
    const ask = vi.fn(async () => SECRET)
    setOwnerSecretAsker(ask)
    expect(await approveAll()).toEqual({ ok: true, approved: 2 })
    expect(await approveAll()).toEqual({ ok: true, approved: 2 })
    expect(ask).toHaveBeenCalledTimes(1)
    expect(sent).toEqual([null, SECRET, SECRET])
  })

  it('asks once per step: a wrong answer or a cancel stops it', async () => {
    const ask = vi.fn(async () => 'not-it')
    setOwnerSecretAsker(ask)
    await expect(approveAll()).rejects.toBeInstanceOf(AdminError)
    expect(ask).toHaveBeenCalledTimes(1)
    setOwnerSecretAsker(async () => null)
    await expect(approveAll()).rejects.toThrow('ikinci gizli')
  })
})

describe('the admin screen and the authenticator code', () => {
  it('asks once for the cards loading together, and sends each request again once the session gave its code', async () => {
    let proven = false
    let asks = 0
    vi.stubGlobal('fetch', async () => (proven ? Response.json({ reports: [] }) : Response.json({ error: 'mfa_required' }, { status: 403 })))
    setOwnerCodeAsker(async () => {
      asks++
      await new Promise((r) => setTimeout(r, 5))
      proven = true
      return true
    })
    const [a, b] = await Promise.all([loadReports(), loadStats()])
    expect(a).toEqual({ reports: [] })
    expect(b).toEqual({ reports: [] })
    expect(asks).toBe(1)
  })

  it('stops when the owner does not give it', async () => {
    vi.stubGlobal('fetch', async () => Response.json({ error: 'mfa_required' }, { status: 403 }))
    setOwnerCodeAsker(async () => false)
    await expect(loadReports()).rejects.toThrow('Doğrulama kodu gerekiyor.')
  })

  it('says to set one up first when the owner requires it', async () => {
    vi.stubGlobal('fetch', async () => Response.json({ error: 'mfa_setup' }, { status: 403 }))
    await expect(loadReports()).rejects.toThrow('Güvenlik')
  })
})
