// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { WeekSummary } from '../engine/weekly'
import { weekChange } from '../engine/weekly'
import { WeeklyNudge } from './WeeklyNudge'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const SUNDAY = new Date('2026-10-11T18:00:00')
const MONDAY = new Date('2026-10-12T09:00:00')
const WEDNESDAY = new Date('2026-10-14T18:00:00')
const summary: WeekSummary = { days: 5, answers: 120, right: 0.86, newWords: 9, texts: 2, lastAnswers: 100, missed: [{ entryId: 'e1', wrong: 3 }, { entryId: 'gone', wrong: 2 }] }

describe('WeeklyNudge', () => {
  let el: HTMLDivElement
  let root: Root
  beforeEach(() => {
    localStorage.clear()
    el = document.createElement('div')
    document.body.append(el)
    root = createRoot(el)
  })
  afterEach(() => {
    act(() => root.unmount())
    el.remove()
  })
  const show = (now: Date, onWord = vi.fn(), onOpen = vi.fn()) =>
    act(() => root.render(<WeeklyNudge line="x" summary={summary} lemmaOf={(id) => (id === 'e1' ? 'manger' : undefined)} now={now} onOpen={onOpen} onWord={onWord} />))

  it('shows the figures, the change and the missed words that still exist, on Sunday', () => {
    const onWord = vi.fn()
    show(SUNDAY, onWord)
    expect(el.textContent).toContain('5/7')
    expect(el.textContent).toContain('%86')
    expect(el.textContent).toContain('%20 daha fazla')
    const chips = [...el.querySelectorAll<HTMLButtonElement>('.chip')]
    expect(chips.map((c) => c.textContent)).toEqual(['manger · 3×'])
    act(() => chips[0].click())
    expect(onWord).toHaveBeenCalledWith('e1')
  })

  it('stays away in the middle of the week and can be dismissed for the week', () => {
    show(WEDNESDAY)
    expect(el.querySelector('.week-card')).toBeNull()
    show(SUNDAY)
    act(() => el.querySelector<HTMLButtonElement>('[aria-label="Bu hafta gösterme"]')!.click())
    expect(el.querySelector('.week-card')).toBeNull()
  })

  it('stays hidden on the Monday after it was dismissed on the Sunday', () => {
    show(SUNDAY)
    act(() => el.querySelector<HTMLButtonElement>('[aria-label="Bu hafta gösterme"]')!.click())
    show(MONDAY)
    expect(el.querySelector('.week-card')).toBeNull()
  })

  it('compares with the week before', () => {
    expect(weekChange(0, 10)).toBe('')
    expect(weekChange(10, 0)).toContain('başlangıç')
    expect(weekChange(10, 10)).toContain('aynı')
    expect(weekChange(50, 100)).toBe("Geçen haftanın %50'i kadar cevap verdin.")
  })
})
