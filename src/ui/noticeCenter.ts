import { useCallback, useEffect, useState } from 'react'
import { db } from '../data/instance'
import { addNotice, markAllRead, unreadCount, type Notice } from '../engine/notices'

const listeners = new Set<() => void>()
const changed = () => listeners.forEach((f) => f())

/** Puts an event into the notice center (the bell); the same event (same id) is listed once. Never throws: a notice is a courtesy. */
export async function notify(notice: Omit<Notice, 'at' | 'read'> & { at?: string }): Promise<void> {
  try {
    await db.changeNotices((list) => addNotice(list, { ...notice, at: notice.at ?? new Date().toISOString() }))
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
  return { items, unread: unreadCount(items), readAll }
}
