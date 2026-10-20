import { useEffect, useState } from 'react'
import type { Profile } from '../data/db'
import { addFriend, FriendsError, inviterOf, sendToFriend, type InviterCard } from '../data/friends'
import { INVITED_XP } from '../engine/xpLedger'
import { useAccess } from './accessContext'
import { Avatar } from './Avatar'
import { ConfirmDialog } from './Dialog'
import { clearInvite, pendingInviteInfo } from './invite'
import { rewardInvited } from './inviteReward'
import { showToast } from './toastFeed'

/** What the server answers that no retry will change: the link is let go. */
const FINAL: Record<string, string | null> = {
  unknown: 'Davet bağlantısı geçerli değil.',
  self: null,
  full: 'Arkadaş listen dolu (en çok 50), davet eklenemedi.',
}

/** Not twice at once (a dev-mode double effect, a quick re-render): the question is asked once. */
let working = false

interface Asking {
  code: string
  inviter: InviterCard
  /** The name the link said, when it does not match the card's: the link's name is not checked by anyone. */
  claimed?: string
}

const sameName = (a: string, b: string) => a.trim().toLocaleLowerCase('tr') === b.trim().toLocaleLowerCase('tr')

/**
 * Once there is an account the server accepts, the invite link kept by invite.ts is answered: the person sees whose
 * code it really is (the card the server holds, not the name written in the link) and chooses. Accepted, the inviter
 * becomes a friend (both see each other on the board); turned down, the link is forgotten. A failure that may pass
 * (offline, the account not approved yet) leaves the link for the next visit.
 */
export function InviteAccept({ onDone }: { onDone?: () => void }) {
  const { approved } = useAccess()
  const [asking, setAsking] = useState<Asking | null>(null)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (!approved || working) return
    const pending = pendingInviteInfo()
    if (!pending) return
    working = true
    void (async () => {
      try {
        const inviter = await inviterOf(pending.code)
        if (!inviter) return letGo('unknown')
        setAsking({ code: pending.code, inviter, ...(pending.name && !sameName(pending.name, inviter.name) ? { claimed: pending.name } : {}) })
      } catch (e) {
        if (e instanceof FriendsError && e.reason in FINAL) letGo(e.reason)
      } finally {
        working = false
      }
    })()
  }, [approved])

  if (!asking) return null

  const accept = async () => {
    setAdding(true)
    try {
      await addFriend(asking.code)
      clearInvite()
      setAsking(null)
      // Tells the one who invited (a message in their inbox, a notification), and a little for being invited. Neither can hold up the add.
      void sendToFriend(asking.code, 'joined').catch(() => undefined)
      const earned = await rewardInvited().catch(() => false)
      showToast(`${asking.inviter.name} ile arkadaş oldun.${earned ? ` Davet bonusu: +${INVITED_XP} XP.` : ''}`)
      onDone?.()
    } catch (e) {
      if (e instanceof FriendsError && e.reason in FINAL) {
        setAsking(null)
        letGo(e.reason)
      } else showToast('Eklenemedi, biraz sonra yine dene.', undefined, 5000, 'info')
    } finally {
      setAdding(false)
    }
  }

  const decline = () => {
    clearInvite()
    setAsking(null)
  }

  const { inviter, claimed } = asking
  return (
    <ConfirmDialog title="Arkadaş daveti" confirmLabel={adding ? 'Ekleniyor…' : 'Arkadaş ekle'} cancelLabel="Ekleme" onConfirm={() => !adding && void accept()} onCancel={decline}>
      <div className="invite-ask">
        <Avatar profile={{ name: inviter.name, emoji: inviter.avatar || '🙂', color: inviter.color, motto: '' } as Profile} size={48} />
        <div>
          <strong>{inviter.name}</strong>
          <span className="small muted">Seviye {inviter.level}</span>
        </div>
      </div>
      <p className="small">Bu bağlantı {inviter.name} adlı kişinin. Arkadaş olunca birbirinizin günlük XP'sini ve serisini görürsünüz.</p>
      {claimed && (
        <p className="note small">
          Bağlantıda “{claimed}” yazıyordu ama kod {inviter.name} adlı kişinin. Tanımıyorsan ekleme.
        </p>
      )}
    </ConfirmDialog>
  )
}

/** Forgets a link that can never work, saying so unless it was the person's own. */
function letGo(reason: string) {
  clearInvite()
  const text = FINAL[reason]
  if (text) showToast(text, undefined, 5000, 'info')
}
