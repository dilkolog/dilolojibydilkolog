import { rest, supabaseOn } from './_supabase.js'
import { StorageError } from './_account.js'

/**
 * Supabase tables for what the server keeps besides the synced data (supabase/migrations/0003_server_tables.sql):
 * friend cards and follows, shared lists, push and mail reminders. They are used once the owner moved the
 * Blob files over (admin.ts 'move-tables', which writes the 'tables' flag); before that, and whenever
 * Supabase is not set up, everything stays in Blob as it was.
 */

/** How long a server instance trusts its answer about the flag: after a move, the others follow within this. */
const FLAG_MS = 15_000
let flag: { on: boolean; until: number } | null = null

export const forgetTablesFlag = () => void (flag = null)

/** Whether friends, shares and reminders are read from and written to the tables. */
export async function tablesOn(): Promise<boolean> {
  if (!supabaseOn()) return false
  if (flag && flag.until > Date.now()) return flag.on
  let on = false
  try {
    const res = await rest('server_flags?name=eq.tables&select=name')
    // A missing table (0003 not run yet) reads as off, like a missing flag.
    on = res.ok && ((await res.json()) as unknown[]).length > 0
  } catch {
    // Supabase unreachable: keep the last answer if there was one, else Blob.
    on = flag?.on ?? false
  }
  flag = { on, until: Date.now() + FLAG_MS }
  return on
}

/** Sets the flag (the move is under way or done): from now on this instance uses the tables. */
export async function setTablesFlag(): Promise<void> {
  const res = await rest('server_flags?on_conflict=name', { method: 'POST', headers: { prefer: 'resolution=merge-duplicates,return=minimal' }, body: JSON.stringify({ name: 'tables', value: true }) })
  if (!res.ok) throw new StorageError(`supabase ${res.status}`)
  flag = { on: true, until: Date.now() + FLAG_MS }
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

/** For the owner's card: Supabase not set up, 0003 not run, ready to move, or moved. */
export async function tablesState(): Promise<'off' | 'missing' | 'ready' | 'on'> {
  if (!supabaseOn()) return 'off'
  const res = await table('server_flags?name=eq.tables&select=name')
  if (!res.ok) return res.status === 404 ? 'missing' : 'off'
  const on = ((await res.json()) as unknown[]).length > 0
  flag = { on, until: Date.now() + FLAG_MS }
  return on ? 'on' : 'ready'
}
