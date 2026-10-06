import { useMemo } from 'react'

const BURST_COLORS = ['var(--lang)', 'var(--ok)', 'var(--gold)', 'var(--lang)', '#34d399', 'var(--ok)']

/** One orchestrated celebration: a confetti burst behind the result ring. */
export function Burst() {
  const pieces = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => {
        const angle = (i / 28) * Math.PI * 2
        const dist = 90 + ((i * 37) % 70)
        return {
          x: `${Math.cos(angle) * dist * 1.6}px`,
          y: `${Math.sin(angle) * dist - 30}px`,
          r: `${(i * 47) % 360}deg`,
          color: BURST_COLORS[i % BURST_COLORS.length],
          delay: `${(i % 5) * 30}ms`,
        }
      }),
    [],
  )
  return (
    <div className="burst" aria-hidden>
      {pieces.map((p, i) => (
        <span
          key={i}
          style={{ background: p.color, animationDelay: p.delay, ['--x' as string]: p.x, ['--y' as string]: p.y, ['--r' as string]: p.r }}
        />
      ))}
    </div>
  )
}
