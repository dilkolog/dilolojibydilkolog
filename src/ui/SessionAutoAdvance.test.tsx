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
import { readSessionDraft } from '../data/sessionDraft'
import type { Session } from '../engine/session'
import { SessionScreen } from './Session'

describe('Session: right answers go on by themselves when asked to', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>
  let entry: VocabularyEntry
  let originalTypingShare: typeof prefs.typingShare
  const items = (): PlanItem[] => [
    { entryId: entry.id, exerciseType: 'mc_meaning', kind: 'exercise', skill: 'recognition', reason: 'due' },
    { entryId: entry.id, exerciseType: 'mc_meaning', kind: 'exercise', skill: 'recognition', reason: 'due' },
  ]

  beforeEach(async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 503 })))
    originalTypingShare = prefs.typingShare
    prefs.typingShare = 'low'
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
    prefs.typingShare = originalTypingShare
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  const mount = async (onFinish = vi.fn(), plan = items(), states: UserWordState[] = [], initialSession?: Session) => {
    await act(async () => {
      root.render(
        <SessionScreen db={db} scheduler={scheduler} mode="normal" initialSession={initialSession} options={{}} vocabulary={[entry]} states={states} mistakes={[]} items={plan} seed={42} onFinish={onFinish} onQuit={vi.fn()} />,
      )
    })
  }
  const answered = () => container.querySelector('.sheet') !== null
  const choose = async (right: boolean) => {
    for (let i = 0; i < 50 && !container.querySelector('.option:not([disabled])'); i++) await act(async () => void (await new Promise((r) => setTimeout(r, 40))))
    const options = [...container.querySelectorAll<HTMLButtonElement>('.option')]
    // The label starts with the option's number.
    const pick = options.find((o) => o.textContent?.replace(/^\d/, '') === 'ev') ?? options[0]
    const other = options.find((o) => o !== pick)!
    await act(async () => {
      ;(right ? pick : other).click()
    })
    // The answer is saved before its sheet shows: polled, not a fixed wait (a busy machine is slower).
    for (let i = 0; i < 50 && !answered(); i++) await act(async () => void (await new Promise((r) => setTimeout(r, 40))))
  }

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

  it('requires two successful recalls after a miss in the real screen', async () => {
    entry = { ...entry, senses: entry.senses.map((s) => ({ ...s, examples: [] })) }
    const finished = vi.fn()
    await mount(finished)
    const proceed = async () => {
      for (let i = 0; i < 75 && !container.querySelector('.sheet button.btn-lg:not([disabled])'); i++) await act(async () => void (await new Promise((r) => setTimeout(r, 40))))
      await act(async () => container.querySelector<HTMLButtonElement>('.sheet button.btn-lg:not([disabled])')!.click())
    }
    await choose(false)
    await proceed()
    await choose(true)
    await proceed()
    expect(finished).not.toHaveBeenCalled()
    await choose(true)
    await proceed()
    expect(finished).toHaveBeenCalledWith(expect.objectContaining({ answered: 3, correct: 2, struggling: [entry.id] }))
  })

  it('tests a recently learned word without revealing the answer on a refresher card', async () => {
    const now = new Date()
    const card = scheduler.newCard(now)
    const state: UserWordState = {
      entryId: entry.id, language: entry.language, introducedAt: now,
      skills: { recognition: { ...card, reps: 1 } },
      stats: { reviews: 1, correct: 1, wrong: 0, hints: 0, totalResponseMs: 3000, consecutiveWrong: 0 },
    }
    await mount(vi.fn(), items(), [state])
    expect(container.textContent).not.toContain('Önce bir bak')
    expect(container.querySelectorAll('.option').length).toBeGreaterThan(0)
  })

  it('moves fast independent recognition to written recall and creates its FSRS card', async () => {
    const finished = vi.fn()
    const plan: PlanItem[] = [
      { entryId: entry.id, kind: 'introduce', reason: 'new', skill: 'recognition' },
      { entryId: entry.id, kind: 'exercise', reason: 'new', skill: 'recognition', exerciseType: 'mc_meaning' },
    ]
    await mount(finished, plan)
    expect(container.querySelector('.intro-card')).not.toBeNull()
    expect(container.textContent).toContain('Öğrenme grubu 1/1')
    await act(async () => [...container.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.includes('Öğrendim, devam'))!.click())
    const proceed = async () => {
      for (let i = 0; i < 75 && !container.querySelector('.sheet button.btn-lg:not([disabled])'); i++) await act(async () => void (await new Promise((r) => setTimeout(r, 40))))
      await act(async () => container.querySelector<HTMLButtonElement>('.sheet button.btn-lg:not([disabled])')!.click())
    }
    await choose(true)
    await proceed()
    expect(container.textContent).toContain('Yazarak hatırla')
    const input = container.querySelector<HTMLInputElement>('.answer-input')!
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, 'la maison')
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () => input.closest('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
    for (let i = 0; i < 50 && !answered(); i++) await act(async () => void (await new Promise((r) => setTimeout(r, 40))))
    expect(answered()).toBe(true)
    await proceed()
    expect(finished).toHaveBeenCalledWith(expect.objectContaining({ answered: 2, correct: 2 }))
    const saved = await db.wordStates.get(entry.id)
    expect(saved?.skills.recognition?.reps).toBe(1)
    expect(saved?.skills.recall?.reps).toBe(1)
  })

  it('reloads after saving an answer without asking or recording that answer again', async () => {
    const plan: PlanItem[] = [
      { entryId: entry.id, kind: 'introduce', reason: 'new', skill: 'recognition' },
      { entryId: entry.id, kind: 'exercise', reason: 'new', skill: 'recognition', exerciseType: 'mc_meaning' },
    ]
    await mount(vi.fn(), plan)
    await act(async () => [...container.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.includes('Öğrendim, devam'))!.click())
    const before = await db.events.count()
    await choose(true)
    const draft = await readSessionDraft(db, 'fr')
    expect(draft?.session.index).toBe(2)
    expect(draft?.session.items[draft.session.index].exerciseType).toBe('typed_translation')
    expect(await db.events.count()).toBe(before + 1)
    act(() => root.unmount())
    root = createRoot(container)
    await mount(vi.fn(), draft!.session.items, await db.wordStates.toArray(), draft!.session)
    expect(container.querySelector('.answer-input')).not.toBeNull()
    expect(container.querySelector('.intro-card')).toBeNull()
    expect(await db.events.count()).toBe(before + 1)
    expect((await readSessionDraft(db, 'fr'))?.session.index).toBe(2)
  })

  it('is off by default', async () => {
    await mount()
    await choose(true)
    await act(async () => void (await new Promise((r) => setTimeout(r, 1200))))
    expect(answered()).toBe(true)
  })
})
