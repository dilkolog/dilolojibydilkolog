import { useEffect, useState } from 'react'
import { skyPhase, type SkyPhase } from './gardenSkyCalculations'

/** The part of the day the whole app is lit for (the same hours as the garden's sky). */
export function dayPart(now: Date): SkyPhase {
  return skyPhase(now.getHours() + now.getMinutes() / 60)
}

/** What the greeting says, by the clock. */
export function greetingFor(now: Date): string {
  const h = now.getHours()
  if (h >= 5 && h < 12) return 'Günaydın'
  if (h >= 12 && h < 18) return 'İyi günler'
  if (h >= 18 && h < 23) return 'İyi akşamlar'
  return 'İyi geceler'
}

/** Keeps the root's data-daypart in step with the clock, checking every few minutes. */
export function useDayPart(): SkyPhase {
  const [part, setPart] = useState(() => dayPart(new Date()))
  useEffect(() => {
    const tick = () => setPart(dayPart(new Date()))
    const id = setInterval(tick, 5 * 60_000)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [])
  useEffect(() => {
    document.documentElement.dataset.daypart = part
  }, [part])
  return part
}
