import { currentSession, supabaseConfigured } from './supabase'

/**
 * The paid helpers (AI, pronunciation scoring, natural voices) run on the site owner's keys through /api/ai, for the
 * people the owner allowed (api/ai.ts). Nobody types a key: where the code used to hold the learner's own key, it
 * holds SERVER_KEY, and the request goes to the server instead of the service.
 *
 * Builds without Supabase (local development, the E2E build) have no server helpers: there a key stored on the
 * device still works as before, so the tests can stub the services themselves.
 */
export const SERVER_KEY = 'server'

export interface ServerHelpers {
  ai: boolean
  speech: boolean
  voice: boolean
  /** The model the server uses (it decides; the app's own choice does not apply). */
  model?: string
  /** Why nothing is open: 'not_allowed' (the owner has not switched it on), 'signed_out', 'off', 'unavailable'. */
  reason?: string
}

export const serverHelpersOn = () => supabaseConfigured()

/** A fetch to /api/ai carrying the person's sign-in. */
export async function aiServerFetch(query: string, init: RequestInit = {}): Promise<Response> {
  const session = await currentSession().catch(() => null)
  const headers = new Headers(init.headers)
  if (session?.access_token) headers.set('authorization', `Bearer ${session.access_token}`)
  return fetch(`/api/ai${query}`, { ...init, headers })
}

/** What this person may use; null when it could not be asked (offline). */
export async function loadServerHelpers(): Promise<ServerHelpers | null> {
  if (!serverHelpersOn()) return null
  try {
    const res = await aiServerFetch('')
    if (!res.ok) return null
    return (await res.json()) as ServerHelpers
  } catch {
    return null
  }
}

/**
 * The Anthropic SDK's fetch when the key is SERVER_KEY: the SDK builds its request as for api.anthropic.com, this
 * sends it to /api/ai instead (the server adds the owner's key and decides the model). The SDK's own key header
 * is dropped.
 */
export async function claudeThroughServer(url: string | URL | Request, init: RequestInit = {}): Promise<Response> {
  const target = new URL(typeof url === 'string' ? url : url instanceof URL ? url.href : url.url)
  const headers = new Headers(init.headers)
  headers.delete('x-api-key')
  headers.delete('authorization')
  return aiServerFetch(`?kind=claude${target.searchParams.get('beta') === 'true' ? '&beta=1' : ''}`, { ...init, headers })
}
