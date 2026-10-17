import { useEffect, useRef, useState } from 'react'
import { noticeTime, type Notice, type NoticeKind, type NoticeTarget } from '../engine/notices'
import { BellIcon, HeartIcon, InfoIcon, TrophyIcon, UserIcon } from './icons'
import { useNotices } from './noticeCenter'
import { Popover } from './Popover'

const ICON: Record<NoticeKind, typeof InfoIcon> = { sync: InfoIcon, badge: TrophyIcon, level: TrophyIcon, cert: TrophyIcon, account: UserIcon, friend: HeartIcon }

/**
 * The bell in the top bar: what happened while the learner was elsewhere, newest first. The count is what has not been
 * seen; opening the list marks it seen (the new ones stay highlighted while it is open). A notice leads to its place.
 */
export function NoticeBell({ onOpen }: { onOpen: (target: NoticeTarget) => void }) {
  const { items, unread, readAll } = useNotices()
  return (
    <Popover
      button={
        <>
          <BellIcon size={18} />
          {unread > 0 && (
            <span className="notice-count" aria-hidden>
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </>
      }
      buttonClassName="icon-btn notice-bell"
      buttonProps={{ 'aria-label': unread ? `Bildirimler, ${unread} yeni` : 'Bildirimler', title: 'Bildirimler' }}
      label="Bildirimler"
      align="start"
    >
      {(close) => <NoticeList items={items} onRead={readAll} onPick={(n) => { close(); if (n.target) onOpen(n.target) }} />}
    </Popover>
  )
}

function NoticeList({ items, onRead, onPick }: { items: Notice[]; onRead: () => void; onPick: (n: Notice) => void }) {
  // The ones that were new when the list opened stay marked for as long as it is open.
  const fresh = useRef(new Set(items.filter((n) => !n.read).map((n) => n.id)))
  const [now] = useState(() => new Date())
  useEffect(() => {
    if (fresh.current.size) onRead()
    // Once, when the list opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  if (!items.length) return <p className="small muted notice-empty">Henüz bildirim yok. Rozetler, arkadaş iletileri ve diğer cihazlardan gelen haberler burada görünür.</p>
  return (
    <ul className="notice-list">
      {items.map((n) => {
        const Icon = ICON[n.kind]
        const body = (
          <>
            <span className="notice-icon" aria-hidden>
              <Icon size={16} />
            </span>
            <span className="notice-text">
              <span>{n.text}</span>
              <span className="small muted">{noticeTime(n.at, now)}</span>
            </span>
          </>
        )
        return (
          <li key={n.id} className={`notice${fresh.current.has(n.id) ? ' notice-new' : ''}`}>
            {n.target ? (
              <button type="button" className="notice-row" onClick={() => onPick(n)}>
                {body}
              </button>
            ) : (
              <div className="notice-row">{body}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
