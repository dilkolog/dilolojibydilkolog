import { useRef, useState, type PointerEvent } from 'react'

/** How far a sheet must be pulled down (px) to let go of it. */
const CLOSE_AT = 72

/**
 * Pull a bottom sheet down by its head to close it: a touch drag follows the finger, and past a
 * short distance the sheet closes; letting go sooner springs it back. Mouse clicks do nothing
 * (the close button is there for them).
 */
export function useSheetSwipe(onClose: () => void) {
  const start = useRef<number | null>(null)
  const [dy, setDy] = useState(0)
  // The pull so far, kept apart from the state so a quick release sees the last move even before a redraw.
  const pulled = useRef(0)
  const reset = () => {
    start.current = null
    pulled.current = 0
    setDy(0)
  }
  const handlers = {
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      if (e.pointerType === 'mouse') return
      start.current = e.clientY
      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {
        // No capture (a synthetic event): the drag still follows the moves that reach the head.
      }
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      if (start.current === null) return
      pulled.current = Math.max(0, e.clientY - start.current)
      setDy(pulled.current)
    },
    onPointerUp: () => {
      const far = pulled.current > CLOSE_AT
      reset()
      if (far) onClose()
    },
    onPointerCancel: reset,
  }
  return { dy, handlers }
}
