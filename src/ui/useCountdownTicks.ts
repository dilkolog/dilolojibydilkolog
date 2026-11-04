import { useEffect, useRef } from 'react'
import { sfx } from './sounds'

/**
 * The clock's last three seconds as soft ticks (the last one a little firmer): heard without looking. Each whole second
 * ticks once, and only while the clock runs.
 */
export function useCountdownTicks(secondsLeft: number, running: boolean) {
  const said = useRef<number | null>(null)
  const whole = Math.ceil(secondsLeft)
  useEffect(() => {
    if (!running) {
      said.current = null
      return
    }
    if (whole >= 1 && whole <= 3 && said.current !== whole) {
      said.current = whole
      sfx.tick(whole === 1)
    }
  }, [whole, running])
}
