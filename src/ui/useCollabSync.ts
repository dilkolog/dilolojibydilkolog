import { useEffect } from 'react'
import { db } from '../data/instance'
import { syncAllCollabs } from '../data/share'

/** How long between two syncs of the shared lists while the app is open. */
const EVERY_MS = 10 * 60_000

/** Keeps the joined collaborative lists in step: at start, and again when the app comes back after a while. */
export function useCollabSync(onChanged: () => void, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    let last = 0
    let running = false
    const run = async () => {
      if (running || Date.now() - last < EVERY_MS) return
      running = true
      try {
        const r = await syncAllCollabs(db)
        last = Date.now()
        if (r.changed) onChanged()
      } finally {
        running = false
      }
    }
    const t = setTimeout(() => void run(), 4000)
    const onVisible = () => document.visibilityState === 'visible' && void run()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearTimeout(t)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [onChanged, enabled])
}
