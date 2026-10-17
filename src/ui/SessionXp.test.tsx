// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db, scheduler } from '../data/instance'
import { createEntry } from '../data/wordInput'
import type { PlanItem } from '../engine/dailyPlan'
import type { ReviewEvent, UserWordState, VocabularyEntry } from '../engine/types'
import { SessionScreen } from './Session'

describe('Session: the XP of an answer knows the day it is in', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>
  let entry: VocabularyEntry
  const items = (): PlanItem[] => [{ entryId: entry.id, exerciseType: 'mc_meaning', kind: 'exercise', skill: 'recognition', reason: 'due' }]

  const event = (n: number, daysAgo: number, mode: 'normal' | 'practice' = 'normal'): ReviewEvent => {
    const at = new Date()
    at.setDate(at.getDate() - daysAgo)
    at.setHours(0, n % 60, 0, 0)
    return {
      id: `seed-${daysAgo}-${n}-${mode}`, entryId: 'someone-else', language: 'fr', skill: 'recognition', exerciseType: 'mc_meaning', direction: 'target_to_native',
      verdict: 'correct', correct: true, rating: 3, responseMs: 3000, hintsUsed: 0, retrievabilityBefore: 0, stabilityAfter: 1, scheduledDays: 1, mode, timestamp: at,
    } as ReviewEvent
  }

  beforeEach(async () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    entry = createEntry({ word: 'la maison', meaning: 'ev', example: 'La *maison* est grande.', exampleTranslation: 'Ev büyük.' }, 'fr', new Date())
    await db.vocabulary.clear()
    await db.events.clear()
    await db.vocabulary.put(entry)
  })
  afterEach(async () => {
    act(() => root.unmount())
    container.remove()
    await db.events.clear()
  })

  const play = async () => {
    await act(async () => {
      root.render(<SessionScreen db={db} scheduler={scheduler} mode="normal" options={{}} vocabulary={[entry]} states={[] as UserWordState[]} mistakes={[]} items={items()} seed={42} onFinish={vi.fn()} onQuit={vi.fn()} />)
    })
    // The day is read once, a moment after the session opens.
    await act(async () => void (await new Promise((r) => setTimeout(r, 60))))
    const options = [...container.querySelectorAll<HTMLButtonElement>('.option')]
    const pick = options.find((o) => o.textContent?.replace(/^\d/, '') === 'ev') ?? options[0]
    await act(async () => pick.click())
    for (let i = 0; i < 50 && !container.querySelector('.xp-pop'); i++) await act(async () => void (await new Promise((r) => setTimeout(r, 40))))
    return container.querySelector('.xp-pop')?.textContent
  }

  it('pays the full price early in the day', async () => {
    expect(await play()).toBe('+5 XP')
  })

  it('pays half once the day has 150 answers', async () => {
    await db.events.bulkPut(Array.from({ length: 150 }, (_, i) => event(i, 0)))
    expect(await play()).toBe('+3 XP')
  })

  it('adds the comeback bonus with the fifth real answer of a day after three days away', async () => {
    await db.events.bulkPut([event(0, 5), ...Array.from({ length: 4 }, (_, i) => event(i, 0))])
    expect(await play()).toBe('+15 XP')
  })

  it('has no bonus when the last day with answers was yesterday', async () => {
    await db.events.bulkPut([event(0, 1), ...Array.from({ length: 4 }, (_, i) => event(i, 0))])
    expect(await play()).toBe('+5 XP')
  })
})
