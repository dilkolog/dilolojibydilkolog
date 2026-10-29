import { createContext, useContext } from 'react'

export interface AiState {
  /** The user's Anthropic API key, or null when AI features are off. */
  apiKey: string | null
  /** The AI is locked for this person: the owner has not opened it for the account yet (a stored key stays unused). */
  needsApproval?: boolean
  /** The AI runs on the owner's key on the server (a Supabase build): there is no key to type. */
  server?: boolean
  /** On the server: whether pronunciation scoring and natural voices are open for this person. */
  speech?: boolean
  voice?: boolean
  setApiKey: (key: string | null) => Promise<void>
}

export const AiContext = createContext<AiState>({ apiKey: null, setApiKey: async () => {} })

export const useAi = () => useContext(AiContext)
