import type { SupabaseClient } from '@supabase/supabase-js'
import { SyncApprovalError, SyncAuthError, SyncConflictError, SyncTooLargeError, type PartStore } from './sync'

type Bytes = Uint8Array<ArrayBuffer>

const MEDIA_BUCKET = 'media'
const encode = (text: string) => new TextEncoder().encode(text) as Bytes

/** A database error as the sync knows them (codes raised by put_sync_part, supabase/migrations/0002_sync_data.sql). */
function syncError(error: { code?: string; message?: string }): Error {
  switch (error.code) {
    case '40001':
      return new SyncConflictError('changed meanwhile')
    case '42501':
      return new SyncApprovalError('approval required')
    case '54000':
      return new SyncTooLargeError('too large')
    case '28000':
      return new SyncAuthError('signed out')
    default:
      return new Error(`supabase ${error.code ?? ''}: ${error.message ?? ''}`.trim())
  }
}

/**
 * The sync's parts in Supabase: the data parts as plain JSON rows of `sync_parts` (the person's own,
 * by row security; written through `put_sync_part`, which checks the approval and the version),
 * pictures and recordings as files in the "media" bucket under the person's folder.
 */
export function supabaseStore(client: SupabaseClient, userId: string): PartStore {
  const mediaPath = (part: string) => `${userId}/${part}.json`
  return {
    kind: 'supabase',
    async fetch(part) {
      if (part.startsWith('m-')) {
        const { data, error } = await client.storage.from(MEDIA_BUCKET).download(mediaPath(part))
        if (error || !data) return null
        return { bytes: new Uint8Array(await data.arrayBuffer()) as Bytes }
      }
      const { data, error } = await client.from('sync_parts').select('data, version').eq('user_id', userId).eq('name', part).maybeSingle()
      if (error) throw syncError(error)
      if (!data) return null
      const row = data as { data: unknown; version: number }
      return { bytes: encode(JSON.stringify(row.data)), etag: String(row.version) }
    },
    async put(part, data, opts = {}) {
      if (part.startsWith('m-')) {
        const { error } = await client.storage.from(MEDIA_BUCKET).upload(mediaPath(part), new Blob([data], { type: 'application/json' }), { upsert: true, contentType: 'application/json' })
        if (error) throw new Error(`media upload: ${error.message}`)
        return data.length
      }
      const value = JSON.parse(new TextDecoder().decode(data)) as unknown
      const { error } = await client.rpc('put_sync_part', { p_name: part, p_data: value, p_expect: opts.ifMatch ? Number(opts.ifMatch) : null, p_create: !!opts.createOnly })
      if (error) throw syncError(error)
      return data.length
    },
    async history() {
      const { data, error } = await client.from('sync_parts').select('name').eq('user_id', userId).like('name', 'h-%').order('name', { ascending: false })
      if (error) throw syncError(error)
      return ((data ?? []) as { name: string }[]).map((r) => r.name.slice(2))
    },
  }
}

export type StoreProbe = 'missing' | 'empty' | 'ready'

/**
 * Whether Supabase can hold this person's data: 'missing' when the tables are not set up (the owner has
 * not run the migration yet: keep syncing the old way), 'empty' when nothing is there yet (the first
 * device moves the data over), 'ready' when another device already did. Throws on a network failure.
 */
export async function probeStore(client: SupabaseClient, userId: string): Promise<StoreProbe> {
  const { data, error } = await client.from('sync_parts').select('version').eq('user_id', userId).eq('name', 'core').maybeSingle()
  if (error) {
    // PostgREST: the relation is not in its schema cache (42P01 from Postgres, PGRST205 from the gateway).
    if (error.code === '42P01' || error.code === 'PGRST205' || error.code === 'PGRST204') return 'missing'
    throw syncError(error)
  }
  return data ? 'ready' : 'empty'
}
