/** Where the fake table keeps its rows: by default its own map; a test may hand its R2 map so assertions read one place. */
export interface DocsBacking {
  get(path: string): string | undefined
  set(path: string, body: string): void
  delete(path: string): void
  keys(): Iterable<string>
}

/** A backing over a test's R2 map of bytes (`Map<string, Uint8Array>`). */
export const bytesBacking = (blobs: Map<string, Uint8Array>): DocsBacking => ({
  get: (path) => (blobs.has(path) ? new TextDecoder().decode(blobs.get(path)) : undefined),
  set: (path, body) => void blobs.set(path, new TextEncoder().encode(body)),
  delete: (path) => void blobs.delete(path),
  keys: () => blobs.keys(),
})

/** A backing over a test's R2 map of text (`Map<string, string>`). */
export const textBacking = (blobs: Map<string, string>): DocsBacking => ({
  get: (path) => blobs.get(path),
  set: (path, body) => void blobs.set(path, body),
  delete: (path) => void blobs.delete(path),
  keys: () => blobs.keys(),
})

/**
 * An in-memory `server_docs` table (migration 0010) for the tests that fake Supabase's REST API: names, requests, blocks,
 * reports, approval marks and account keys live there whenever Supabase is set up (api/_docs.ts). A test's own fake
 * calls `serveDocs` first and answers the rest itself.
 */
export function fakeServerDocs(backing: DocsBacking = textBacking(new Map())) {
  /** The answer for a `server_docs` request, or null when the request is for something else. */
  function serveDocs(input: string, init: RequestInit = {}): Response | null {
    const url = new URL(input)
    if (url.pathname !== '/rest/v1/server_docs') return null
    const path = url.searchParams.get('path')
    if (init.method === 'POST') {
      const rows = [JSON.parse(String(init.body))].flat() as { path: string; body: string }[]
      const ignore = new Headers(init.headers).get('prefer')?.includes('ignore-duplicates')
      const written = rows.filter((r) => !(ignore && backing.get(r.path) !== undefined))
      for (const r of written) backing.set(r.path, r.body)
      return Response.json(written, { status: 201 })
    }
    if (init.method === 'DELETE') {
      backing.delete(decodeURIComponent(path!.replace('eq.', '')))
      return new Response(null, { status: 204 })
    }
    if (path?.startsWith('like.')) {
      const prefix = decodeURIComponent(path.slice(5)).slice(0, -1).replace(/\\(.)/g, '$1')
      return Response.json([...backing.keys()].filter((p) => p.startsWith(prefix)).sort().map((p) => ({ path: p })))
    }
    if (path?.startsWith('eq.')) {
      const body = backing.get(decodeURIComponent(path.slice(3)))
      return Response.json(body === undefined ? [] : [{ body }])
    }
    return Response.json([])
  }
  return { serveDocs }
}

/**
 * Empty answers for the server tables a test does not look at (friends, reminders, shared lists, the inbox): reads find
 * nothing, writes and deletions succeed. Null for anything else.
 */
export function serveEmptyTables(input: string, init: RequestInit = {}): Response | null {
  const name = new URL(input).pathname.replace('/rest/v1/', '')
  if (!['friend_cards', 'friend_follows', 'friend_inbox', 'shared_lists', 'reminders'].includes(name)) return null
  if (init.method === 'POST') return new Response(null, { status: 201 })
  if (init.method === 'DELETE' || init.method === 'PATCH') return new Response(null, { status: 204 })
  return Response.json([])
}
