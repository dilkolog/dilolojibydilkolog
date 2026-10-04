import { useEffect, useRef, useState } from 'react'

/**
 * A number that counts up (or down) from the value shown last time to the new one, so XP gained in
 * a session is seen arriving on the home screen. The last value is kept per tab under `key`.
 */
export function useCountUp(value: number, key: string, ms = 900): number {
  const storage = `kelime-koc:count:${key}`
  const [shown, setShown] = useState(() => {
    try {
      const last = Number(sessionStorage.getItem(storage))
      return Number.isFinite(last) && sessionStorage.getItem(storage) !== null ? last : value
    } catch {
      return value
    }
  })
  const from = useRef(shown)
  useEffect(() => {
    const save = () => {
      try {
        sessionStorage.setItem(storage, String(value))
      } catch {
        // Only for the animation.
      }
    }
    const start = from.current
    if (start === value || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setShown(value)
      from.current = value
      save()
      return
    }
    const t0 = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / ms)
      const eased = 1 - (1 - p) ** 3
      setShown(start + (value - start) * eased)
      if (p < 1) raf = requestAnimationFrame(tick)
      else {
        from.current = value
        save()
      }
    }
    // A short pause so the eye is on the screen when it starts.
    const delay = window.setTimeout(() => (raf = requestAnimationFrame(tick)), 250)
    return () => {
      clearTimeout(delay)
      cancelAnimationFrame(raf)
    }
  }, [value, ms, storage])
  return shown
}
