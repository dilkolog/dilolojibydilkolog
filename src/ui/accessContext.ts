import { createContext, useContext } from 'react'
import type { AccessStatus } from '../data/access'

export interface AccessState {
  /** What the server last said about this device's account; `signedOut` without an account, `unknown` until read. */
  status: AccessStatus | 'signedOut' | 'unknown'
  /** The owner has approved the account: the quota features, sync and the AI screens are open. */
  approved: boolean
  refresh: () => Promise<void>
}

export const AccessContext = createContext<AccessState>({ status: 'unknown', approved: false, refresh: async () => {} })

export const useAccess = () => useContext(AccessContext)
