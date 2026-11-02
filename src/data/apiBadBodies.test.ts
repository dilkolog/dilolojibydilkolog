import { beforeEach, describe, expect, it, vi } from 'vitest'

// A body that is valid JSON but not an object (`null`, a number, a list) is a bad request, never a crash (a thrown error is a 500).
const blobs = new Map<string, Uint8Array>()
vi.mock('@vercel/blob', () => ({
  put: async (path: string, body: ArrayBuffer | string) => {
    blobs.set(path, typeof body === 'string' ? new TextEncoder().encode(body) : new Uint8Array(body))
    return {}
  },
  get: async (path: string) => (blobs.has(path) ? { statusCode: 200, stream: new Response(blobs.get(path)!.slice()).body } : null),
  list: async ({ prefix }: { prefix: string }) => ({ blobs: [...blobs.keys()].filter((k) => k.startsWith(prefix)).map((pathname) => ({ pathname })) }),
  del: async (path: string | string[]) => void [path].flat().forEach((p) => blobs.delete(p)),
}))

const log = await import('../../api/log')
const push = await import('../../api/push')
const share = await import('../../api/share')
const { resetRate } = await import('../../api/_rate')

const APP = { 'sec-fetch-site': 'same-origin' }
const call = (handler: (r: Request) => Promise<Response> | Response, url: string, method: string, body: string) => handler(new Request(`https://app.test${url}`, { method, headers: APP, body }))

describe('JSON that is not an object', () => {
  beforeEach(() => {
    blobs.clear()
    resetRate()
  })
  for (const body of ['null', '0', '"text"', '[]', 'true']) {
    it(`${body} is refused with 400 by the log, push and share endpoints`, async () => {
      expect((await call(log.POST, '/api/log', 'POST', body)).status).toBe(400)
      expect((await call(push.POST, '/api/push', 'POST', body)).status).toBe(400)
      expect((await call(share.POST, '/api/share', 'POST', body)).status).toBe(400)
      expect((await call(share.PUT, '/api/share?id=' + 'a'.repeat(32), 'PUT', body)).status).toBeLessThan(500)
    })
  }
})
