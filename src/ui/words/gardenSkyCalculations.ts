export type SkyPhase = 'dawn' | 'day' | 'dusk' | 'night'

/** The light outside, by the clock: dawn 5:30–8, day to 17, dusk to 20:30, then night. */
export function skyPhase(hour: number): SkyPhase {
  if (hour >= 5.5 && hour < 8) return 'dawn'
  if (hour >= 8 && hour < 17) return 'day'
  if (hour >= 17 && hour < 20.5) return 'dusk'
  return 'night'
}

export const PHASE_NAME: Record<SkyPhase, string> = { dawn: 'Sabah', day: 'Gündüz', dusk: 'Akşam', night: 'Gece' }

/** Where the sun (6:00–19:00) or the moon (19:00–6:00) is on its arc: 0 at the left horizon, 1 at the right. */
export function bodyPosition(hour: number): { body: 'sun' | 'moon'; t: number } {
  if (hour >= 6 && hour < 19) return { body: 'sun', t: (hour - 6) / 13 }
  return { body: 'moon', t: (((hour - 19 + 24) % 24) / 11) }
}

/** One butterfly for every few flowers, one bee for every ten growing plants (a firefly each, at night). */
export function visitors(flowers: number, growing: number): { butterflies: number; bees: number } {
  return { butterflies: flowers ? Math.min(5, Math.ceil(flowers / 4)) : 0, bees: growing ? Math.min(3, Math.ceil(growing / 10)) : 0 }
}
