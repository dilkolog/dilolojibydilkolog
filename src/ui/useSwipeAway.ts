import { useRef, useState, type PointerEvent } from 'react'

/** How far a card must be dragged sideways (px) to be let go of. */
const AWAY_AT = 96

/**
 * Drag a card to the left to put it away: a touch (or pen) drag follows the finger, past a
 * short distance the card goes, letting go sooner springs it back. A mostly vertical move is the
 * page scrolling and is left alone; the mouse does nothing (a button is there for it).
 */
export function useSwipeAway(onAway: () => void) {
  const start = useRef<{ x: number; y: number } | null>(null)
  const pulled = useRef(0)
  const locked = useRef<'x' | 'y' | null>(null)
  const [dx, setDx] = useState(0)
  const reset = () => {
    start.current = null
    pulled.current = 0
    locked.current = null
    setDx(0)
  }
  const handlers = {
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      if (e.pointerType === 'mouse') return
      start.current = { x: e.clientX, y: e.clientY }
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      if (!start.current) return
      const mx = e.clientX - start.current.x
      const my = e.clientY - start.current.y
      if (!locked.current && Math.hypot(mx, my) > 8) locked.current = Math.abs(mx) > Math.abs(my) ? 'x' : 'y'
      if (locked.current !== 'x') return
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {
        // No capture (a synthetic event): the drag still follows the moves that reach the card.
      }
      pulled.current = Math.min(0, mx)
      setDx(pulled.current)
    },
    onPointerUp: () => {
      const far = pulled.current < -AWAY_AT
      reset()
      if (far) onAway()
    },
    onPointerCancel: reset,
  }
  return { dx, handlers }
}
