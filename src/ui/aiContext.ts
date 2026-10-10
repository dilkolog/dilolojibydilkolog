import { createContext, useContext } from 'react'

export interface AiState {
  /** The user's Anthropic API key, or null when AI features are off. */
  apiKey: string | null
  /** The AI screens wait for the owner's approval of the account (a stored key stays unused until then). */
  needsApproval?: boolean
  setApiKey: (key: string | null) => Promise<void>
}

export const AiContext = createContext<AiState>({ apiKey: null, setApiKey: async () => {} })

export const useAi = () => useContext(AiContext)
