import { describe, expect, it } from 'vitest'
import { addNotice, cleanNotices, markAllRead, MAX_NOTICES, noticeTime, unreadCount, type Notice } from '../notices'

const make = (id: string, at = '2026-10-17T10:00:00.000Z'): Omit<Notice, 'read'> => ({ id, kind: 'badge', text: `Yeni rozet ${id}`, at })

describe('notices', () => {
  it('puts the newest first, lists one event once, and drops the oldest past the cap', () => {
    let list: Notice[] = []
    list = addNotice(list, make('badge|a'))
    list = addNotice(list, make('badge|b'))
    expect(list.map((n) => n.id)).toEqual(['badge|b', 'badge|a'])
    expect(addNotice(list, make('badge|a'))).toBe(list)
    for (let i = 0; i < MAX_NOTICES + 5; i++) list = addNotice(list, make(`badge|n${i}`))
    expect(list).toHaveLength(MAX_NOTICES)
    expect(list[0].id).toBe(`badge|n${MAX_NOTICES + 4}`)
  })

  it('counts the unread and marks them all read, leaving a read list as it is', () => {
    const list = addNotice(addNotice([], make('badge|a')), make('badge|b'))
    expect(unreadCount(list)).toBe(2)
    const read = markAllRead(list)
    expect(unreadCount(read)).toBe(0)
    expect(markAllRead(read)).toBe(read)
  })

  it('keeps only well-formed notices of a stored list, newest first', () => {
    const good = { id: 'cert|fr|A1', kind: 'cert', text: 'Sertifika', at: '2026-10-16T10:00:00.000Z', read: true, target: 'guide' }
    const newer = { id: 'badge|x', kind: 'badge', text: 'Rozet', at: '2026-10-17T10:00:00.000Z', read: false, target: 'nowhere' }
    const cleaned = cleanNotices([good, newer, good, { id: 'bad id', kind: 'badge', text: 'x', at: '2026-10-17T10:00:00.000Z' }, { id: 'badge|y', kind: 'party', text: 'x', at: '2026-10-17T10:00:00.000Z' }, { id: 'badge|z', kind: 'badge', text: ' ', at: '2026-10-17T10:00:00.000Z' }, { id: 'badge|w', kind: 'badge', text: 'x', at: 'yesterday' }, null, 7])
    expect(cleaned).toEqual([
      { id: 'badge|x', kind: 'badge', text: 'Rozet', at: newer.at, read: false },
      { id: 'cert|fr|A1', kind: 'cert', text: 'Sertifika', at: good.at, read: true, target: 'guide' },
    ])
    expect(cleanNotices(null)).toEqual([])
  })

  it('says when in plain Turkish', () => {
    const now = new Date(2026, 9, 17, 15, 0)
    expect(noticeTime(new Date(2026, 9, 17, 14, 59, 40).toISOString(), now)).toBe('az önce')
    expect(noticeTime(new Date(2026, 9, 17, 14, 48).toISOString(), now)).toBe('12 dk önce')
    expect(noticeTime(new Date(2026, 9, 17, 9, 5).toISOString(), now)).toBe('bugün 09:05')
    expect(noticeTime(new Date(2026, 9, 16, 21, 30).toISOString(), now)).toBe('dün 21:30')
    expect(noticeTime(new Date(2026, 9, 12, 9, 0).toISOString(), now)).toBe('12 Ekim')
  })
})
