import { get, put } from '@vercel/blob'

/**
 * Encrypted sync storage. The app sends opaque, client-encrypted bytes under an id derived from
 * the learner's sync code; this function only stores and returns them (private Blob store).
 *
 * GET  /api/sync?id=<64 hex>&part=<core | m-<40 hex>>  → the bytes, or 404
 * PUT  same query, body = bytes                         → stored
 */
const ID = /^[0-9a-f]{64}$/
const PART = /^(core|m-[0-9a-f]{40})$/
/** Vercel's request body limit is 4.5 MB; stay under it. */
const MAX_BYTES = 4_400_000

function target(request: Request): string | null {
  const q = new URL(request.url).searchParams
  const id = q.get('id') ?? ''
  const part = q.get('part') ?? ''
  return ID.test(id) && PART.test(part) ? `sync/${id}/${part}.bin` : null
}

export async function GET(request: Request): Promise<Response> {
  const path = target(request)
  if (!path) return new Response('bad request', { status: 400 })
  const blob = await get(path, { access: 'private', useCache: false }).catch(() => null)
  if (!blob || blob.statusCode !== 200 || !blob.stream) return new Response('not found', { status: 404 })
  return new Response(blob.stream, { headers: { 'content-type': 'application/octet-stream', 'cache-control': 'no-store' } })
}

export async function PUT(request: Request): Promise<Response> {
  const path = target(request)
  if (!path) return new Response('bad request', { status: 400 })
  const body = await request.arrayBuffer()
  if (!body.byteLength || body.byteLength > MAX_BYTES) return new Response('too large', { status: 413 })
  await put(path, body, { access: 'private', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/octet-stream' })
  return new Response(null, { status: 204 })
}
