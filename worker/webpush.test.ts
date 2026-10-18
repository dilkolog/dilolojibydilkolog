import { afterEach, describe, expect, it, vi } from 'vitest'
import webpush from './webpush'

const b64url = (bytes: ArrayBuffer | Uint8Array) => Buffer.from(bytes as ArrayBuffer).toString('base64url')

async function keys() {
  const pair = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign'])) as CryptoKeyPair
  const jwk = (await crypto.subtle.exportKey('jwk', pair.privateKey)) as JsonWebKey
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey))
  const device = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])) as CryptoKeyPair
  return { vapidPublic: b64url(raw), vapidPrivate: jwk.d!, p256dh: b64url(await crypto.subtle.exportKey('raw', device.publicKey)), auth: b64url(crypto.getRandomValues(new Uint8Array(16))) }
}

afterEach(() => vi.unstubAllGlobals())

describe('worker/webpush', () => {
  it('posts an encrypted message with VAPID headers to the subscription endpoint', async () => {
    const k = await keys()
    const calls: { url: string; init: RequestInit }[] = []
    vi.stubGlobal('fetch', async (url: string, init: RequestInit) => (calls.push({ url, init }), new Response(null, { status: 201 })))
    webpush.setVapidDetails('https://example.test', k.vapidPublic, k.vapidPrivate)
    const res = await webpush.sendNotification({ endpoint: 'https://fcm.googleapis.com/fcm/send/x', keys: { p256dh: k.p256dh, auth: k.auth } }, JSON.stringify({ title: 'Diloloji' }), { TTL: 3600, urgency: 'normal', timeout: 5000 })
    expect(res.statusCode).toBe(201)
    const headers = calls[0].init.headers as Record<string, string>
    expect(calls[0].url).toBe('https://fcm.googleapis.com/fcm/send/x')
    expect(headers.authorization).toMatch(/^vapid t=.+, k=/)
    expect(headers.ttl).toBe('3600')
    expect(headers['content-encoding']).toBe('aes128gcm')
    expect((calls[0].init.body as Uint8Array).byteLength).toBeGreaterThan(40)
  })

  it('reports an expired address with its status code, like the web-push package', async () => {
    const k = await keys()
    vi.stubGlobal('fetch', async () => new Response('gone', { status: 410 }))
    webpush.setVapidDetails('https://example.test', k.vapidPublic, k.vapidPrivate)
    const err = await webpush.sendNotification({ endpoint: 'https://fcm.googleapis.com/fcm/send/x', keys: { p256dh: k.p256dh, auth: k.auth } }, 'hi').catch((e) => e)
    expect(err.statusCode).toBe(410)
  })
})
