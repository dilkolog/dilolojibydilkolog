import { useEffect, useRef } from 'react'

/** How long a quiet reader still counts as reading: a page is read without touching the screen for a while. */
const QUIET_MS = 60_000
/** Seconds gathered before they are handed over; the rest goes on pausing, hiding or leaving. */
const FLUSH_EVERY = 20

/**
 * Counts the seconds something is really going on (reading, a recording playing) and hands them to
 * `record` in small batches. A hidden tab does not count; with `needsActivity` a minute without a
 * touch, key or scroll stops the count until the next one (an open page left alone is not reading).
 */
export function useStudyClock({ active, needsActivity, record }: { active: boolean; needsActivity: boolean; record?: (seconds: number) => void }) {
  const recordRef = useRef(record)
  useEffect(() => {
    recordRef.current = record
  })
  const pending = useRef(0)
  const lastActive = useRef(Date.now())
  const flush = () => {
    const seconds = pending.current
    pending.current = 0
    if (seconds > 0) recordRef.current?.(seconds)
  }

  useEffect(() => {
    if (!active || !needsActivity) return
    const touch = () => {
      lastActive.current = Date.now()
    }
    touch()
    const events = ['pointerdown', 'keydown', 'scroll', 'touchstart', 'wheel'] as const
    for (const e of events) window.addEventListener(e, touch, { passive: true, capture: true })
    return () => {
      for (const e of events) window.removeEventListener(e, touch, { capture: true })
    }
  }, [active, needsActivity])

  useEffect(() => {
    if (!active) {
      flush()
      return
    }
    const timer = setInterval(() => {
      if (document.visibilityState !== 'visible') return
      if (needsActivity && Date.now() - lastActive.current > QUIET_MS) return
      pending.current++
      if (pending.current >= FLUSH_EVERY) flush()
    }, 1000)
    const onHide = () => {
      if (document.visibilityState !== 'visible') flush()
    }
    document.addEventListener('visibilitychange', onHide)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onHide)
      flush()
    }
    // flush only reads refs
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, needsActivity])
}
