import { createContext, useContext } from 'react'

export interface AiState {
  /** The user's Anthropic API key, or null when AI features are off. */
  apiKey: string | null
  setApiKey: (key: string | null) => Promise<void>
}

export const AiContext = createContext<AiState>({ apiKey: null, setApiKey: async () => {} })

export const useAi = () => useContext(AiContext)
