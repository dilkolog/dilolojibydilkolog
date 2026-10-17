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

  it('renders level milestone with kicker, aura, and highlighted rank title', () => {
    const levelMilestone: Milestone = {
      id: 'level-3',
      emoji: '⭐',
      title: 'Seviye 3!',
      text: 'Yeni unvanın: Meraklı. Çalıştıkça XP birikiyor; bir seviye daha atladın!',
      level: { from: 2, to: 3 },
    }

    act(() => {
      root.render(<MilestoneMoment milestone={levelMilestone} onClose={() => {}} />)
    })

    expect(el.querySelector('.milestone-kicker')?.textContent).toContain('Yeni Seviye')
    expect(el.querySelector('.milestone-aura')).not.toBeNull()
    expect(el.querySelector('.milestone-rank-title')?.textContent).toBe('Meraklı')
    expect(el.querySelector('.milestone-text')?.textContent).toContain('Çalıştıkça XP birikiyor')
  })
})
