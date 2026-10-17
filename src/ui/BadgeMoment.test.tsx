// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { achievements, emptyStats } from '../engine/gamification'
import { BadgeMoment } from './BadgeMoment'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('BadgeMoment close button', () => {
  let el: HTMLDivElement
  let root: Root

  beforeEach(() => {
    el = document.createElement('div')
    document.body.append(el)
    root = createRoot(el)
  })

  afterEach(() => {
    act(() => root.unmount())
    el.remove()
  })

  it('renders close button on single badge celebration and triggers onClose', () => {
    const onClose = vi.fn()
    const allBadges = achievements({ ...emptyStats, wordsIntroduced: 1 })
    const badge = allBadges.find((b) => b.unlocked)!

    act(() => {
      root.render(<BadgeMoment badges={[badge]} onClose={onClose} />)
    })

    const closeBtn = el.querySelector('button.milestone-close') as HTMLButtonElement
    expect(closeBtn).not.toBeNull()
    expect(closeBtn.getAttribute('aria-label')).toBe('Kapat')

    act(() => closeBtn.click())
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders close button on multi-badge celebration and triggers onClose', () => {
    const onClose = vi.fn()
    const allBadges = achievements({ ...emptyStats, wordsIntroduced: 50 })
    const unlocked = allBadges.filter((b) => b.unlocked).slice(0, 2)

    act(() => {
      root.render(<BadgeMoment badges={unlocked} onClose={onClose} />)
    })

    const closeBtn = el.querySelector('button.milestone-close') as HTMLButtonElement
    expect(closeBtn).not.toBeNull()
    expect(closeBtn.getAttribute('aria-label')).toBe('Kapat')

    act(() => closeBtn.click())
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
