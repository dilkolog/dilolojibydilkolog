import { rest, supabaseOn } from './_supabase.js'
import { StorageError } from './_account.js'

/**
 * Supabase tables for what the server keeps besides the synced data (supabase/migrations/0003_server_tables.sql):
 * friend cards and follows, shared lists, push and mail reminders. Three states, kept in server_flags:
 * - 'blob': before the owner's move (and whenever Supabase is not set up), everything stays in the R2 files.
 * - 'moving' (flag 'tables-moving', written when the move starts): writes go to the tables, reads look in the tables
 *   first and then in the old files, lists are the two together, deletions reach both. The owner's move copies the
 *   files over a few at a time (_moveTables.ts), so a move cut short loses nothing.
 * - 'table' (flag 'tables', written when the copying has finished): the old files are no longer read.
 */
export type TablesMode = 'blob' | 'moving' | 'table'

/** How long a server instance trusts its answer about the flags: after a change, the others follow within this. */
export const FLAG_MS = 15_000
let flag: { mode: TablesMode; movingSince: number | null; until: number } | null = null

export const forgetTablesFlag = () => void (flag = null)

async function readFlags(): Promise<{ mode: TablesMode; movingSince: number | null }> {
  const res = await rest('server_flags?name=in.(tables,tables-moving)&select=name,value')
  // A missing table (0003 not run yet) reads as no flags.
  if (!res.ok) return { mode: 'blob', movingSince: null }
  const found = (await res.json()) as { name: string; value: unknown }[]
  if (found.some((f) => f.name === 'tables')) return { mode: 'table', movingSince: null }
  const moving = found.find((f) => f.name === 'tables-moving')
  if (!moving) return { mode: 'blob', movingSince: null }
  const at = Date.parse(String((moving.value as { at?: string } | null)?.at ?? ''))
  return { mode: 'moving', movingSince: Number.isFinite(at) ? at : 0 }
}

/** Which of the three states the server data is in. */
export async function tablesMode(): Promise<TablesMode> {
  if (!supabaseOn()) return 'blob'
  if (flag && flag.until > Date.now()) return flag.mode
  try {
    const read = await readFlags()
    flag = { ...read, until: Date.now() + FLAG_MS }
  } catch {
    // Supabase unreachable: keep the last answer if there was one, else Blob.
    flag = { mode: flag?.mode ?? 'blob', movingSince: flag?.movingSince ?? null, until: Date.now() + FLAG_MS }
  }
  return flag.mode
}

/** Whether friends, shares and reminders live in the tables only (the move has finished). */
export const tablesOn = async (): Promise<boolean> => (await tablesMode()) === 'table'

/** Whether the tables may hold any of it (moving or moved): a deletion must reach them. */
export const tablesInUse = async (): Promise<boolean> => (await tablesMode()) !== 'blob'

/** The friends' inbox has its own switch: migration 0004 creates its table and writes the 'inbox' flag. */
let inboxFlag: { on: boolean; until: number } | null = null

export const forgetInboxFlag = () => void (inboxFlag = null)

/** Whether the friends' inbox lives in the table (0004 was run); a missing table or flag reads as no, like for 'tables'. */
export async function inboxTableOn(): Promise<boolean> {
  if (!supabaseOn()) return false
  if (inboxFlag && inboxFlag.until > Date.now()) return inboxFlag.on
  let on = false
  try {
    const res = await rest('server_flags?name=eq.inbox&select=name')
    on = res.ok && ((await res.json()) as unknown[]).length > 0
  } catch {
    on = inboxFlag?.on ?? false
  }
  inboxFlag = { on, until: Date.now() + FLAG_MS }
  return on
}

async function setFlag(name: string, value: unknown): Promise<void> {
  const res = await rest('server_flags?on_conflict=name', { method: 'POST', headers: { prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ name, value }) })
  if (!res.ok) throw new StorageError(`supabase ${res.status}`)
}

/** The move starts: from now on (on the other instances within FLAG_MS) writes go to the tables. */
export async function startMoving(now = Date.now()): Promise<void> {
  await setFlag('tables-moving', { at: new Date(now).toISOString() })
  flag = { mode: 'moving', movingSince: now, until: Date.now() + FLAG_MS }
}

/** The copying has finished: the old files are no longer read. */
export async function finishMoving(): Promise<void> {
  await setFlag('tables', true)
  flag = { mode: 'table', movingSince: null, until: Date.now() + FLAG_MS }
}

/** A REST call whose failure is a storage failure (the endpoints answer 502, the app tries again later). */
export async function table(path: string, init: RequestInit = {}): Promise<Response> {
  let res: Response
  try {
    res = await rest(path, init)
  } catch {
    throw new StorageError('supabase unreachable')
  }
  return res
}

/** Rows of a read; a failed read throws StorageError. */
export async function rows<T>(path: string): Promise<T[]> {
  const res = await table(path)
  if (!res.ok) throw new StorageError(`supabase ${res.status}`)
  return (await res.json()) as T[]
}

/** A write that must succeed (statuses in `allowed` are answered by the caller). */
export async function write(path: string, init: RequestInit, allowed: number[] = []): Promise<Response> {
  const res = await table(path, init)
  if (!res.ok && !allowed.includes(res.status)) throw new StorageError(`supabase ${res.status}`)
  return res
}

export const upsert = (name: string, conflict: string, row: unknown, ignore = false) =>
  write(`${name}?on_conflict=${conflict}`, { method: 'POST', headers: { prefer: `resolution=${ignore ? 'ignore' : 'merge'}-duplicates,return=minimal` }, body: JSON.stringify(row) })

export const eq = (v: string) => `eq.${encodeURIComponent(v)}`

/** For the owner's card: Supabase not set up, 0003 not run, ready to move, being moved (since when), or moved. */
export async function tablesState(): Promise<{ state: 'off' | 'missing' | 'ready' | 'moving' | 'on'; since?: number }> {
  if (!supabaseOn()) return { state: 'off' }
  const res = await table('server_flags?select=name&limit=1')
  if (!res.ok) return { state: res.status === 404 ? 'missing' : 'off' }
  const read = await readFlags()
  flag = { ...read, until: Date.now() + FLAG_MS }
  if (read.mode === 'table') return { state: 'on' }
  if (read.mode === 'moving') return { state: 'moving', since: read.movingSince ?? 0 }
  return { state: 'ready' }
}
