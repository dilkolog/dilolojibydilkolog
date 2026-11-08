import { del, get, list, put } from './_blob'
import { rest, supabaseOn } from './_supabase.js'

/**
 * The small server files that had no table of their own (each a path and its text), moved from R2 to Supabase
 * (`server_docs`, migration 0010) without changing the code that uses them: `_account.ts` readText / writeJson /
 * removeBlob send these paths here.
 *
 * - Once 0010 has run, writes go to the table and reads ask the table first. A path the table does not have yet is
 *   read from its old R2 file, so nothing goes missing while the owner's move (moveDocs) copies the files over:
 *   a name someone holds never looks free in between. Deleting removes both copies (an old file must not come back).
 * - After the move has finished (flag 'docs' in server_flags) the R2 files are no longer read.
 * - Before 0010 has run (the table missing), and without Supabase (local development), everything stays in R2.
 */

/** Which paths are documents: names and who holds them, friend requests and blocks, reports, the error digest, the old approval marks and account keys. */
const DOC_PATH = /^(friends\/(handle|handle-of|requested|blocked)\/[^/]+\.json|reports\/.+\.json|errors\/[^/]+\.json|access\/(requests|approved|rejected)\/[0-9a-f]{64}\.json|sync\/[0-9a-f]{64}\/auth\.txt)$/
export const isDocPath = (path: string) => DOC_PATH.test(path)

/** The prefixes the move walks (each listed separately: R2 lists by prefix). */
export const DOC_PREFIXES = ['friends/handle/', 'friends/handle-of/', 'friends/requested/', 'friends/blocked/', 'reports/', 'errors/', 'access/requests/', 'access/approved/', 'access/rejected/', 'sync/'] as const

class DocsError extends Error {}

const MISSING_MS = 5 * 60_000
let missingUntil = 0
const FLAG_MS = 15_000
let moved: { on: boolean; until: number } | null = null
export const resetDocs = () => ((missingUntil = 0), (moved = null))

/** Whether the table is there to be asked (Supabase set up, 0010 not known missing). */
export const docsReady = (now = Date.now()) => supabaseOn() && now >= missingUntil

/** A table call; a missing table (0010 not run) marks it so for a while and answers undefined, a failure throws. */
async function call(path: string, init: RequestInit = {}): Promise<Response | undefined> {
  let res: Response
  try {
    res = await rest(path, init)
  } catch {
    throw new DocsError('supabase unreachable')
  }
  if (res.ok) return res
  const body = await res.text().catch(() => '')
  if (res.status === 404 || /PGRST205|42P01/.test(body)) {
    missingUntil = Date.now() + MISSING_MS
    return undefined
  }
  throw new DocsError(`supabase ${res.status}`)
}

const q = (path: string) => `server_docs?path=eq.${encodeURIComponent(path)}`

/** The document's text: a string, null when the table has none, undefined when the table is not there. */
export async function docGet(path: string): Promise<string | null | undefined> {
  const res = await call(`${q(path)}&select=body`)
  if (!res) return undefined
  const rows = (await res.json()) as { body: string }[]
  return rows[0]?.body ?? null
}

