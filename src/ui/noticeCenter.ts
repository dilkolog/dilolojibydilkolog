import { useCallback, useEffect, useState } from 'react'
import { db } from '../data/instance'
import { addNotice, kindOff, markAllRead, unreadCount, type Notice } from '../engine/notices'

const listeners = new Set<() => void>()
const changed = () => listeners.forEach((f) => f())

/** Puts an event into the notice center (the bell); the same event (same id) is listed once, and not at all when its kind is turned off or the learner took it out. Never throws: a notice is a courtesy. */
export async function notify(notice: Omit<Notice, 'at' | 'read'> & { at?: string }): Promise<void> {
  try {
    if (kindOff((await db.getSettings())?.noticeOff, notice.kind)) return
    const gone = await db.getNoticesGone()
    await db.changeNotices((list) => addNotice(list, { ...notice, at: notice.at ?? new Date().toISOString() }, gone))
    changed()
  } catch {
    // Storage refused: the toast (if any) said it already.
  }
}

/** The list for the bell: loaded once, again whenever a notice is added or read. */
export function useNotices() {
  const [items, setItems] = useState<Notice[]>([])
  const load = useCallback(() => {
    void db.getNotices().then(setItems, () => {})
  }, [])
  useEffect(() => {
    load()
    listeners.add(load)
    return () => {
      listeners.delete(load)
    }
  }, [load])
  const readAll = useCallback(() => {
    void db.changeNotices(markAllRead).then(changed, () => {})
  }, [])
  /** Takes notices out (one, or all): they stay out even if the event is still waiting elsewhere. */
  const remove = useCallback((ids: readonly string[]) => {
    void db.removeNotices(ids).then(changed, () => {})
  }, [])
  return { items, unread: unreadCount(items), readAll, remove }
}
