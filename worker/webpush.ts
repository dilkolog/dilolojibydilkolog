/**
 * The two calls of the `web-push` package the server uses (setVapidDetails, sendNotification), on Web Crypto,
 * since that package needs Node's https module. The Worker build points the package name at this file.
 */
import { buildPushPayload } from '@block65/webcrypto-web-push'

let vapid: { subject: string; publicKey: string; privateKey: string } | null = null

export interface Subscription {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

/** What a failed delivery looks like to callers (they read `statusCode`: 404 and 410 mean the address is gone). */
export class WebPushError extends Error {
  statusCode: number
  constructor(message: string, statusCode: number) {
    super(message)
    this.name = 'WebPushError'
    this.statusCode = statusCode
  }
}

function setVapidDetails(subject: string, publicKey: string, privateKey: string) {
  vapid = { subject, publicKey, privateKey }
}

async function sendNotification(subscription: Subscription, payload: string, options: { TTL?: number; urgency?: 'low' | 'normal' | 'high'; timeout?: number } = {}) {
  if (!vapid) throw new Error('VAPID details are not set')
  const request = await buildPushPayload(
    { data: payload, options: { ttl: options.TTL ?? 60, urgency: options.urgency ?? 'normal' } },
    { endpoint: subscription.endpoint, expirationTime: null, keys: subscription.keys },
    vapid,
  )
  const res = await fetch(subscription.endpoint, { method: 'POST', headers: request.headers, body: request.body, signal: options.timeout ? AbortSignal.timeout(options.timeout) : undefined })
  if (!res.ok) throw new WebPushError(`push service answered ${res.status}`, res.status)
  return { statusCode: res.status }
}

export default { setVapidDetails, sendNotification }
