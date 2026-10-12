// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db, scheduler } from '../data/instance'
import { createEntry } from '../data/wordInput'
import type { PlanItem } from '../engine/dailyPlan'
import type { UserWordState, VocabularyEntry } from '../engine/types'
import { prefs } from './prefs'
import { SessionScreen } from './Session'

describe('Session: right answers go on by themselves when asked to', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>
  let entry: VocabularyEntry
  const items = (): PlanItem[] => [
    { entryId: entry.id, exerciseType: 'mc_meaning', kind: 'exercise', skill: 'recognition', reason: 'due' },
    { entryId: entry.id, exerciseType: 'mc_meaning', kind: 'exercise', skill: 'recognition', reason: 'due' },
  ]

  beforeEach(async () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    entry = createEntry({ word: 'la maison', meaning: 'ev', example: 'La *maison* est grande.', exampleTranslation: 'Ev büyük.' }, 'fr', new Date())
    await db.vocabulary.clear()
    await db.vocabulary.put(entry)
  })
  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    prefs.autoAdvance = 0
    vi.useRealTimers()
  })

  const mount = async () => {
    await act(async () => {
      root.render(
        <SessionScreen db={db} scheduler={scheduler} mode="normal" options={{}} vocabulary={[entry]} states={[] as UserWordState[]} mistakes={[]} items={items()} seed={42} onFinish={vi.fn()} onQuit={vi.fn()} />,
      )
    })
  }
  const choose = async (right: boolean) => {
    const options = [...container.querySelectorAll<HTMLButtonElement>('.option')]
    // The label starts with the option's number.
    const pick = options.find((o) => o.textContent?.replace(/^\d/, '') === 'ev') ?? options[0]
    const other = options.find((o) => o !== pick)!
    await act(async () => {
      ;(right ? pick : other).click()
      await new Promise((r) => setTimeout(r, 60))
    })
  }
  const answered = () => container.querySelector('.sheet') !== null

  it('a right answer is followed by the next question after the wait', async () => {
    prefs.autoAdvance = 1
    await mount()
    await choose(true)
    expect(answered()).toBe(true)
    // Polled, not a fixed wait: a busy machine runs the timer late.
    for (let i = 0; i < 40 && answered(); i++) await act(async () => void (await new Promise((r) => setTimeout(r, 100))))
    expect(answered()).toBe(false)
    expect(container.querySelectorAll('.option').length).toBeGreaterThan(0)
  })

  it('a wrong answer waits for "Devam", and so does a right one when it is off', async () => {
    prefs.autoAdvance = 1
    await mount()
    await choose(false)
    await act(async () => void (await new Promise((r) => setTimeout(r, 1200))))
    expect(answered()).toBe(true)
  })

  it('is off by default', async () => {
    await mount()
    await choose(true)
    await act(async () => void (await new Promise((r) => setTimeout(r, 1200))))
    expect(answered()).toBe(true)
  })
})
