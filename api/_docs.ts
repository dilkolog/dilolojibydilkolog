import { del, list } from './_blob'
import { rest, supabaseOn } from './_supabase.js'

/**
 * The small server files that have no table of their own (each a path and its text: names and who holds them, friend
 * requests and blocks, reports, the error digest, the old approval marks and account keys). With Supabase set up they
 * live in `server_docs` (migration 0010) only: the owner's move from R2 finished on 2026-11-13. Without Supabase (local
 * development, most unit tests) they stay R2 files: `_account.ts` readText / writeText / removeBlob send the paths here
 * first and fall back to the files when this answers undefined.
 */

const DOC_PATH = /^(friends\/(handle|handle-of|requested|blocked)\/[^/]+\.json|reports\/.+\.json|errors\/[^/]+\.json|access\/(requests|approved|rejected)\/[0-9a-f]{64}\.json|sync\/[0-9a-f]{64}\/auth\.txt)$/
export const isDocPath = (path: string) => DOC_PATH.test(path)

class DocsError extends Error {}

/** Whether the documents are in the table (Supabase set up). */
export const docsOn = () => supabaseOn()
/** Kept for the tests that reset module state between cases; nothing is remembered any more. */
export const resetDocs = () => {}

/** A table call; any failure (Supabase unreachable, an error answer) throws DocsError. */
async function call(path: string, init: RequestInit = {}): Promise<Response> {
  let res: Response
  try {
    res = await rest(path, init)
  } catch {
    throw new DocsError('supabase unreachable')
  }
  if (!res.ok) throw new DocsError(`supabase ${res.status}`)
  return res
}

const q = (path: string) => `server_docs?path=eq.${encodeURIComponent(path)}`

/** The document's text, null when there is none; undefined without Supabase (the caller reads the file). */
export async function readDoc(path: string): Promise<string | null | undefined> {
  if (!docsOn()) return undefined
  const rows = (await (await call(`${q(path)}&select=body`)).json()) as { body: string }[]
  return rows[0]?.body ?? null
}

/** Writes the document over whatever was there; false without Supabase (the caller writes the file). */
export async function writeDoc(path: string, body: string): Promise<boolean> {
  if (!docsOn()) return false
  await call('server_docs?on_conflict=path', {
    method: 'POST',
    headers: { prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ path, body, updated_at: new Date().toISOString() }),
  })
  return true
}

/** Writes the document only if there is none: true when written, false when one was there, undefined without Supabase. */
export async function createDoc(path: string, body: string): Promise<boolean | undefined> {
  if (!docsOn()) return undefined
  const res = await call('server_docs?on_conflict=path', {
    method: 'POST',
    headers: { prefer: 'resolution=ignore-duplicates,return=representation' },
    body: JSON.stringify({ path, body }),
  })
  return ((await res.json()) as unknown[]).length > 0
}

/**
 * Deletes the document. The R2 file of the same path goes too: the move copied the files and left them, and a deleted
 * account's name or key must not stay behind there.
 */
export async function removeDoc(path: string): Promise<void> {
  if (docsOn()) await call(q(path), { method: 'DELETE', headers: { prefer: 'return=minimal' } })
  await del(path).catch(() => undefined)
}

async function blobPaths(prefix: string, cap = 5000): Promise<string[]> {
  const out: string[] = []
  let cursor: string | undefined
  do {
    const page = await list({ prefix, cursor })
    out.push(...page.blobs.map((b) => b.pathname))
    cursor = page.hasMore && out.length < cap ? page.cursor : undefined
  } while (cursor)
  return out
}

/** Every document path under a prefix, sorted. */
export async function listDocPaths(prefix: string): Promise<string[]> {
  if (!docsOn()) return (await blobPaths(prefix)).filter(isDocPath).sort()
  const pattern = `${prefix.replace(/[%_*\\]/g, (c) => `\\${c}`)}*`
  const res = await call(`server_docs?path=like.${encodeURIComponent(pattern)}&select=path&order=path&limit=5000`)
  return ((await res.json()) as { path: string }[]).map((r) => r.path).filter(isDocPath)
}

export { DocsError }
