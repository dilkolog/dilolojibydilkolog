import { describe, expect, it } from 'vitest'
import worker from './index'

const env = { BLOBS: {} as never, ASSETS: { fetch: async () => new Response('asset') } as never }
const call = (method: string, path: string) => worker.fetch(new Request(`https://diloloji.com${path}`, { method }), env as never)

describe('HEAD requests to the API (uptime monitors ask this way)', () => {
  it('answers like GET, without the body', async () => {
    const get = await call('GET', '/api/push?mail=status')
    expect(get.status).toBe(200)
    const head = await call('HEAD', '/api/push?mail=status')
    expect(head.status).toBe(200)
    expect(await head.text()).toBe('')
    expect(head.headers.get('content-type')).toBe(get.headers.get('content-type'))
  })

  it('API answers carry nosniff (the assets layer adds nothing to them)', async () => {
    expect((await call('GET', '/api/push?mail=status')).headers.get('x-content-type-options')).toBe('nosniff')
    expect((await call('HEAD', '/api/push?mail=status')).headers.get('x-content-type-options')).toBe('nosniff')
    expect((await call('PUT', '/api/push')).headers.get('x-content-type-options')).toBe('nosniff')
  })

  it('a path with no GET handler still refuses HEAD, and POST-only methods stay as they were', async () => {
    expect((await call('PUT', '/api/push')).status).toBe(405)
    expect((await call('HEAD', '/api/nothing')).status).toBe(404)
  })
})
