import { accessFetch } from './access'

/** What the AI features carry in place of a key: the calls go through /api/ai, which adds the owner's key on the server. */
export const AI_ACCOUNT = 'account'

/** Whether the server has the owner's AI key (asked once the account is approved). */
export async function aiAvailable(): Promise<boolean> {
  try {
    const res = await accessFetch('/api/ai')
    if (!res.ok) return false
    return ((await res.json()) as { available?: unknown }).available === true
  } catch {
    return false
  }
}
