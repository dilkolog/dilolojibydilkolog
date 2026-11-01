import { isAiLevel, DEFAULT_AI_LEVEL, type AiLevel } from '../ai/levels'
import type { AiFeature } from '../ai/usage'
import { accessFetch } from './access'

/** What the AI features carry in place of a key: the calls go through /api/ai, which adds the owner's key on the server. */
export const AI_ACCOUNT = 'account'

export interface AiStatus {
  /** The server has the owner's key and this account has a level above "kapali". */
  available: boolean
  level: AiLevel
  /** The features the account's level opens. */
  features: AiFeature[]
}

const NONE: AiStatus = { available: false, level: DEFAULT_AI_LEVEL, features: [] }

/** Whether the AI is on for this account and what it may do (asked once the account is approved). */
export async function aiAvailable(): Promise<AiStatus> {
  try {
    const res = await accessFetch('/api/ai')
    if (!res.ok) return NONE
    const body = (await res.json()) as { available?: unknown; level?: unknown; features?: unknown }
    return {
      available: body.available === true,
      level: isAiLevel(body.level) ? body.level : DEFAULT_AI_LEVEL,
      features: Array.isArray(body.features) ? (body.features.filter((f) => typeof f === 'string') as AiFeature[]) : [],
    }
  } catch {
    return NONE
  }
}
