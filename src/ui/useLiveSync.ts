import { useEffect, useRef } from 'react'
import { db } from '../data/instance'
import { createLiveSync } from './liveSync'
import { isSyncing, runSync } from './syncRunner'

/** While the app is open and looked at, how often it asks the account for what other devices did. */
const POLL_MS = 120_000

/**
 * The data lives in the account: a change goes up a few seconds after it is made, what other devices did comes down when
 * the app is looked at again, when the network is back, and every couple of minutes while it is on screen. Nothing runs
 * during a session (it ends with its own sync) and nothing when there is no account (`runSync` then does nothing).
 */
export function useLiveSync(inSession: boolean): void {
  const busy = useRef(inSession)
  busy.current = inSession
  useEffect(() => {
    // Not `quiet` for what goes up: the screens reload if the merge brought something back; a pull is quiet when nothing came.
    const live = createLiveSync({ run: () => runSync(false, true), canRun: () => !busy.current })
    // A sync writes the merged copy back, which is no change of the user's: only the writes made outside one count.
    const off = db.onWrite(() => {
      if (!isSyncing()) live.touch()
    })
    const look = () => {
      if (document.visibilityState === 'visible') live.pull()
    }
    document.addEventListener('visibilitychange', look)
    window.addEventListener('online', look)
    window.addEventListener('focus', look)
    const poll = setInterval(look, POLL_MS)
    return () => {
      off()
      document.removeEventListener('visibilitychange', look)
      window.removeEventListener('online', look)
      window.removeEventListener('focus', look)
      clearInterval(poll)
      live.dispose()
    }
  }, [])
}
