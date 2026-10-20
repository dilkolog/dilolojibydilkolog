import { useEffect } from 'react'
import { FriendsError, saveHandle } from '../data/friends'
import { useAccess } from './accessContext'
import { clearPendingHandle, pendingHandle } from './pendingHandle'
import { showToast } from './toastFeed'

/** What the server answers that no retry will change: the name is let go. */
const FINAL: Record<string, string> = {
  taken: 'Seçtiğin kullanıcı adı başkasında. Arkadaşlar kartından başka bir ad seç.',
  bad_handle: 'Seçtiğin kullanıcı adı geçerli değil. Arkadaşlar kartından yeni bir ad seç.',
}

/** Not twice at once (a dev-mode double effect, a quick re-render). */
let working = false

/**
 * Once there is an account the server accepts, the @name picked at sign-up becomes the person's findable name
 * (friends search by it). A failure that may pass (offline, the account not approved yet) leaves it for the next
 * visit. Renders nothing.
 */
export function HandleClaim() {
  const { approved } = useAccess()
  useEffect(() => {
    if (!approved || working) return
    const handle = pendingHandle()
    if (!handle) return
    working = true
    void (async () => {
      try {
        await saveHandle(handle, true)
        clearPendingHandle()
      } catch (e) {
        if (e instanceof FriendsError && e.reason in FINAL) {
          clearPendingHandle()
          showToast(FINAL[e.reason]!, undefined, 6000, 'info')
        }
      } finally {
        working = false
      }
    })()
  }, [approved])
  return null
}
