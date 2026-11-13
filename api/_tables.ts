import { rest, supabaseOn } from './_supabase.js'
import { StorageError } from './_account.js'

/**
 * Supabase tables for what the server keeps besides the synced data (supabase/migrations/0003_server_tables.sql and
 * 0004): friend cards and follows, the friends' inbox, shared lists, push and mail reminders. With Supabase set up they
 * live in the tables only (the owner's move from the R2 files finished on 2026-11-09); without it (local development,
 * most unit tests) in the R2 files.
 */
export type TablesMode = 'blob' | 'table'

/** Where friends, shares and reminders live. */
export const tablesMode = async (): Promise<TablesMode> => (supabaseOn() ? 'table' : 'blob')

/** Whether they live in the tables. */
export const tablesOn = async (): Promise<boolean> => supabaseOn()

/** Whether the tables may hold any of it: a deletion must reach them. */
export const tablesInUse = tablesOn

/** Whether the friends' inbox lives in its table (0004). */
export const inboxTableOn = tablesOn

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