/** Writes the document (over whatever was there); false when the table is not there. */
export async function docPut(path: string, body: string): Promise<boolean> {
  const res = await call('server_docs?on_conflict=path', {
    method: 'POST',
    headers: { prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({ path, body, updated_at: new Date().toISOString() }),
  })
  return !!res
}

/** Writes the document only if the table has none: true when written, false when one was there, undefined without the table. */
export async function docCreate(path: string, body: string): Promise<boolean | undefined> {
  const res = await call('server_docs?on_conflict=path', {
    method: 'POST',
    headers: { prefer: 'resolution=ignore-duplicates,return=representation' },
    body: JSON.stringify({ path, body }),
  })
  if (!res) return undefined
  return ((await res.json()) as unknown[]).length > 0
}

/** Deletes the document from the table (nothing to do without it). */
export async function docDelete(path: string): Promise<void> {
  await call(q(path), { method: 'DELETE', headers: { prefer: 'return=minimal' } })
}

/** Paths under a prefix in the table; undefined without it. */
async function docList(prefix: string): Promise<string[] | undefined> {
  const pattern = `${prefix.replace(/[%_*\\]/g, (c) => `\\${c}`)}*`
  const res = await call(`server_docs?path=like.${encodeURIComponent(pattern)}&select=path&order=path&limit=5000`)
  if (!res) return undefined
  return ((await res.json()) as { path: string }[]).map((r) => r.path)
}

/** Whether the move has finished: then the old R2 files are not read any more. */
export async function docsMoved(): Promise<boolean> {
  if (!supabaseOn()) return false
  if (moved && moved.until > Date.now()) return moved.on
  let on = false
  try {
    const res = await rest('server_flags?name=eq.docs&select=name')
    on = res.ok && ((await res.json()) as unknown[]).length > 0
  } catch {
    on = moved?.on ?? false
  }
  moved = { on, until: Date.now() + FLAG_MS }
  return on
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

/** Every document path under a prefix, from the table and (until the move finished) the old files, without repeats. */
export async function listDocPaths(prefix: string): Promise<string[]> {
  const fromTable = docsReady() ? await docList(prefix).catch(() => undefined) : undefined
  const fromFiles = fromTable === undefined || !(await docsMoved()) ? await blobPaths(prefix) : []
  return [...new Set([...(fromTable ?? []), ...fromFiles])].filter(isDocPath).sort()
}

// --- The owner's move ----------------------------------------------------------------------------------------------

/** How many files one call copies: each costs an R2 read, and a Worker on the free plan may make 50 outbound requests. */
export const MOVE_BATCH = 30

export interface MoveStep {
  /** Files copied in this call (a file the table already had is skipped and not counted). */
  copied: number
  /** Where the next call goes on; null when everything is in the table (the 'docs' flag is then set). */
  next: { prefix: number; cursor?: string } | null
  /** The prefix being worked on, for the screen. */
  at: string
}

/** Reads one R2 file's text (null when it is gone). */
async function blobText(path: string): Promise<string | null> {
  const blob = await get(path, { access: 'private', useCache: false })
  if (!blob || blob.statusCode !== 200 || !blob.stream) return null
  return await new Response(blob.stream).text()
}

/**
 * One step of copying the R2 files into the table: a page of one prefix, at most MOVE_BATCH files. A file already in
 * the table is left as it is (a newer write must not be overwritten by an older file); running a step again is
 * harmless. The caller repeats with `next` until it is null.
 */
export async function moveDocs(from: { prefix: number; cursor?: string } = { prefix: 0 }): Promise<MoveStep> {
  if (!supabaseOn()) throw new DocsError('supabase not set up')
  if ((await call('server_docs?select=path&limit=1')) === undefined) throw new DocsError('migration 0010 not run')
  const prefix = DOC_PREFIXES[from.prefix]
  if (!prefix) {
    await rest('server_flags?on_conflict=name', { method: 'POST', headers: { prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ name: 'docs', value: true }) })
    moved = { on: true, until: Date.now() + FLAG_MS }
    return { copied: 0, next: null, at: '' }
  }
  const page = await list({ prefix, cursor: from.cursor, limit: MOVE_BATCH })
  const paths = page.blobs.map((b) => b.pathname).filter(isDocPath)
  const rows = (await Promise.all(paths.map(async (path) => ({ path, body: await blobText(path) })))).filter((r): r is { path: string; body: string } => r.body !== null)
  let copied = 0
  if (rows.length) {
    const res = await call('server_docs?on_conflict=path', {
      method: 'POST',
      headers: { prefer: 'resolution=ignore-duplicates,return=representation' },
      body: JSON.stringify(rows),
    })
    copied = res ? ((await res.json()) as unknown[]).length : 0
  }
  const next = page.hasMore ? { prefix: from.prefix, cursor: page.cursor } : { prefix: from.prefix + 1 }
  return { copied, next, at: prefix }
}

// --- What _account.ts calls ----------------------------------------------------------------------------------------

/** The text at a document path: the table first, then (until the move finished) the old file. undefined: not handled here. */
export async function readDoc(path: string): Promise<string | null | undefined> {
  if (!docsReady()) return undefined
  const found = await docGet(path)
  if (found === undefined) return undefined
  if (found !== null) return found
  return (await docsMoved()) ? null : undefined
}

/** Writes a document path to the table; false when the table is not there (the caller writes the file). */
export const writeDoc = async (path: string, body: string): Promise<boolean> => docsReady() && (await docPut(path, body))

/** Creates a document path only if neither the table nor the old file has it; undefined when the table is not there. */
export async function createDoc(path: string, body: string): Promise<boolean | undefined> {
  if (!docsReady()) return undefined
  if (!(await docsMoved()) && (await blobText(path).catch(() => null)) !== null) return false
  return docCreate(path, body)
}

/** Deletes a document path from the table and its old file. */
export async function removeDoc(path: string): Promise<void> {
  if (docsReady()) await docDelete(path)
  await del(path).catch(() => undefined)
}

export { DocsError }
export const blobPut = (path: string, body: string, create = false) => put(path, body, { access: 'private', addRandomSuffix: false, allowOverwrite: !create, contentType: path.endsWith('.txt') ? 'text/plain' : 'application/json' })
