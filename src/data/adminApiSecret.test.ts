import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./supabase', () => ({ currentSession: async () => ({ access_token: 'jwt' }), supabaseConfigured: () => true }))

const { approveAll, forgetOwnerSecret, setOwnerSecretAsker, AdminError } = await import('./adminApi')

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
