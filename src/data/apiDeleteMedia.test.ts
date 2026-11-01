import { afterEach, expect, it, vi } from 'vitest'
import { deleteSupabaseMedia } from '../../api/_supabase'
const USER = '11111111-1111-1111-1111-111111111111'
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

it('drains multiple pages and checks that the listing is empty before completing', async () => {
  vi.stubEnv('SUPABASE_URL', 'https://fake.supabase.test')
  const files = Array.from({ length: 1001 }, (_, i) => `m-${i}.json`)
  let deleted = 0
  const fetcher = vi.fn(async (url: string, init: RequestInit) => {
    if (url.includes('/list/')) return Response.json(files.slice(0, 1000).map(name => ({ name })))
    const names = (JSON.parse(String(init.body)) as { prefixes: string[] }).prefixes
    expect(names.every(name => name.startsWith(`${USER}/`))).toBe(true)
    files.splice(0, names.length); deleted += names.length
    return Response.json([])
  })
  vi.stubGlobal('fetch', fetcher)
  await deleteSupabaseMedia(USER)
  expect(deleted).toBe(1001)
  expect(fetcher).toHaveBeenCalledTimes(5)
})

it('refuses to report success if the bounded deletion never reaches an empty listing', async () => {
  vi.stubGlobal('fetch', async (url: string) => url.includes('/list/') ? Response.json([{ name: 'keeps-returning.json' }]) : Response.json([]))
  await expect(deleteSupabaseMedia(USER)).rejects.toThrow('incomplete')
})

it('propagates transport failures instead of completing cleanup', async () => {
  vi.stubGlobal('fetch', async () => { throw new Error('network unavailable') })
  await expect(deleteSupabaseMedia(USER)).rejects.toThrow('network unavailable')
})
