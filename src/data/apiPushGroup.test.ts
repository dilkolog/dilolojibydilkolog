import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PushRecord } from '../../api/push'

// The push records in memory; the request's account is whatever the test says it proved.
const blobs = new Map<string, string>()
vi.mock('@vercel/blob', () => ({
  put: async (path: string, body: string) => void blobs.set(path, body),
  get: async (path: string) => (blobs.has(path) ? { statusCode: 200, stream: new Response(blobs.get(path)).body } : null),
  del: async (path: string) => void blobs.delete(path),
  list: async ({ prefix }: { prefix: string }) => ({ blobs: [...blobs.keys()].filter((k) => k.startsWith(prefix)).map((pathname) => ({ pathname })), hasMore: false }),
}))
let signedIn: string | null = null
vi.mock('../../api/_account.js', async (original) => ({ ...(await original<typeof import('../../api/_account.js')>()), accountOf: async () => signedIn }))

const { POST, recordPath } = await import('../../api/push')

const sub = { endpoint: 'https://fcm.googleapis.com/fcm/send/1', keys: { p256dh: 'p', auth: 'a' } }
const post = (body: unknown) => POST(new Request('https://app.test/api/push', { method: 'POST', headers: { 'sec-fetch-site': 'same-origin' }, body: JSON.stringify(body) }))

beforeEach(() => blobs.clear())

describe('the group a push record counts in', () => {
  it('is the signed-in account, never the one the page names', async () => {
    signedIn = 'a'.repeat(64)
    // Someone else's account named as the group: their "studied today" would stop that account's reminder.
    expect((await post({ action: 'save', subscription: sub, tz: -180, studiedDay: '2026-11-10', group: 'b'.repeat(64) })).status).toBe(204)
    const record = JSON.parse(blobs.get(await recordPath(sub.endpoint))!) as PushRecord
    expect([record.group, record.owner]).toEqual(['a'.repeat(64), 'a'.repeat(64)])
  })

  it('without accounts the device’s own group is all there is', async () => {
    signedIn = null
    await post({ action: 'save', subscription: sub, tz: -180, group: 'c'.repeat(64) })
    expect((JSON.parse(blobs.get(await recordPath(sub.endpoint))!) as PushRecord).group).toBe('c'.repeat(64))
  })
})
