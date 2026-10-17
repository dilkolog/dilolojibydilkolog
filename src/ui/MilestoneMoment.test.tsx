// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Milestone } from '../engine/gamification'
import { MilestoneMoment } from './MilestoneMoment'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const sampleMilestone: Milestone = {
  id: 'word-10',
  emoji: '🌱',
  title: 'İlk 10 kelime',
  text: 'Kelime haznen büyüyor!',
}

describe('MilestoneMoment close button', () => {
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

  it('renders close button on milestone dialog and triggers onClose', () => {
    const onClose = vi.fn()

    act(() => {
      root.render(<MilestoneMoment milestone={sampleMilestone} onClose={onClose} />)
    })

    const closeBtn = el.querySelector('button.milestone-close') as HTMLButtonElement
    expect(closeBtn).not.toBeNull()
    expect(closeBtn.getAttribute('aria-label')).toBe('Kapat')

    act(() => closeBtn.click())
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
