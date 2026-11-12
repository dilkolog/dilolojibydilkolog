import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../api/_account.js', async (original) => ({ ...(await original<typeof import('../../api/_account.js')>()), requireApproved: vi.fn(async () => null) }))

import { GET } from '../../api/access'
import { requireApproved } from '../../api/_account.js'
import { validRoomTicket } from '../../api/_roomTicket.js'
import { resetRate } from '../../api/_rate.js'

const ask = () => GET(new Request('https://diloloji.com/api/access?room-ticket=1', { headers: { origin: 'https://diloloji.com' } }))

beforeEach(() => {
  resetRate()
  vi.mocked(requireApproved).mockReset().mockResolvedValue(null)
})
afterEach(() => vi.unstubAllEnvs())

describe('GET /api/access?room-ticket (api/_roomTicket.ts)', () => {
  it('without accounts (local development) rooms ask for no ticket', async () => {
    vi.stubEnv('SUPABASE_URL', '')
    vi.stubEnv('VITE_SUPABASE_URL', '')
    expect(await (await ask()).json()).toEqual({ ticket: null })
    expect(requireApproved).not.toHaveBeenCalled()
  })

  it('with accounts on, an approved account gets a ticket the room accepts; anyone else is refused', async () => {
    vi.stubEnv('SUPABASE_URL', 'https://proj.supabase.co')
    vi.stubEnv('SUPABASE_SECRET_KEY', 'sb_secret_test')
    const { ticket } = (await (await ask()).json()) as { ticket: string }
    expect(await validRoomTicket(ticket)).toBe(true)
    vi.mocked(requireApproved).mockResolvedValue(Response.json({ error: 'approval_required' }, { status: 403 }))
    expect((await ask()).status).toBe(403)
    expect((await GET(new Request('https://diloloji.com/api/access?room-ticket=1', { headers: { origin: 'https://evil.example' } }))).status).toBe(403)
  })
})
