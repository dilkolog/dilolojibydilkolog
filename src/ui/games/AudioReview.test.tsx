// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../speech', () => ({
  playWordAsync: async () => {},
  speakAsync: async () => {},
  speakTurkishAsync: async () => {},
  preloadRecording: async () => {},
  stopSpeaking: () => {},
  speechPrefs: { rate: 0.9 },
  canSpeak: () => true,
}))

const { AudioReview } = await import('./AudioReview')
const { db, scheduler } = await import('../../data/instance')
const { newWordState, processAttempt } = await import('../../engine/review')
const { CATALOG, decide, decision, effect } = await import('../../engine/__tests__/fixtures')

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const NOW = new Date('2026-10-10T09:00:00')
const learned = (e: typeof decision) =>
  [0, 15].reduce((s, m) => processAttempt(s, { exerciseType: 'mc_meaning', verdict: 'correct', responseMs: 3000, hintsUsed: 0, maxHints: 0, at: new Date(NOW.getTime() + m * 60_000) }, [], scheduler, () => 'x').state, newWordState(e, NOW))

describe('AudioReview (walk mode)', () => {
  let el: HTMLDivElement
  let root: Root
  beforeEach(async () => {
    await db.vocabulary.clear()
    await db.vocabulary.bulkPut([decision, decide, effect])
    el = document.createElement('div')
    document.body.append(el)
    root = createRoot(el)
    await act(async () =>
      root.render(<AudioReview language="en" vocabulary={CATALOG.filter((e) => e.language === 'en')} states={[learned(decision), learned(decide), learned(effect)]} mistakes={[]} onChanged={() => {}} onExit={() => {}} />),
    )
  })
  afterEach(() => {
    act(() => root.unmount())
    el.remove()
  })
  const button = (text: string) => [...el.querySelectorAll('button')].find((b) => b.textContent?.includes(text))!

  it('goes back and forth over the words, "Önceki" off at the first', async () => {
    await act(async () => button('Karışık').click())
    expect(button('Önceki').disabled).toBe(true)
    await act(async () => button('Sonraki').click())
    expect(el.textContent).toContain('2 / ')
    expect(button('Önceki').disabled).toBe(false)
    await act(async () => button('Önceki').click())
    expect(el.textContent).toContain('1 / ')
  })

  it('has a loop for a long walk, and marks the word as hard in one tap', async () => {
    await act(async () => button('Karışık').click())
    const loop = button('Bitince baştan')
    expect(loop.getAttribute('aria-pressed')).toBe('false')
    await act(async () => loop.click())
    expect(loop.getAttribute('aria-pressed')).toBe('true')
    const hard = el.querySelector<HTMLButtonElement>('.difficult-btn')!
    expect(hard.getAttribute('aria-pressed')).toBe('false')
    await act(async () => {
      hard.click()
      await new Promise((r) => setTimeout(r, 50))
    })
    expect(el.querySelector('.difficult-btn')!.getAttribute('aria-pressed')).toBe('true')
    expect((await db.vocabulary.toArray()).some((v) => v.difficult)).toBe(true)
  })
})
