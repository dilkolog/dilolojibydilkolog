// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db, scheduler } from '../data/instance'
import { createEntry } from '../data/wordInput'
import type { PlanItem } from '../engine/dailyPlan'
import { newWordState } from '../engine/review'
import type { UserWordState, VocabularyEntry } from '../engine/types'
import { SessionScreen } from './Session'

describe('Session: three wrong in a row offers a few easy questions', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>
  let hard: VocabularyEntry
  let friends: VocabularyEntry[]
  const now = new Date()

  const knownState = (entry: VocabularyEntry): UserWordState => ({
    ...newWordState(entry, now),
    skills: { recognition: { due: now, stability: 30, difficulty: 4, elapsed_days: 0, scheduled_days: 5, learning_steps: 0, reps: 6, lapses: 0, state: 2, last_review: now } },
    stats: { reviews: 8, correct: 8, wrong: 0, hints: 0, totalResponseMs: 0, consecutiveWrong: 0 },
  })
  const items = (): PlanItem[] => Array.from({ length: 6 }, () => ({ entryId: hard.id, exerciseType: 'mc_meaning', kind: 'exercise', skill: 'recognition', reason: 'due' }) as PlanItem)

  beforeEach(async () => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    hard = createEntry({ word: 'la maison', meaning: 'ev', example: 'La *maison* est grande.', exampleTranslation: 'Ev büyük.' }, 'fr', now)
    friends = ['le chat:kedi', 'le chien:köpek', "l'arbre:ağaç"].map((w) => {
      const [word, meaning] = w.split(':')
      return createEntry({ word, meaning, example: `${word} est là.`, exampleTranslation: 'Orada.' }, 'fr', now)
    })
    await db.vocabulary.clear()
    await db.vocabulary.bulkPut([hard, ...friends])
  })
  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  const mount = async (states: UserWordState[]) => {
    await act(async () => {
      root.render(<SessionScreen db={db} scheduler={scheduler} mode="normal" options={{}} vocabulary={[hard, ...friends]} states={states} mistakes={[]} items={items()} seed={42} onFinish={vi.fn()} onQuit={vi.fn()} />)
    })
  }
  const answered = () => container.querySelector('.sheet') !== null
  const wait = async (until: () => boolean) => {
    for (let i = 0; i < 60 && !until(); i++) await act(async () => void (await new Promise((r) => setTimeout(r, 40))))
  }
  const missOnce = async () => {
    await wait(() => container.querySelectorAll('.option').length > 0)
    const options = [...container.querySelectorAll<HTMLButtonElement>('.option')]
    const wrong = options.find((o) => o.textContent?.replace(/^\d/, '') !== 'ev')!
    await act(async () => wrong.click())
    await wait(answered)
    const devam = () => [...container.querySelectorAll<HTMLButtonElement>('.sheet button')].find((b) => b.textContent?.startsWith('Devam'))
    // A confident wrong answer holds the button for a moment.
    await wait(() => !!devam() && !devam()!.disabled)
    const next = [...container.querySelectorAll<HTMLButtonElement>('.sheet button')].find((b) => b.textContent?.startsWith('Devam'))
    if (!next) throw new Error(`no Devam: ${[...container.querySelectorAll('.sheet button')].map((b) => b.textContent).join('|')} // ${container.textContent?.slice(0, 200)}`)
    await act(async () => next.click())
    await wait(() => !answered())
  }
  const offer = () => [...container.querySelectorAll('.break-note')].find((n) => n.textContent?.includes('Üst üste zorlandın'))

  it('after the third miss the offer shows, and taking it puts words the learner knows next', { timeout: 30_000 }, async () => {
    await mount(friends.map(knownState))
    await missOnce()
    await missOnce()
    expect(offer()).toBeUndefined()
    await missOnce()
    expect(offer()).toBeDefined()
    await act(async () => [...offer()!.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent === 'Kolay sorular ekle')!.click())
    expect(offer()).toBeUndefined()
    const shown = container.textContent ?? ''
    expect(friends.some((f) => shown.includes(f.lemma))).toBe(true)
  })

  it('can be put away, and is not offered again in the same session', { timeout: 30_000 }, async () => {
    await mount(friends.map(knownState))
    for (let i = 0; i < 3; i++) await missOnce()
    await act(async () => [...offer()!.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent === 'Gerek yok')!.click())
    expect(offer()).toBeUndefined()
    await missOnce()
    expect(offer()).toBeUndefined()
  })
})
