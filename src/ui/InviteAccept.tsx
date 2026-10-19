import { useEffect } from 'react'
import { addFriend, FriendsError, loadFriends } from '../data/friends'
import { localDate } from '../engine/progress'
import { useAccess } from './accessContext'
import { clearInvite, pendingInvite } from './invite'
import { showToast } from './toastFeed'

/** What the server answers that no retry will change: the link is let go. */
const FINAL: Record<string, string | null> = {
  unknown: 'Davet bağlantısı geçerli değil.',
  self: null,
  full: 'Arkadaş listen dolu (en çok 50), davet eklenemedi.',
}

/** Not twice at once (a dev-mode double effect, a quick re-render): the add is harmless twice, the toast is not. */
let working = false

/**
 * Once there is an account the server accepts, the invite link kept by invite.ts is used: the inviter becomes a
 * friend (both see each other on the board). A failure that may pass (offline, the account not approved yet)
 * leaves the link for the next visit. Renders nothing.
 */
export function InviteAccept({ onDone }: { onDone?: () => void }) {
  const { approved } = useAccess()
  useEffect(() => {
    if (!approved || working) return
    const code = pendingInvite()
    if (!code) return
    working = true
    void (async () => {
      try {
        await addFriend(code)
        clearInvite()
        const name = await loadFriends(localDate(new Date()))
          .then((r) => r.friends.find((f) => f.code === code)?.name)
          .catch(() => undefined)
        showToast(name ? `${name} ile arkadaş oldun.` : 'Seni davet eden arkadaşın listene eklendi.')
        onDone?.()
      } catch (e) {
        if (e instanceof FriendsError && e.reason in FINAL) {
          clearInvite()
          const text = FINAL[e.reason]
          if (text) showToast(text, undefined, 5000, 'info')
        }
      } finally {
        working = false
      }
    })()
  }, [approved]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}
