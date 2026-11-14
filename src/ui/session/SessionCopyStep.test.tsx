// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db, scheduler } from '../../data/instance'
import { createEntry } from '../../data/wordInput'
import type { PlanItem } from '../../engine/dailyPlan'
import type { ReviewMode, UserWordState, VocabularyEntry } from '../../engine/types'
import { prefs } from '../prefs'
import { readSessionDraft } from '../../data/sessionDraft'
import type { Session } from '../../engine/session'
import { SessionScreen } from './Session'

const wait = () => act(async () => void (await new Promise((r) => setTimeout(r, 40))))

describe('Session: typing the right answer once after a typed miss', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>
  let entry: VocabularyEntry
  let state: UserWordState
  const plan = (): PlanItem[] => [
    { entryId: entry.id, exerciseType: 'typed_translation', kind: 'exercise', skill: 'recall', reason: 'due' },
    { entryId: entry.id, exerciseType: 'mc_meaning', kind: 'exercise', skill: 'recognition', reason: 'due' },
  ]

  beforeEach(async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('', { status: 503 })))
    prefs.copyAfterMiss = true
    prefs.typingShare = 'low'
    // No "sure" pause on Devam after a confident miss (covered below on its own).
    prefs.confidence = false
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    entry = createEntry({ word: 'la décision', meaning: 'karar' }, 'fr', new Date())
    const now = new Date()
    state = {
      entryId: entry.id, language: 'fr', introducedAt: new Date(now.getTime() - 10 * 86_400_000),
      skills: { recognition: { ...scheduler.newCard(now), reps: 2 }, recall: { ...scheduler.newCard(now), reps: 1 } },
      stats: { reviews: 3, correct: 3, wrong: 0, hints: 0, totalResponseMs: 9000, consecutiveWrong: 0 },
    }
    await db.vocabulary.clear()
    await db.wordStates.clear()
    await db.events.clear()
    await db.meta.clear()
    await db.vocabulary.put(entry)
    await db.wordStates.put(state)
  })
  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    prefs.copyAfterMiss = true
    prefs.typingShare = 'balanced'
    prefs.confidence = true
    vi.unstubAllGlobals()
  })

  const mount = async (mode: ReviewMode = 'normal', onFinish = vi.fn(), initialSession?: Session, items = plan(), states = [state]) => {
    await act(async () => {
      root.render(<SessionScreen db={db} scheduler={scheduler} mode={mode} initialSession={initialSession} options={{}} vocabulary={[entry]} states={states} mistakes={[]} items={items} seed={7} onFinish={onFinish} onQuit={vi.fn()} />)
    })
  }
  const type = async (input: HTMLInputElement, text: string) => {
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, text)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    await act(async () => input.closest('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })))
  }
  const answerWith = async (text: string) => {
    for (let i = 0; i < 50 && !container.querySelector('.answer-input:not([disabled])'); i++) await wait()
    await type(container.querySelector<HTMLInputElement>('.answer-input')!, text)
    for (let i = 0; i < 50 && !container.querySelector('.sheet'); i++) await wait()
  }
  const copyField = () => container.querySelector<HTMLInputElement>('#copy-answer')
  const devam = () => container.querySelector<HTMLButtonElement>('.sheet button.btn-lg')!

  it('offers the copy step after a typed miss, focused and labelled, and leaves the saved answer alone', async () => {
    await mount()
    await answerWith('xyz')
    const field = copyField()
    expect(field).not.toBeNull()
    expect(document.activeElement).toBe(field)
    expect(container.querySelector('label[for="copy-answer"]')?.textContent).toContain('Doğrusunu bir kez yaz')
    const events = await db.events.count()
    const saved = await db.wordStates.get(entry.id)
    const draft = await readSessionDraft(db, 'fr')
    const xp = container.querySelector('.session-xp')?.textContent
    await type(field!, 'la décision')
    // Announced inside the feedback sheet (a live region), and focus goes on to Devam.
    expect(container.querySelector('.sheet[role="status"] .copy-result')?.textContent).toContain('Doğru yazdın')
    await wait()
    expect(document.activeElement).toBe(devam())
    // Nothing scored: no event, the same FSRS cards and learning debt, the same draft, no XP.
    expect(await db.events.count()).toBe(events)
    expect(await db.wordStates.get(entry.id)).toEqual(saved)
    expect(await readSessionDraft(db, 'fr')).toEqual(draft)
    expect(container.querySelector('.session-xp')?.textContent).toBe(xp)
  })

  it('grades the copy by the question’s own rules (strict accents) and lets the learner go on after a failed copy', async () => {
    prefs.accentStrict = true
    await mount()
    await answerWith('xyz')
    await type(copyField()!, 'la decision')
    prefs.accentStrict = false
    expect(container.querySelector('.copy-result')?.textContent).toContain('Tam tutmadı')
    expect(copyField()!.disabled).toBe(true)
    await act(async () => devam().click())
    for (let i = 0; i < 20 && container.querySelector('.sheet'); i++) await wait()
    expect(container.querySelector('.sheet')).toBeNull()
    expect(container.querySelectorAll('.option').length).toBeGreaterThan(0)
  })

  it('is skipped by an empty Enter, without anything recorded twice', async () => {
    const finished = vi.fn()
    await mount('normal', finished)
    await answerWith('xyz')
    const events = await db.events.count()
    await type(copyField()!, '')
    for (let i = 0; i < 20 && container.querySelector('.sheet'); i++) await wait()
    expect(container.querySelector('.sheet')).toBeNull()
    expect(await db.events.count()).toBe(events)
  })

  it('a reload while it is open resumes after the answer, which is not graded again', async () => {
    await mount()
    await answerWith('xyz')
    expect(copyField()).not.toBeNull()
    const events = await db.events.count()
    const draft = await readSessionDraft(db, 'fr')
    // The answer and the next step were saved together: the draft already points past this question.
    expect(draft!.session.index).toBe(1)
    act(() => root.unmount())
    root = createRoot(container)
    await mount('normal', vi.fn(), draft!.session, draft!.session.items, await db.wordStates.toArray())
    expect(copyField()).toBeNull()
    expect(container.querySelector('.sheet')).toBeNull()
    expect(await db.events.count()).toBe(events)
  })

  it('after a confident miss, focus moves to Devam once its pause is over', async () => {
    prefs.confidence = true
    await mount()
    await answerWith('xyz')
    expect(document.activeElement).toBe(copyField())
    await type(copyField()!, 'la décision')
    expect(devam().disabled).toBe(true)
    for (let i = 0; i < 40 && devam().disabled; i++) await wait()
    expect(document.activeElement).toBe(devam())
  })

  it('is not offered when switched off, in free practice, after a right answer, or for a choice', async () => {
    prefs.copyAfterMiss = false
    await mount()
    await answerWith('xyz')
    expect(container.querySelector('.sheet')).not.toBeNull()
    expect(copyField()).toBeNull()
    act(() => root.unmount())

    prefs.copyAfterMiss = true
    root = createRoot(container)
    await mount('practice')
    await answerWith('xyz')
    expect(copyField()).toBeNull()
    act(() => root.unmount())

    root = createRoot(container)
    await mount()
    await answerWith('la décision')
    expect(container.querySelector('.sheet')).not.toBeNull()
    expect(copyField()).toBeNull()
    act(() => root.unmount())

    root = createRoot(container)
    await mount('normal', vi.fn(), undefined, plan().slice(1))
    for (let i = 0; i < 50 && !container.querySelector('.option:not([disabled])'); i++) await wait()
    const wrong = [...container.querySelectorAll<HTMLButtonElement>('.option')].find((o) => !o.textContent?.includes('karar'))!
    await act(async () => wrong.click())
    for (let i = 0; i < 50 && !container.querySelector('.sheet'); i++) await wait()
    expect(container.querySelector('.sheet')).not.toBeNull()
    expect(copyField()).toBeNull()
  })
})
