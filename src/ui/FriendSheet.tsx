import { useEffect, useRef, useState } from 'react'
import { FriendsError, sendToFriend, type FriendView, type InboxKind } from '../data/friends'
import { FRIEND_DAYS as DAYS, lastDays } from '../engine/friendDays'
import type { Profile } from '../data/db'
import { Avatar } from './Avatar'
import { CloseIcon, FlameIcon } from './icons'
import { showToast } from './toastFeed'

const SHORT = ['Pz', 'Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct']

/** The friend's page: how the last two weeks went, and a cheer or a nudge to send. */
export function FriendSheet({ friend, name, today, onClose }: { friend: FriendView; name: string; today: string; onClose: () => void }) {
  const [sent, setSent] = useState<Partial<Record<InboxKind, boolean>>>({})
  const [busy, setBusy] = useState<InboxKind | null>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  const series = lastDays(friend.days ?? {}, today)
  const peak = Math.max(1, ...series.map((d) => d.xp))
  const total = series.reduce((n, d) => n + d.xp, 0)
  const studiedToday = friend.today > 0

  useEffect(() => {
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopImmediatePropagation()
      onClose()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])

  const send = async (kind: InboxKind) => {
    setBusy(kind)
    try {
      await sendToFriend(friend.code, kind)
      setSent((s) => ({ ...s, [kind]: true }))
      showToast(kind === 'cheer' ? `${name} tebrik edildi.` : `${name} dürtüldü.`)
    } catch (e) {
      showToast(e instanceof FriendsError && e.reason === 'not_friends' ? 'Arkadaşlık henüz karşılıklı değil.' : 'Gönderilemedi, biraz sonra yine dene.', undefined, 5000, 'info')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog friend-sheet" role="dialog" aria-modal="true" aria-label={`${name} arkadaş sayfası`}>
        <div className="friend-sheet-head">
          <Avatar profile={{ name, emoji: friend.avatar || '🙂', color: friend.color, motto: '' } as Profile} size={48} />
          <div>
            <h2 className="section-title">{name}</h2>
            <p className="small muted">
              Seviye {friend.level}
              {friend.streak > 0 && (
                <>
                  {' · '}
                  <span className="friends-streak">
                    <FlameIcon size={12} solid /> {friend.streak} gün
                  </span>
                </>
              )}
            </p>
          </div>
          <button ref={closeRef} type="button" className="icon-btn friend-sheet-close" onClick={onClose} aria-label="Kapat">
            <CloseIcon size={18} />
          </button>
        </div>
        <p className="small muted">Son iki haftada {total.toLocaleString('tr-TR')} XP{studiedToday ? ' · bugün çalıştı' : ' · bugün henüz çalışmadı'}</p>
        <svg className="friend-bars" viewBox={`0 0 ${DAYS * 14} 64`} role="img" aria-label={`Son ${DAYS} günün XP'si; en yüksek ${peak} XP`}>
          {series.map((d, i) => {
            const h = d.xp ? Math.max(4, Math.round((d.xp / peak) * 48)) : 2
            const dow = new Date(`${d.day}T12:00:00`).getDay()
            return (
              <g key={d.day}>
                <rect className={d.day === today ? 'friend-bar friend-bar-today' : 'friend-bar'} x={i * 14 + 2} y={52 - h} width={10} height={h} rx={3}>
                  <title>{`${d.day}: ${d.xp} XP`}</title>
                </rect>
                <text className="friend-bar-day" x={i * 14 + 7} y={62} textAnchor="middle">
                  {SHORT[dow]}
                </text>
              </g>
            )
          })}
        </svg>
        <div className="friend-sheet-actions">
          <button type="button" className="btn" disabled={busy !== null || sent.cheer} onClick={() => void send('cheer')}>
            {sent.cheer ? 'Tebrik gitti ✓' : 'Tebrik et 👏'}
          </button>
          <button type="button" className="btn btn-quiet" disabled={busy !== null || sent.nudge || studiedToday} onClick={() => void send('nudge')} title={studiedToday ? 'Bugün zaten çalıştı' : 'Bugün çalışmasını hatırlat'}>
            {sent.nudge ? 'Dürtüldü ✓' : studiedToday ? 'Bugün çalıştı' : 'Dürt 👋'}
          </button>
        </div>
      </div>
    </div>
  )
}
