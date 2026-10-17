// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { FriendView } from '../data/friends'
import { FriendLeague } from './FriendLeague'

// Wednesday the 14th: this week began on the 12th, last week ran from the 5th to the 11th.
const TODAY = '2026-10-14'
const view = (code: string, name: string, days: Record<string, number>): FriendView => ({ code, name, avatar: 'fox', color: '#2f6de6', today: 0, week: 0, streak: 0, level: 1, days, at: '2026-10-14T10:00:00Z' })

let root: ReturnType<typeof createRoot> | undefined
beforeEach(() => localStorage.clear())
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
})
