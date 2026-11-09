// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useSwipeAway } from './useSwipeAway'

function SwipeComponent({
  onAway,
  onHook,
}: {
  onAway: () => void
  onHook: (h: ReturnType<typeof useSwipeAway>) => void
}) {
  const hook = useSwipeAway(onAway)
  onHook(hook)
  return (
    <div data-testid="card" style={{ transform: `translateX(${hook.dx}px)` }} {...hook.handlers}>
      Card
    </div>
  )
}

describe('useSwipeAway', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>
  let hook: ReturnType<typeof useSwipeAway>
  const onAway = vi.fn()

  beforeEach(() => {
    onAway.mockClear()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  const mount = () => {
    act(() => {
      root.render(<SwipeComponent onAway={onAway} onHook={(h) => (hook = h)} />)
    })
  }

  const getCard = () => container.querySelector('[data-testid="card"]') as HTMLElement

  it('triggers onAway when swiped left past the threshold', () => {
    mount()
    const card = getCard()

    act(() => {
      card.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, clientX: 200, clientY: 100, pointerType: 'touch' })
      )
    })
    expect(hook.dx).toBe(0)

    act(() => {
      card.dispatchEvent(
        new PointerEvent('pointermove', { bubbles: true, clientX: 90, clientY: 102, pointerType: 'touch' })
      )
    })
    // mx = 90 - 200 = -110 px (past AWAY_AT = 96)
    expect(hook.dx).toBe(-110)

    act(() => {
      card.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }))
    })

    expect(onAway).toHaveBeenCalledTimes(1)
    expect(hook.dx).toBe(0) // reset
  })

  it('springs back when released before the threshold (short swipe)', () => {
    mount()
    const card = getCard()

    act(() => {
      card.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, clientX: 200, clientY: 100, pointerType: 'touch' })
      )
    })

    act(() => {
      card.dispatchEvent(
        new PointerEvent('pointermove', { bubbles: true, clientX: 150, clientY: 100, pointerType: 'touch' })
      )
    })
    // mx = -50 px (under threshold 96)
    expect(hook.dx).toBe(-50)

    act(() => {
      card.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }))
    })

    expect(onAway).not.toHaveBeenCalled()
    expect(hook.dx).toBe(0)
  })

  it('ignores mouse pointer events completely', () => {
    mount()
    const card = getCard()

    act(() => {
      card.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, clientX: 200, clientY: 100, pointerType: 'mouse' })
      )
    })

    act(() => {
      card.dispatchEvent(
        new PointerEvent('pointermove', { bubbles: true, clientX: 50, clientY: 100, pointerType: 'mouse' })
      )
    })

    expect(hook.dx).toBe(0)

    act(() => {
      card.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }))
    })

    expect(onAway).not.toHaveBeenCalled()
  })

  it('does not swipe on predominantly vertical move (scrolling)', () => {
    mount()
    const card = getCard()

    act(() => {
      card.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, clientX: 200, clientY: 100, pointerType: 'touch' })
      )
    })

    act(() => {
      // mx = -2, my = 30 -> locked to 'y'
      card.dispatchEvent(
        new PointerEvent('pointermove', { bubbles: true, clientX: 198, clientY: 130, pointerType: 'touch' })
      )
    })
    expect(hook.dx).toBe(0)

    act(() => {
      // Further horizontal movement while locked to 'y' is ignored
      card.dispatchEvent(
        new PointerEvent('pointermove', { bubbles: true, clientX: 50, clientY: 150, pointerType: 'touch' })
      )
    })
    expect(hook.dx).toBe(0)

    act(() => {
      card.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }))
    })
    expect(onAway).not.toHaveBeenCalled()
  })

  it('does not allow dragging to the right (positive dx)', () => {
    mount()
    const card = getCard()

    act(() => {
      card.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, clientX: 100, clientY: 100, pointerType: 'touch' })
      )
    })

    act(() => {
      card.dispatchEvent(
        new PointerEvent('pointermove', { bubbles: true, clientX: 150, clientY: 100, pointerType: 'touch' })
      )
    })
    // Math.min(0, 50) === 0
    expect(hook.dx).toBe(0)

    act(() => {
      card.dispatchEvent(new PointerEvent('pointerup', { bubbles: true }))
    })
    expect(onAway).not.toHaveBeenCalled()
  })

  it('resets position on pointercancel without triggering onAway', () => {
    mount()
    const card = getCard()

    act(() => {
      card.dispatchEvent(
        new PointerEvent('pointerdown', { bubbles: true, clientX: 200, clientY: 100, pointerType: 'touch' })
      )
    })

    act(() => {
      card.dispatchEvent(
        new PointerEvent('pointermove', { bubbles: true, clientX: 80, clientY: 100, pointerType: 'touch' })
      )
    })
    expect(hook.dx).toBe(-120)

    act(() => {
      card.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true }))
    })

    expect(hook.dx).toBe(0)
    expect(onAway).not.toHaveBeenCalled()
  })
})
