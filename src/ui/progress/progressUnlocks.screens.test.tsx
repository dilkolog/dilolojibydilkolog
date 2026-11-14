// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS } from '../../data/db'
import { db, scheduler } from '../../data/instance'
import type { ReviewEvent } from '../../engine/types'
import { GameContext, loadGame } from '../game'
import { ProfileScreen } from '../profile/Profile'
import { ProgressScreen } from './Progress'
import { UNLOCK_ANSWERS } from './progressUnlocks'

let root: Root | null = null
let host: HTMLElement

async function show(node: React.ReactNode) {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root!.render(node))
  await act(() => new Promise((r) => setTimeout(r, 80)))
}

/** `n` answers given today in French, as a round leaves them. */
async function answer(n: number) {
  const now = Date.now()
  const events: ReviewEvent[] = Array.from({ length: n }, (_, i) => ({
    id: `e${i}`,
    entryId: `w${i % 5}`,
    language: 'fr',
    skill: 'recognition',
    exerciseType: 'mc_meaning',
    direction: 'target_to_native',
    verdict: i % 4 ? 'correct' : 'wrong',
    correct: i % 4 !== 0,
    rating: i % 4 ? 3 : 1,
    responseMs: 3000,
    hintsUsed: 0,
    retrievabilityBefore: 0.9,
    stabilityAfter: 2,
    scheduledDays: 1,
    mode: 'normal',
    timestamp: new Date(now - (n - i) * 60_000),
  }))
  await db.events.bulkAdd(events)
}

const progress = (onVerdict = vi.fn()) => (
  <ProgressScreen db={db} language="fr" vocabularyCount={0} states={[]} scheduler={scheduler} vocabulary={[]} onOpen={() => {}} onVocabTest={() => {}} onExam={() => {}} onVerdict={onVerdict} />
)

beforeEach(async () => {
  await db.events.clear()
  localStorage.clear()
})
afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.innerHTML = ''
})

describe('Progress opens as answers come', () => {
  it('no answers: one invitation, no rows of zeros; it starts the first round', async () => {
    const onVerdict = vi.fn()
    await show(progress(onVerdict))
    expect(host.querySelector('.empty-state')?.textContent).toContain('İlerlemen burada büyüyecek')
    expect(host.querySelector('.week-hero')).toBeNull()
    expect(host.querySelector('.hero-stat')).toBeNull()
    expect(host.querySelector('.group-toggle')).toBeNull()
    const start = [...host.querySelectorAll('button')].find((b) => b.textContent === 'İlk turuna başla')!
    await act(async () => start.click())
    expect(onVerdict).toHaveBeenCalledWith({ day: true })
  })

  it('after the first answers: the weekly rhythm, and the skills say how many answers they wait for', async () => {
    await answer(UNLOCK_ANSWERS.skills - 10)
    await show(progress())
    expect(host.querySelector('.empty-state')).toBeNull()
    expect(host.querySelector('.week-hero')).not.toBeNull()
    expect(host.querySelector('#p-skills')).toBeNull()
    expect(host.querySelector('.progress-locked')?.textContent).toContain('10 cevap kaldı')
  })

  it('with enough answers the skills and mistakes open as before', async () => {
    await answer(UNLOCK_ANSWERS.skills)
    await show(progress())
    expect(host.querySelector('#p-skills')).not.toBeNull()
    expect(host.querySelector('.progress-locked')).toBeNull()
  })
})

describe('Profile for a learner with no answers', () => {
  it('shows one invitation instead of the zeros, and starts the day', async () => {
    const onStartDay = vi.fn()
    const game = await loadGame(db)
    await show(
      <GameContext.Provider value={game}>
        <ProfileScreen settings={DEFAULT_SETTINGS} onChange={() => {}} onStartDay={onStartDay} />
      </GameContext.Provider>,
    )
    expect(host.querySelector('.profile-stats')).toBeNull()
    expect(host.querySelector('.empty-state')?.textContent).toContain('Bahçen ilk turla başlar')
    await act(async () => [...host.querySelectorAll('button')].find((b) => b.textContent === 'İlk turuna başla')!.click())
    expect(onStartDay).toHaveBeenCalledTimes(1)
    // The badges stay: what comes next is worth seeing from the start.
    expect(host.querySelector('.page-tab')).not.toBeNull()
  })

  it('with answers: the numbers as before', async () => {
    await answer(5)
    const game = await loadGame(db)
    await show(
      <GameContext.Provider value={game}>
        <ProfileScreen settings={DEFAULT_SETTINGS} onChange={() => {}} />
      </GameContext.Provider>,
    )
    expect(host.querySelector('.empty-state')).toBeNull()
    expect(host.querySelectorAll('.profile-stats .stat')).toHaveLength(4)
  })
})
