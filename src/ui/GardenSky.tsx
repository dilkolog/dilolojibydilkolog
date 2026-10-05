import { type CSSProperties } from 'react'

export type SkyPhase = 'dawn' | 'day' | 'dusk' | 'night'

/** The light outside, by the clock: dawn 5:30–8, day to 17, dusk to 20:30, then night. */
export function skyPhase(hour: number): SkyPhase {
  if (hour >= 5.5 && hour < 8) return 'dawn'
  if (hour >= 8 && hour < 17) return 'day'
  if (hour >= 17 && hour < 20.5) return 'dusk'
  return 'night'
}

const PHASE_NAME: Record<SkyPhase, string> = { dawn: 'Sabah', day: 'Gündüz', dusk: 'Akşam', night: 'Gece' }

/** Where the sun (6:00–19:00) or the moon (19:00–6:00) is on its arc: 0 at the left horizon, 1 at the right. */
export function bodyPosition(hour: number): { body: 'sun' | 'moon'; t: number } {
  if (hour >= 6 && hour < 19) return { body: 'sun', t: (hour - 6) / 13 }
  return { body: 'moon', t: (((hour - 19 + 24) % 24) / 11) }
}

/** One butterfly for every few flowers, one bee for every ten growing plants (a firefly each, at night). */
export function visitors(flowers: number, growing: number): { butterflies: number; bees: number } {
  return { butterflies: flowers ? Math.min(5, Math.ceil(flowers / 4)) : 0, bees: growing ? Math.min(3, Math.ceil(growing / 10)) : 0 }
}

/**
 * A strip of sky above the garden: the sun or moon on its arc, the light of the hour, and the
 * visitors the garden has earned: butterflies for flowers, bees for growing plants, fireflies
 * instead of both after dark. Decorative; the title says what it shows.
 */
export function GardenSky({ now, flowers, growing }: { now: Date; flowers: number; growing: number }) {
  const hour = now.getHours() + now.getMinutes() / 60
  const phase = skyPhase(hour)
  const { body, t } = bodyPosition(hour)
  const { butterflies, bees } = visitors(flowers, growing)
  const night = phase === 'night'
  const arc = 4 * t * (1 - t)   // 0 at the horizon, 1 at the top
  const guests = night ? butterflies + bees : butterflies
  const title = `${PHASE_NAME[phase]}${butterflies + bees ? `: bahçede ${night ? `${butterflies + bees} ateş böceği` : [butterflies && `${butterflies} kelebek`, bees && `${bees} arı`].filter(Boolean).join(', ')}` : ''}`
  return (
    <div className={`garden-sky is-${phase}`} role="img" aria-label={title} title={title}>
      <span className={`sky-body is-${body}`} style={{ left: `${6 + t * 88}%`, top: `${68 - arc * 52}%` }} />
      {night && [12, 30, 47, 66, 83].map((x, i) => <i key={x} className="sky-star" style={{ left: `${x}%`, top: `${14 + ((i * 23) % 40)}%`, '--i': i } as CSSProperties} />)}
      <svg className="sky-hills" viewBox="0 0 100 20" preserveAspectRatio="none" aria-hidden>
        <path d="M0 20 V12 Q12 5 26 11 T52 9 T78 12 T100 8 V20Z" />
      </svg>
      {Array.from({ length: guests }, (_, i) => (
        <span key={`g${i}`} className={night ? 'sky-firefly' : 'sky-butterfly'} style={{ '--i': i, '--y': `${24 + ((i * 29) % 36)}%` } as CSSProperties}>
          {!night && (
            <svg viewBox="0 0 16 12" width="20" height="15" aria-hidden>
              <ellipse className="wing" cx="5" cy="5" rx="4.2" ry="4.6" />
              <ellipse className="wing wing-r" cx="11" cy="5" rx="4.2" ry="4.6" />
              <rect x="7.4" y="2" width="1.2" height="8" rx="0.6" className="body" />
            </svg>
          )}
        </span>
      ))}
      {!night &&
        Array.from({ length: bees }, (_, i) => (
          <span key={`b${i}`} className="sky-bee" style={{ '--i': i } as CSSProperties} />
        ))}
    </div>
  )
}
