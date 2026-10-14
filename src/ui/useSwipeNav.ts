import { useEffect } from 'react'

/**
 * A quick sideways swipe as the step to the next or previous item (a phone's ← →): left is next,
 * right is previous. Only a clear, quick, mostly sideways move counts, so scrolling and taps never
 * turn the page.
 */
export function swipeDirection(dx: number, dy: number, ms: number): 'next' | 'prev' | null {
  if (ms > 700 || Math.abs(dx) < 70 || Math.abs(dy) > 50 || Math.abs(dx) < Math.abs(dy) * 2) return null
  return dx < 0 ? 'next' : 'prev'
}

/** Where a swipe should be left to the thing under the finger: fields, sliders and rows that scroll sideways. */
const OWN_SWIPE = 'input, textarea, select, [contenteditable="true"], [role="slider"], [data-no-swipe], .choice-row, .chip-list, table, .swipe-card'

export function useSwipeNav(onPrev?: () => void, onNext?: () => void) {
  useEffect(() => {
    if (!onPrev && !onNext) return
    let start: { x: number; y: number; t: number } | null = null
    const down = (e: TouchEvent) => {
      const t = e.target as Element | null
      if (e.touches.length !== 1 || t?.closest(OWN_SWIPE) || document.querySelector('[aria-modal="true"]')) {
        start = null
        return
      }
      start = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() }
    }
    const up = (e: TouchEvent) => {
      if (!start) return
      const p = e.changedTouches[0]
      const dir = swipeDirection(p.clientX - start.x, p.clientY - start.y, Date.now() - start.t)
      start = null
      if (dir === 'next') onNext?.()
      else if (dir === 'prev') onPrev?.()
    }
    window.addEventListener('touchstart', down, { passive: true })
    window.addEventListener('touchend', up, { passive: true })
    return () => {
      window.removeEventListener('touchstart', down)
      window.removeEventListener('touchend', up)
    }
  }, [onPrev, onNext])
}
