// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SAMPLE_WORDS } from '../../data/seed'
import { RefreshCard } from './RefreshCard'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('RefreshCard', () => {
  let el: HTMLDivElement
  let root: Root
  const entry = SAMPLE_WORDS.fr[0]
  beforeEach(() => {
    vi.useFakeTimers()
    el = document.createElement('div')
    document.body.append(el)
    root = createRoot(el)
  })
  afterEach(() => {
    act(() => root.unmount())
    el.remove()
    vi.useRealTimers()
  })
  let shown = 0
  // A new key per card, as the session gives one.
  const show = (onRemember = vi.fn(), onStruggle = vi.fn()) => {
    act(() => root.render(<RefreshCard key={shown++} entry={entry} onRemember={onRemember} onStruggle={onStruggle} />))
    return { onRemember, onStruggle }
  }
  const press = (key: string) => act(() => void window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })))

  it('shows the word with its meaning and an example, ahead of the question', () => {
    show()
    expect(el.textContent).toContain(entry.senses[0].gloss)
    expect(el.textContent).toContain('Önce bir bak')
  })

  it('the buttons decide: "Hatırlıyorum" goes on, "Zorlanıyorum" asks for one more question later', () => {
    const a = show()
    act(() => [...el.querySelectorAll('button')].find((b) => b.textContent?.includes('Hatırlıyorum'))!.click())
    act(() => void vi.advanceTimersByTime(300))
    expect(a.onRemember).toHaveBeenCalledTimes(1)
    expect(a.onStruggle).not.toHaveBeenCalled()

    const b = show()
    act(() => [...el.querySelectorAll('button')].find((x) => x.textContent?.includes('Zorlanıyorum'))!.click())
    act(() => void vi.advanceTimersByTime(300))
    expect(b.onStruggle).toHaveBeenCalledTimes(1)
  })

  it('the arrow keys decide too, and only once', () => {
    const a = show()
    press('ArrowRight')
    press('ArrowRight')
    press('ArrowLeft')
    act(() => void vi.advanceTimersByTime(300))
    expect(a.onRemember).toHaveBeenCalledTimes(1)
    expect(a.onStruggle).not.toHaveBeenCalled()
  })
})
