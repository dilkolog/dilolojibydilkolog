// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TourItem } from '../../engine/labTour'
import { setToastListener, type Toast } from '../toastFeed'
import { dayNumber } from './labShared'
import { TourCard } from './LabTour'

describe('TourCard', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>
  const onStart = vi.fn()
  let lastToast: Toast | null = null

  const sampleItems: TourItem[] = [
    { verb: 'parler', tense: 'present', person: 0, kind: 'choose', reason: 'due' },
    { verb: 'avoir', tense: 'present', person: 1, kind: 'choose', reason: 'weak' },
    { verb: 'être', tense: 'present', person: 2, kind: 'choose', reason: 'new' },
  ]

  beforeEach(() => {
    localStorage.clear()
    onStart.mockClear()
    lastToast = null
    setToastListener((t) => {
      lastToast = t
    })
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    setToastListener(null)
    act(() => root.unmount())
    container.remove()
  })

  const mount = (items: readonly TourItem[] = sampleItems) => {
    act(() => {
      root.render(<TourCard language="fr" items={items} onStart={onStart} />)
    })
  }

  it('renders tour card with questions, estimated time, and verbs', () => {
    mount()
    expect(container.querySelector('.lab-tour-card')).not.toBeNull()
    expect(container.textContent).toContain('Bugünün fiil turu')
    expect(container.textContent).toContain('3 soru')
    expect(container.textContent).toContain('parler, avoir, être')
    expect(container.textContent).toContain('1 tekrar, 1 zayıf nokta, günün fiili')
  })

  it('calls onStart when start button is clicked', () => {
    mount()
    const startBtn = container.querySelector('.lab-tour-actions .btn') as HTMLButtonElement
    expect(startBtn).not.toBeNull()
    expect(startBtn.textContent).toContain('Başla')

    act(() => {
      startBtn.click()
    })
    expect(onStart).toHaveBeenCalledTimes(1)
  })

  it('hides card when close button is clicked and stores today in localStorage', () => {
    mount()
    const closeBtn = container.querySelector('button[aria-label="Bugünlük gizle"]') as HTMLButtonElement
    expect(closeBtn).not.toBeNull()

    act(() => {
      closeBtn.click()
    })

    // Card should disappear
    expect(container.querySelector('.lab-tour-card')).toBeNull()

    // localStorage should have current day
    const today = dayNumber(new Date())
    expect(localStorage.getItem('kelime-koc:lab-tour-hidden:fr')).toBe(String(today))

    // Toast with undo option should be shown
    expect(lastToast).not.toBeNull()
    expect(lastToast?.text).toContain('Bugünün fiil turu gizlendi')
    expect(lastToast?.action?.label).toBe('Geri al')
  })

  it('restores card when "Geri al" (undo) is clicked in the toast', () => {
    mount()
    const closeBtn = container.querySelector('button[aria-label="Bugünlük gizle"]') as HTMLButtonElement
    act(() => {
      closeBtn.click()
    })
    expect(container.querySelector('.lab-tour-card')).toBeNull()

    // Execute undo
    act(() => {
      lastToast?.action?.run()
    })

    // Card is back and localStorage item removed
    expect(container.querySelector('.lab-tour-card')).not.toBeNull()
    expect(localStorage.getItem('kelime-koc:lab-tour-hidden:fr')).toBeNull()
  })

  it('remembers hidden state on reload for the same day', () => {
    const today = dayNumber(new Date())
    localStorage.setItem('kelime-koc:lab-tour-hidden:fr', String(today))

    mount()
    // Should not render
    expect(container.querySelector('.lab-tour-card')).toBeNull()
  })

  it('reappears the next day even if hidden on the previous day', () => {
    const yesterday = dayNumber(new Date()) - 1
    localStorage.setItem('kelime-koc:lab-tour-hidden:fr', String(yesterday))

    mount()
    // Yesterday's hidden flag should not hide today's card
    expect(container.querySelector('.lab-tour-card')).not.toBeNull()
    expect(container.textContent).toContain('Bugünün fiil turu')
  })

  it('shows "Bugünkü fiil turun bitti" when already done today', () => {
    const today = dayNumber(new Date())
    localStorage.setItem('kelime-koc:lab-tour:fr', String(today))

    mount()
    expect(container.querySelector('.lab-tour-card.is-done')).not.toBeNull()
    expect(container.textContent).toContain('Bugünkü fiil turun bitti')
    expect(container.textContent).toContain('Bir tur daha')
  })
})
