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
import { SessionScreen } from './Session'

describe('Session: an answer that could not be saved', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>
  let entry: VocabularyEntry

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
    vi.restoreAllMocks()
  })

  it('leaves the question answerable (it used to freeze) and is said, then the next try goes through', async () => {
    const items: PlanItem[] = [{ entryId: entry.id, exerciseType: 'mc_meaning', kind: 'exercise', skill: 'recognition', reason: 'due' }]
    await act(async () => {
      root.render(<SessionScreen db={db} scheduler={scheduler} mode="normal" options={{}} vocabulary={[entry]} states={[] as UserWordState[]} mistakes={[]} items={items} seed={42} onFinish={vi.fn()} onQuit={vi.fn()} />)
    })
    const save = vi.spyOn(db, 'saveReview').mockRejectedValueOnce(new DOMException('full', 'QuotaExceededError'))
    const options = () => [...container.querySelectorAll<HTMLButtonElement>('.option')]
    await act(async () => {
      options()[0].click()
      await new Promise((r) => setTimeout(r, 80))
    })
    // Nothing was recorded, no result sheet; still the same question.
    expect(save).toHaveBeenCalledTimes(1)
    expect(container.querySelector('.sheet')).toBeNull()
    await act(async () => {
      options()[0].click()
    })
    for (let i = 0; i < 50 && !container.querySelector('.sheet'); i++) await act(async () => void (await new Promise((r) => setTimeout(r, 40))))
    expect(save).toHaveBeenCalledTimes(2)
    expect(container.querySelector('.sheet')).not.toBeNull()
  })
})
