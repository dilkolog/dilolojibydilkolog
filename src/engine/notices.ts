/**
 * The notice center's list: what happened while the learner was elsewhere (a sync brought words, a badge, a friend's
 * cheer). Kept on this device only; the toast says it once, the list keeps it.
 */
export type NoticeKind = 'sync' | 'badge' | 'level' | 'cert' | 'account' | 'friend'
/** Where a notice leads: a place of the app, so the list stays free of screen objects. */
export type NoticeTarget = 'home' | 'profile' | 'settings' | 'guide'

export interface Notice {
  /** Stable per event (`badge|streak-7`): the same event is never listed twice. */
  id: string
  kind: NoticeKind
  text: string
  /** ISO time. */
  at: string
  read: boolean
  target?: NoticeTarget
}

export const MAX_NOTICES = 50
const KINDS: readonly NoticeKind[] = ['sync', 'badge', 'level', 'cert', 'account', 'friend']
const TARGETS: readonly NoticeTarget[] = ['home', 'profile', 'settings', 'guide']
const ID = /^[a-z]+\|[\w.:|-]{1,120}$/
const MAX_TEXT = 240

/** The list with the notice at the front (newest first), unless its id is already there; the oldest fall off. */
export function addNotice(list: readonly Notice[], notice: Omit<Notice, 'read'>): Notice[] {
  if (list.some((n) => n.id === notice.id)) return list as Notice[]
  return [{ ...notice, text: notice.text.slice(0, MAX_TEXT), read: false }, ...list].slice(0, MAX_NOTICES)
}

export const markAllRead = (list: readonly Notice[]): Notice[] => (list.some((n) => !n.read) ? list.map((n) => (n.read ? n : { ...n, read: true })) : (list as Notice[]))

export const unreadCount = (list: readonly Notice[]): number => list.filter((n) => !n.read).length

/** A stored list read back: only well-formed notices, newest first, at most `MAX_NOTICES`. */
export function cleanNotices(raw: unknown): Notice[] {
  if (!Array.isArray(raw)) return []
  const seen = new Set<string>()
  const out: Notice[] = []
  for (const n of raw as Partial<Notice>[]) {
    if (!n || typeof n.id !== 'string' || !ID.test(n.id) || seen.has(n.id)) continue
    if (!KINDS.includes(n.kind as NoticeKind) || typeof n.text !== 'string' || !n.text.trim() || typeof n.at !== 'string' || Number.isNaN(Date.parse(n.at))) continue
    seen.add(n.id)
    out.push({ id: n.id, kind: n.kind as NoticeKind, text: n.text.slice(0, MAX_TEXT), at: n.at, read: n.read === true, ...(TARGETS.includes(n.target as NoticeTarget) ? { target: n.target as NoticeTarget } : {}) })
  }
  return out.sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, MAX_NOTICES)
}

/** "az önce", "12 dk önce", "bugün 14:47", "dün 09:10", "12 Ekim". */
export function noticeTime(at: string, now = new Date()): string {
  const d = new Date(at)
  const minutes = Math.floor((now.getTime() - d.getTime()) / 60_000)
  if (minutes < 1) return 'az önce'
  if (minutes < 60) return `${minutes} dk önce`
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const apart = Math.round((day(now) - day(d)) / 86_400_000)
  const time = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  if (apart <= 0) return `bugün ${time}`
  if (apart === 1) return `dün ${time}`
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })
}
