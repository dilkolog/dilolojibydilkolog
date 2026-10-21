// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { FriendView } from '../data/friends'
import { FriendLeague } from './FriendLeague'

const sent = vi.hoisted(() => [] as { code: string; kind: string }[])
vi.mock('../data/friends', () => ({
  sendToFriend: async (code: string, kind: string) => {
    sent.push({ code, kind })
  },
}))

// Wednesday the 14th: this week began on the 12th, last week ran from the 5th to the 11th.
const TODAY = '2026-10-14'
const view = (code: string, name: string, days: Record<string, number>): FriendView => ({ code, name, avatar: 'fox', color: '#2f6de6', today: 0, week: 0, streak: 0, level: 1, days, at: '2026-10-14T10:00:00Z' })

let root: ReturnType<typeof createRoot> | undefined
beforeEach(() => {
  localStorage.clear()
  sent.length = 0
})
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
})

async function mount(me: FriendView, friends: FriendView[], nicknames: Record<string, string> = {}) {
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root!.render(<FriendLeague me={me} friends={friends} nicknames={nicknames} today={TODAY} />))
  return host
}

describe('FriendLeague', () => {
  it('shows the team\'s week against the goal and who studied', async () => {
    const host = await mount(view('AAAAAAAA', 'Ali', { '2026-10-12': 200 }), [view('BBBBBBBB', 'Veli', { '2026-10-13': 300 })])
    expect(host.textContent).toContain('500 / 1.000 XP')
    expect(host.querySelector('progress')!.value).toBe(50)
    expect(host.textContent).toContain('Veli 300')
    // A bigger goal is remembered.
    await act(async () => [...host.querySelectorAll('button')].find((b) => b.textContent === '2.500 XP')!.click())
    expect(host.textContent).toContain('500 / 2.500 XP')
    expect(localStorage.getItem('diloloji:friend-goal')).toBe('2500')
  })

  it('names last week\'s winner; a week the learner won is kept once', async () => {
    const me = view('AAAAAAAA', 'Ali', { '2026-10-06': 400 })
    const veli = view('BBBBBBBB', 'Veli', { '2026-10-07': 100 })
    const host = await mount(me, [veli], { BBBBBBBB: 'Veli K.' })
    expect(host.querySelector('.friends-podium')!.textContent).toContain('Sen')
    expect(host.querySelector('[role=status]')!.textContent).toContain('birincisi sensin')
    expect(JSON.parse(localStorage.getItem('diloloji:league-wins')!)).toEqual(['2026-10-05'])
    act(() => root?.unmount())
    await mount(me, [veli])
    expect(JSON.parse(localStorage.getItem('diloloji:league-wins')!)).toEqual(['2026-10-05'])
  })

  it('says the place when someone else won, and has no league when nobody studied last week', async () => {
    const host = await mount(view('AAAAAAAA', 'Ali', { '2026-10-06': 50 }), [view('BBBBBBBB', 'Veli', { '2026-10-07': 300 })])
    expect(host.querySelector('[role=status]')!.textContent).toContain('2. oldun')
    act(() => root?.unmount())
    const quiet = await mount(view('AAAAAAAA', 'Ali', {}), [view('BBBBBBBB', 'Veli', { '2026-10-13': 300 })])
    expect(quiet.textContent).toContain('Geçen hafta için sıralama yok')
  })

  it('near the shared goal, nudges the friends who have not studied today, once a week', async () => {
    const me = view('AAAAAAAA', 'Ali', { '2026-10-12': 500, '2026-10-14': 50 })
    const veli = view('BBBBBBBB', 'Veli', { '2026-10-13': 300 })
    const ayse = view('CCCCCCCC', 'Ayşe', { '2026-10-14': 20 })
    const host = await mount(me, [veli, ayse])
    // 870 of 1,000: close, not reached; Ayşe studied today, Veli did not.
    expect(host.textContent).toContain('Hedefe 130 XP kaldı')
    await act(async () => [...host.querySelectorAll('button')].find((b) => b.textContent === 'Dürt')!.click())
    expect(sent).toEqual([{ code: 'BBBBBBBB', kind: 'nudge' }])
    expect(host.querySelector('.friends-team-push')).toBeNull()
    expect(localStorage.getItem('diloloji:team-push')).toBe('"2026-10-12"')
    act(() => root?.unmount())
    const again = await mount(me, [veli, ayse])
    expect(again.querySelector('.friends-team-push')).toBeNull()
  })

  it('offers no push far from the goal or once it is reached', async () => {
    const far = await mount(view('AAAAAAAA', 'Ali', { '2026-10-12': 100 }), [view('BBBBBBBB', 'Veli', {})])
    expect(far.querySelector('.friends-team-push')).toBeNull()
    act(() => root?.unmount())
    const done = await mount(view('AAAAAAAA', 'Ali', { '2026-10-12': 1200 }), [view('BBBBBBBB', 'Veli', {})])
    expect(done.querySelector('.friends-team-push')).toBeNull()
  })
})
