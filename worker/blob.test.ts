import type { R2Bucket } from '@cloudflare/workers-types'
import { beforeEach, describe, expect, it } from 'vitest'
import { bindBucket, del, get, list, put } from './blob'

// A small in-memory R2: put with onlyIf answers null when the condition fails, like the real one.
function fakeBucket(): R2Bucket {
  const files = new Map<string, { body: Uint8Array; etag: string }>()
  let counter = 0
  const bytes = async (body: string | ArrayBuffer | Uint8Array) => (typeof body === 'string' ? new TextEncoder().encode(body) : new Uint8Array(body))
  return {
    async get(key: string) {
      const f = files.get(key)
      return f ? { body: new Response(f.body as unknown as BodyInit).body, httpEtag: `"${f.etag}"`, etag: f.etag } : null
    },
    async put(key: string, body: string | ArrayBuffer | Uint8Array, options?: { onlyIf?: { etagMatches?: string; etagDoesNotMatch?: string } }) {
      const current = files.get(key)
      const cond = options?.onlyIf
      if (cond?.etagMatches && current?.etag !== cond.etagMatches) return null
      if (cond?.etagDoesNotMatch === '*' && current) return null
      const etag = `e${++counter}`
      files.set(key, { body: await bytes(body), etag })
      return { httpEtag: `"${etag}"`, etag }
    },
    async delete(keys: string | string[]) {
      for (const k of [keys].flat()) files.delete(k)
    },
    async list(options?: { prefix?: string }) {
      const objects = [...files.keys()].filter((k) => k.startsWith(options?.prefix ?? '')).map((key) => ({ key, size: files.get(key)!.body.length, uploaded: new Date(0) }))
      return { objects, truncated: false }
    },
  } as unknown as R2Bucket
}

const text = async (blob: Awaited<ReturnType<typeof get>>) => new Response(blob?.stream).text()

beforeEach(() => bindBucket(fakeBucket()))

describe('worker/blob (R2 behind the @vercel/blob calls)', () => {
  it('reads what was written, with its etag, and null for a missing file', async () => {
    expect(await get('a.txt')).toBeNull()
    await put('a.txt', 'hello', { contentType: 'text/plain', allowOverwrite: true })
    const blob = await get('a.txt')
    expect(blob?.statusCode).toBe(200)
    expect(blob?.blob.etag).toMatch(/^"e\d+"$/)
    expect(await text(blob)).toBe('hello')
  })

  it('"allowOverwrite: false" fails on an existing file with the error the handlers look for', async () => {
    await put('c.bin', 'one', { allowOverwrite: false })
    const err = await put('c.bin', 'two', { allowOverwrite: false }).catch((e) => e)
    expect(err.name).toBe('BlobPreconditionFailedError')
    expect(err.message).toMatch(/exist|precondition/i)
    expect(await text(await get('c.bin'))).toBe('one')
  })

  it('"ifMatch" writes only over the version that was read (quoted or not)', async () => {
    await put('core.bin', 'v1', { allowOverwrite: true })
    const etag = (await get('core.bin'))!.blob.etag
    await put('core.bin', 'v2', { allowOverwrite: true, ifMatch: etag })
    const stale = await put('core.bin', 'v3', { allowOverwrite: true, ifMatch: etag }).catch((e) => e)
    expect(stale.name).toBe('BlobPreconditionFailedError')
    expect(await text(await get('core.bin'))).toBe('v2')
    await put('core.bin', 'v4', { allowOverwrite: true, ifMatch: (await get('core.bin'))!.blob.etag.replace(/"/g, '') })
    expect(await text(await get('core.bin'))).toBe('v4')
  })

  it('lists by prefix and deletes', async () => {
    for (const p of ['push/a.json', 'push/b.json', 'sync/x']) await put(p, '1', { allowOverwrite: true })
    expect((await list({ prefix: 'push/' })).blobs.map((b) => b.pathname)).toEqual(['push/a.json', 'push/b.json'])
    await del('push/a.json')
    expect((await list({ prefix: 'push/' })).blobs).toHaveLength(1)
  })
})
