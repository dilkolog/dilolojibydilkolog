// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../data/instance'
import { achievements, emptyStats } from '../engine/gamification'
import { BadgeWatcher } from './BadgeWatcher'
import { markBadgesSeen } from './badgeSeen'
import type { GameState } from './game'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

/** A game state with some badges earned by their numbers (none logged yet). */
const game = (stats: Partial<typeof emptyStats>) => ({ achievements: achievements({ ...emptyStats, ...stats }) }) as unknown as GameState
const settle = () => act(async () => void (await new Promise((r) => setTimeout(r, 30))))

describe('badge moments', () => {
  let el: HTMLDivElement
  let root: ReturnType<typeof createRoot>
  beforeEach(async () => {
    localStorage.clear()
    await db.meta.delete('badges')
    el = document.createElement('div')
    document.body.append(el)
    root = createRoot(el)
  })
  afterEach(() => {
    act(() => root.unmount())
    el.remove()
  })

  it('two new badges share one screen, and go into the log with today\'s date', async () => {
    markBadgesSeen([])
    await act(async () => root.render(<BadgeWatcher game={game({ wordsIntroduced: 50 })} paused={false} onProfile={() => {}} />))
    await settle()
    expect(el.querySelector('.badge-moment-group')?.children).toHaveLength(2)
    expect(el.textContent).toContain('2 yeni rozet')
    const log = await db.getBadgeLog()
    expect(Object.keys(log).sort()).toEqual(['first-word', 'words-50'])
    expect(log['words-50']).toMatch(/^\d{4}-\d\d-\d\dT/)
  })

  it('a pile at once (a restore, a sync) is logged quietly, without a date and without a moment', async () => {
    markBadgesSeen([])
    await act(async () => root.render(<BadgeWatcher game={game({ wordsIntroduced: 1000, longestStreak: 30 })} paused={false} onProfile={() => {}} />))
    await settle()
    expect(el.querySelector('.milestone-backdrop')).toBeNull()
    const log = await db.getBadgeLog()
    expect(Object.keys(log).length).toBeGreaterThan(3)
    expect(Object.values(log).every((at) => at === '')).toBe(true)
  })

  it('badges celebrated on this device before the log existed go in quietly', async () => {
    markBadgesSeen(['first-word'])
    await act(async () => root.render(<BadgeWatcher game={game({ wordsIntroduced: 1 })} paused={false} onProfile={() => {}} />))
    await settle()
    expect(el.querySelector('.milestone-backdrop')).toBeNull()
    expect(await db.getBadgeLog()).toEqual({ 'first-word': '' })
  })
})
