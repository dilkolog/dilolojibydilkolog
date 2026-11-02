import { createContext, useContext } from 'react'
import type { AiLevel } from '../ai/levels'
import type { AiFeature } from '../ai/usage'

export interface AiState {
  /** 'account' when the AI features are on (an approved account and a server key), or null when they are off. Never a real key: the calls go through /api/ai. */
  apiKey: string | null
  /** The AI screens wait for the owner's approval of the account (a stored key stays unused until then). */
  needsApproval?: boolean
  /** What the owner opened for this account (profiles.ai_level); undefined where it is not known (everything shown, the server decides). */
  level?: AiLevel
  /** Whether the account's level opens a feature. */
  allows?: (feature: AiFeature) => boolean
}

export const AiContext = createContext<AiState>({ apiKey: null })

export const useAi = () => useContext(AiContext)

/** Whether the AI feature is open for this account (true where the level is not known: the server still decides). */
export const useAllows = () => {
  const { allows } = useAi()
  return allows ?? (() => true)
}
