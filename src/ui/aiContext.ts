import { createContext, useContext } from 'react'

export interface AiState {
  /** 'account' when the AI features are on (an approved account and a server key), or null when they are off. Never a real key: the calls go through /api/ai. */
  apiKey: string | null
  /** The AI screens wait for the owner's approval of the account (a stored key stays unused until then). */
  needsApproval?: boolean
}

export const AiContext = createContext<AiState>({ apiKey: null })

export const useAi = () => useContext(AiContext)
