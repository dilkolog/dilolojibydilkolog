// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { WeekSummary } from '../engine/weekly'
import { AiContext } from './aiContext'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const asked = vi.fn(async () => 'Dört gün çalıştın. Cinsiyet hataları öne çıkıyor: bu hafta -tion kelimelerine bak.')
vi.mock('../ai', () => ({ weekNote: (...a: unknown[]) => asked(...(a as [])), AiError: class extends Error {} }))
const { WeeklyNudge } = await import('./WeeklyNudge')

const SUNDAY = new Date('2026-10-11T18:00:00')
const week: WeekSummary = { days: 4, answers: 80, right: 0.8, newWords: 6, texts: 1, lastAnswers: 60, errors: { gender: 5 } }

describe('the AI coach on the week card', () => {
  let el: HTMLDivElement
  let root: Root
  beforeEach(() => {
    localStorage.clear()
    asked.mockClear()
    el = document.createElement('div')
    document.body.append(el)
    root = createRoot(el)
  })
  afterEach(() => {
    act(() => root.unmount())
    el.remove()
  })
  const show = (apiKey: string | null, summary = week) =>
    act(() =>
      root.render(
        <AiContext.Provider value={{ apiKey, setApiKey: async () => {} }}>
          <WeeklyNudge language="fr" line="x" summary={summary} lemmaOf={() => undefined} now={SUNDAY} onOpen={() => {}} onWord={() => {}} />
        </AiContext.Provider>,
      ),
    )
  const coach = () => [...el.querySelectorAll('button')].find((b) => b.textContent?.includes('YZ koçundan yorum'))

  it('offers nothing without a key or in a thin week', () => {
    show(null)
    expect(coach()).toBeUndefined()
    show('k', { ...week, answers: 5 })
    expect(coach()).toBeUndefined()
  })

  it('asks on a tap, shows the remark, and keeps it for the week without asking again', async () => {
    show('k')
    await act(async () => coach()!.click())
    expect(asked).toHaveBeenCalledTimes(1)
    expect(el.querySelector('.week-note')?.textContent).toContain('Cinsiyet hataları')
    act(() => root.unmount())
    root = createRoot(el)
    show('k')
    expect(el.querySelector('.week-note')?.textContent).toContain('Cinsiyet hataları')
    expect(coach()).toBeUndefined()
    expect(asked).toHaveBeenCalledTimes(1)
  })
})
