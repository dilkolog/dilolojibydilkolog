import { type CSSProperties } from 'react'
import { bodyPosition, PHASE_NAME, skyPhase, visitors } from './gardenSkyCalculations'

const NIGHT_STARS: { x: number; y: number; s: number; d: number; sparkle?: boolean }[] = [
  { x: 8, y: 18, s: 2.2, d: 0, sparkle: true },
  { x: 15, y: 34, s: 1.5, d: 1.3 },
  { x: 22, y: 12, s: 2, d: 0.7 },
  { x: 28, y: 26, s: 1.2, d: 2.1 },
  { x: 35, y: 16, s: 2.4, d: 1.6, sparkle: true },
  { x: 44, y: 28, s: 1.4, d: 0.4 },
  { x: 52, y: 10, s: 2, d: 1.9 },
  { x: 59, y: 22, s: 1.3, d: 2.7 },
  { x: 67, y: 14, s: 2.5, d: 0.9, sparkle: true },
  { x: 74, y: 32, s: 1.6, d: 1.4 },
  { x: 82, y: 13, s: 2.2, d: 0.3 },
  { x: 88, y: 25, s: 1.3, d: 2.3 },
  { x: 94, y: 17, s: 2, d: 1.0, sparkle: true },
  { x: 18, y: 46, s: 1.2, d: 1.7 },
  { x: 40, y: 42, s: 1.4, d: 0.5 },
  { x: 64, y: 44, s: 1.3, d: 2.0 },
  { x: 85, y: 39, s: 1.5, d: 1.2 },
]

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
  const fireflies = night ? Math.max(3, butterflies + bees) : 0
  const guests = night ? fireflies : butterflies
  const title = `${PHASE_NAME[phase]}${butterflies + bees ? `: bahçede ${night ? `${butterflies + bees} ateş böceği` : [butterflies && `${butterflies} kelebek`, bees && `${bees} arı`].filter(Boolean).join(', ')}` : night ? ': bahçede gece göğü ve ateş böcekleri' : ''}`
  return (
    <div className={`garden-sky is-${phase}`} role="img" aria-label={title} title={title}>
      <span className={`sky-body is-${body}`} style={{ left: `${6 + t * 88}%`, top: `${68 - arc * 52}%` }}>
        {body === 'moon' && (
          <svg viewBox="0 0 32 32" className="moon-svg" aria-hidden>
            <circle cx="16" cy="16" r="14" fill="url(#garden-moon-grad)" />
            <circle cx="12" cy="13" r="2.2" fill="#d4cba7" opacity="0.45" />
            <circle cx="20" cy="18" r="3" fill="#d4cba7" opacity="0.4" />
            <circle cx="14" cy="21" r="1.6" fill="#d4cba7" opacity="0.35" />
            <path d="M16 2 A14 14 0 0 1 29 21 A14 14 0 1 1 16 2" fill="rgba(24, 34, 64, 0.28)" />
            <defs>
              <radialGradient id="garden-moon-grad" cx="38%" cy="36%" r="65%">
                <stop offset="0%" stopColor="#fffef5" />
                <stop offset="55%" stopColor="#fef3c7" />
                <stop offset="90%" stopColor="#e2d8ab" />
                <stop offset="100%" stopColor="#cfc28f" />
              </radialGradient>
            </defs>
          </svg>
        )}
      </span>
      {!night && (
        <div className="sky-clouds" aria-hidden>
          <span className="sky-cloud sky-cloud-1" style={{ top: '16%', left: '10%' }} />
          <span className="sky-cloud sky-cloud-2" style={{ top: '34%', left: '68%' }} />
        </div>
      )}
      {night &&
        NIGHT_STARS.map((star, i) => (
          <i
            key={i}
            className={`sky-star${star.sparkle ? ' is-sparkle' : ''}`}
            style={
              {
                left: `${star.x}%`,
                top: `${star.y}%`,
                width: `${star.s}px`,
                height: `${star.s}px`,
                animationDelay: `${star.d}s`,
                '--i': i,
              } as CSSProperties
            }
          />
        ))}
      <svg className="sky-hills" viewBox="0 0 100 20" preserveAspectRatio="none" aria-hidden>
        <path d="M0 20 V12 Q25 6 50 10 T100 7 V20Z" opacity="0.45" />
        <path d="M0 20 V14 Q20 8 45 12 T85 9 L100 11 V20Z" />
      </svg>
      {Array.from({ length: guests }, (_, i) => (
        <span
          key={`g${i}`}
          className={night ? 'sky-firefly' : 'sky-butterfly'}
          style={
            {
              '--i': i,
              '--y': `${26 + ((i * 26) % 36)}%`,
              left: night ? `${14 + ((i * 28) % 72)}%` : undefined,
            } as CSSProperties
          }
        >
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
