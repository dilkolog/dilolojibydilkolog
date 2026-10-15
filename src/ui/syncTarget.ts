import { db } from '../data/instance'
import { currentSession, hasStoredSession, supabase } from '../data/supabase'
import type { Credential, PartStore } from '../data/sync'

/** The Supabase person whose store this device already syncs with (set once the data moved there). */
const STORE_KEY = 'syncStore'

/**
 * Where this device syncs: Supabase once the person signs in there and its tables are set up, the old
 * store (Vercel Blob, encrypted) otherwise. The first device to sync with Supabase moves the data: the
 * latest from the old store first (the other devices' last changes), then everything up, then the old
 * store is marked moved so a device still signed in the old way stops and says why.
 *
 * Supabase's library and the store are loaded only here, so the first screen stays light.
 */
export async function syncTarget(cred: Credential): Promise<Credential | PartStore> {
  if (typeof cred === 'string' || !hasStoredSession()) return cred
  const session = await currentSession().catch(() => null)
  if (!session) return cred
  const { supabaseStore, probeStore } = await import('../data/supabaseStore')
  const client = await supabase()
  const store = supabaseStore(client, session.user.id)
  if ((await db.meta.get(STORE_KEY))?.value === session.user.id) return store
  const probe = await probeStore(client, session.user.id)
  if (probe === 'missing') return cred
  if (probe === 'empty') {
    const sync = await import('./syncData')
    const { fetchVault } = await import('../data/vault')
    const moved = await sync.moveToSupabase(db, cred, store, () => fetchVault(session.access_token, cred.username))
    if (!moved) return cred
  }
  await db.meta.put({ key: STORE_KEY, value: session.user.id })
  return store
}

/** Forgets the choice (signing out): the next person on this device chooses again. */
export const forgetSyncTarget = () => db.meta.delete(STORE_KEY)
