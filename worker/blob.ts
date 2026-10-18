/**
 * The subset of `@vercel/blob` the server uses (get, put, del, list), on a Cloudflare R2 bucket.
 * The Worker build points the package name at this file (wrangler.jsonc `alias`), so api/ stays as it is
 * and still runs on Vercel and in the unit tests, which mock `@vercel/blob`.
 */
import type { R2Bucket } from '@cloudflare/workers-types'

let bucket: R2Bucket | null = null

/** The Worker's entry binds the bucket before any handler runs. */
export const bindBucket = (b: R2Bucket) => void (bucket = b)

const store = (): R2Bucket => {
  if (!bucket) throw new Error('BLOBS bucket is not bound')
  return bucket
}

/** Same name and wording the handlers look for (api/sync.ts, api/_friends.ts). */
export class BlobPreconditionFailedError extends Error {
  override name = 'BlobPreconditionFailedError'
  constructor() {
    super('Precondition failed: the file already exists or changed')
  }
}

const bare = (etag: string) => etag.replace(/^W\//, '').replace(/^"|"$/g, '')

export async function get(path: string, _options?: unknown) {
  const object = await store().get(path)
  if (!object) return null
  return { statusCode: 200 as const, stream: object.body as unknown as ReadableStream<Uint8Array>, blob: { etag: object.httpEtag } }
}

export async function put(path: string, body: string | ArrayBuffer | Uint8Array, options: { contentType?: string; allowOverwrite?: boolean; ifMatch?: string; [key: string]: unknown } = {}) {
  const onlyIf = options.ifMatch ? { etagMatches: bare(options.ifMatch) } : options.allowOverwrite === false ? { etagDoesNotMatch: '*' } : undefined
  const written = await store().put(path, body, { httpMetadata: options.contentType ? { contentType: options.contentType } : undefined, onlyIf })
  // R2 answers null when a condition failed.
  if (!written) throw new BlobPreconditionFailedError()
  return { pathname: path, url: '', etag: written.httpEtag }
}

export async function del(path: string | string[]) {
  await store().delete(path)
}

export async function list(options: { prefix?: string; cursor?: string; limit?: number } = {}) {
  const page = await store().list({ prefix: options.prefix, cursor: options.cursor, limit: options.limit ?? 1000 })
  return {
    blobs: page.objects.map((o) => ({ pathname: o.key, size: o.size, uploadedAt: o.uploaded })),
    hasMore: page.truncated,
    cursor: page.truncated ? page.cursor : undefined,
  }
}
