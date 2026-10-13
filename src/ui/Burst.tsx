import { useMemo } from 'react'
import confetti1 from '../assets/art/confetti-1.webp'
import confetti2 from '../assets/art/confetti-2.webp'
import confetti3 from '../assets/art/confetti-3.webp'
import confetti4 from '../assets/art/confetti-4.webp'

/** The drawn confetti, four frames of one burst: it goes off, opens, scatters and settles. */
const FRAMES = [confetti1, confetti2, confetti3, confetti4]

const BURST_COLORS = ['var(--lang)', 'var(--ok)', 'var(--gold)', 'var(--lang)', '#34d399', 'var(--ok)']

/** One orchestrated celebration: the drawn confetti burst and the leaf pieces behind the result ring. */
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
      <div className="burst-frames">
        {FRAMES.map((src, i) => (
          <img key={i} src={src} alt="" className={`burst-frame burst-frame-${i + 1}`} draggable={false} />
        ))}
      </div>
      {pieces.map((p, i) => (
        <span
          key={i}
          style={{ background: p.color, animationDelay: p.delay, ['--x' as string]: p.x, ['--y' as string]: p.y, ['--r' as string]: p.r }}
        />
      ))}
    </div>
  )
}
