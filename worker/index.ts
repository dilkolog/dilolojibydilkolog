/**
 * Cloudflare Worker entry: the same handlers as api/ (each file exports GET/POST/PUT/DELETE on web-standard
 * Request and Response), a cron trigger in place of Vercel's 24 daily crons, and the static app from the
 * assets binding. Only /api/* runs the Worker; the app files are served by the assets layer (free and unlimited).
 */
import type { DurableObjectNamespace, ExecutionContext, Fetcher, R2Bucket, ScheduledController } from '@cloudflare/workers-types'
import * as access from '../api/access.js'
import * as admin from '../api/admin.js'
import * as clips from '../api/clips.js'
import * as cron from '../api/cron-reminder.js'
import * as listen from '../api/listen.js'
import * as log from '../api/log.js'
import * as news from '../api/news.js'
import * as push from '../api/push.js'
import * as share from '../api/share.js'
import * as sync from '../api/sync.js'
import * as translate from '../api/translate.js'
import * as youtube from '../api/youtube.js'
import { noteError, sendErrorDigest } from '../api/_errorDigest.js'
import { fromApp } from '../api/_origin.js'
import { overLimit, tooMany } from '../api/_rate.js'
import { cleanRoomCode } from '../src/engine/liveDuel.js'
import { bindBucket } from './blob.js'

export { DuelRoom } from './duelRoom.js'

interface Env {
  BLOBS: R2Bucket
  ASSETS: Fetcher
  /** Live duel rooms, one Durable Object per room code (worker/duelRoom.ts). */
  DUEL?: DurableObjectNamespace
  CRON_SECRET?: string
}

type Handler = (request: Request) => Response | Promise<Response>
type Module = Partial<Record<'GET' | 'POST' | 'PUT' | 'DELETE', Handler>>

/**
 * What an API answer carries beyond its handler's: the headers the assets layer adds to the app's files do not
 * reach /api/* (the Worker answers those), and the confirmation page of the mail reminders is HTML.
 * `bodyless`: a HEAD answer (the handler's GET without its body).
 */
function hardened(res: Response, bodyless: boolean): Response {
  const headers = new Headers(res.headers)
  headers.set('x-content-type-options', 'nosniff')
  return new Response(bodyless ? null : res.body, { status: res.status, statusText: res.statusText, headers })
}

const ROUTES: Record<string, Module> = { access, admin, clips, 'cron-reminder': cron, listen, log, news, push, share, sync, translate, youtube }

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    bindBucket(env.BLOBS)
    const { pathname, searchParams } = new URL(request.url)
    // A live duel room: a WebSocket to the room's Durable Object (named by its code), only from the app's own pages.
    if (pathname === '/api/room') {
      const code = cleanRoomCode(searchParams.get('code'))
      if (!code) return new Response('bad room code', { status: 400 })
      if (request.headers.get('upgrade')?.toLowerCase() !== 'websocket') return new Response('expected a websocket', { status: 426 })
      if (!fromApp(request)) return new Response('forbidden', { status: 403 })
      if (overLimit(request, 'room', 30)) return tooMany()
      if (!env.DUEL) return new Response('rooms are not set up', { status: 503 })
      return env.DUEL.get(env.DUEL.idFromName(code)).fetch(request as never) as unknown as Promise<Response>
    }
    const name = /^\/api\/([a-z-]+)\/?$/.exec(pathname)?.[1]
    const route = name ? ROUTES[name] : undefined
    if (!route && pathname.startsWith('/api/')) return new Response('not found', { status: 404 })
    if (!route) return env.ASSETS.fetch(request as never) as unknown as Promise<Response>
    // HEAD is GET without the body (uptime monitors and link checkers ask that way).
    const head = request.method === 'HEAD' && !!route.GET
    const handler = head ? route.GET : route[request.method as keyof Module]
    if (!handler) return hardened(new Response('method not allowed', { status: 405, headers: { allow: Object.keys(route).join(', ') } }), false)
    try {
      const res = await handler(request)
      return hardened(res, head)
    } catch (e) {
      console.error('[worker-error]', pathname, e)
      await noteError('worker', { name: e instanceof Error ? e.name : 'Error', message: e instanceof Error ? e.message : String(e), where: pathname })
      return new Response('server error', { status: 500 })
    }
  },

  /** Hourly: the day's reminders for the devices whose reminder hour it is (api/cron-reminder.ts). */
  async scheduled(controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    bindBucket(env.BLOBS)
    const hour = new Date(controller.scheduledTime).getUTCHours()
    const request = new Request(`https://cron.invalid/api/cron-reminder?h=${hour}`, { headers: { authorization: `Bearer ${env.CRON_SECRET ?? ''}` } })
    // Monday, from 07:00 UTC: last week's most frequent errors to the owner (once; see api/_errorDigest.ts).
    const when = new Date(controller.scheduledTime)
    if (when.getUTCDay() === 1 && hour >= 7) ctx.waitUntil(sendErrorDigest(controller.scheduledTime).then((r) => console.log('[error-digest]', r)).catch((e) => console.error('[error-digest-failed]', e)))
    ctx.waitUntil(
      cron.GET(request).then(async (res) => {
        const text = await res.text()
        // A refused or failed run is a failed invocation (Cloudflare lists it and can alert), not a quiet "ok".
        if (!res.ok) {
          console.error('[cron-reminder-failed]', res.status, text)
          throw new Error(`cron-reminder ${res.status}`)
        }
        console.log('[cron-reminder]', res.status, text)
      }),
    )
  },
}
