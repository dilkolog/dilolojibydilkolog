import { useEffect, useState } from 'react'
import { loadHandle, type HandleInfo } from '../data/friends'

/**
 * The person's @name for the account card: null until the server answered (or when it cannot be asked:
 * offline, not approved yet), then what it holds. `editing` is the form being open over a chosen name.
 */
export function useAccountHandle(enabled: boolean) {
  const [info, setInfo] = useState<HandleInfo | null>(null)
  const [editing, setEditing] = useState(false)
  useEffect(() => {
    if (!enabled) return
    let live = true
    void loadHandle()
      .then((got) => live && setInfo(got))
      .catch(() => undefined)
    return () => {
      live = false
    }
  }, [enabled])
  return { info, setInfo, editing, setEditing }
}
