// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AccessContext } from './accessContext'
import { FriendsCard } from './FriendsCard'
import type { GameState } from './game'
import type { Profile } from '../data/db'

const card = (code: string, name: string, today: number, week: number) => ({ code, name, avatar: 'fox', color: '#2f6de6', today, week, streak: 3, level: 4, at: '2026-10-15T10:00:00Z' })
const game = { xp: { total: 300, today: 40, maxCombo: 0, byDay: new Map([['2026-10-15', 40]]) }, streak: 3, level: { level: 4 } } as unknown as GameState
const profile = { name: 'Ali', emoji: 'monki', color: '#c6317c', motto: '' } as Profile

let root: ReturnType<typeof createRoot> | undefined
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
  vi.unstubAllGlobals()
  localStorage.clear()
})

async function mount(approved: boolean, friends = [card('BBBBBBBB', 'Veli', 90, 120)]) {
  const calls: { url: string; body?: unknown }[] = []
  vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
    const body = init?.body ? JSON.parse(String(init.body)) : undefined
    calls.push({ url, body })
    if (body?.action === 'friends-add') return Response.json({ error: 'unknown' }, { status: 400 })
    if (body?.action === 'friends-publish') return Response.json({ me: card('AAAAAAAA', 'Ali', 40, 300) })
    return Response.json({ me: card('AAAAAAAA', 'Ali', 40, 300), friends })
  })
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root!.render(<AccessContext.Provider value={{ status: approved ? 'approved' : 'signedOut', approved, refresh: async () => {} }}><FriendsCard game={game} profile={profile} /></AccessContext.Provider>))
  await act(() => new Promise((r) => setTimeout(r, 30)))
  return { host, calls }
}

describe('FriendsCard', () => {
  it('publishes the own card, then ranks the learner and the friends by today or this week', async () => {
    const { host, calls } = await mount(true)
    expect(calls.some((c) => (c.body as { action?: string } | undefined)?.action === 'friends-publish')).toBe(true)
    const names = () => [...host.querySelectorAll('.friends-name')].map((n) => n.textContent!.replace(/\d+$/, '').trim())
    expect(names()).toEqual(['Veli', 'Sen'])
    await act(async () => [...host.querySelectorAll('button')].find((b) => b.textContent === 'Bu hafta')!.click())
    expect(names()).toEqual(['Sen', 'Veli'])
    expect(host.querySelector('.friends-code code')!.textContent).toBe('AAAA-AAAA')
  })

  it('an unchanged card is not sent again', async () => {
    await mount(true)
    act(() => root?.unmount())
    const { calls } = await mount(true)
    expect(calls.some((c) => (c.body as { action?: string } | undefined)?.action === 'friends-publish')).toBe(false)
  })

  it('without an account it says how to get one, and asks the server nothing', async () => {
    const { host, calls } = await mount(false)
    expect(host.textContent).toContain('bir hesap aç')
    expect(calls).toEqual([])
  })
})
