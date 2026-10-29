import { useEffect, useState } from 'react'
import { ACCOUNT_EVENT } from '../data/access'
import { loadServerHelpers, serverHelpersOn, type ServerHelpers } from '../data/aiServer'

const AGAIN_MS = 10 * 60_000

/**
 * Which paid helpers the owner opened for this person (api/ai.ts), asked on start, when the account changes and on
 * coming back to the tab after a while (the owner may have switched them on meanwhile). `undefined` while asking or
 * in a build without Supabase; `null` when the server could not be asked (offline): the helpers stay as last known.
 */
export function useServerHelpers(): ServerHelpers | null | undefined {
  const [helpers, setHelpers] = useState<ServerHelpers | null | undefined>(undefined)
  useEffect(() => {
    if (!serverHelpersOn()) return
    let live = true
    let at = 0
    const ask = () => {
      at = Date.now()
      void loadServerHelpers().then((got) => {
        if (live) setHelpers((was) => got ?? was ?? null)
      })
    }
    const back = () => {
      if (document.visibilityState === 'visible' && Date.now() - at > AGAIN_MS) ask()
    }
    ask()
    window.addEventListener(ACCOUNT_EVENT, ask)
    document.addEventListener('visibilitychange', back)
    return () => {
      live = false
      window.removeEventListener(ACCOUNT_EVENT, ask)
      document.removeEventListener('visibilitychange', back)
    }
  }, [])
  return helpers
}
