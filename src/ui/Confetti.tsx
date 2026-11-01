import { useEffect, useState, useMemo } from 'react'
import celebrationConfetti from '../assets/art/celebration-confetti.webp'

interface ConfettiPiece {
  id: number
  x: number // percentage
  y: number // percentage
  size: number
  color: string
  rotation: number
  delay: number
  duration: number
  shape: 'square' | 'circle' | 'ribbon'
}

const CONFETTI_COLORS = [
  'var(--gold)',
  'var(--ok)',
  'var(--lang)',
  '#f43f5e',
  '#38bdf8',
  '#a855f7',
  '#fbbf24',
]

export function Confetti({
  active = true,
  duration = 3500,
  onComplete,
}: {
  active?: boolean
  duration?: number
  onComplete?: () => void
}) {
  const [visible, setVisible] = useState(active)

  useEffect(() => {
    if (!active) {
      setVisible(false)
      return
    }
    setVisible(true)
    const t = setTimeout(() => {
      setVisible(false)
      onComplete?.()
    }, duration)
    return () => clearTimeout(t)
  }, [active, duration, onComplete])

  const pieces = useMemo<ConfettiPiece[]>(() => {
    return Array.from({ length: 48 }, (_, i) => ({
      id: i,
      x: 10 + (i * 1.7) % 80,
      y: -10 - (i % 5) * 6,
      size: 6 + (i % 6) * 1.5,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      rotation: (i * 37) % 360,
      delay: (i * 45) % 800,
      duration: 1800 + ((i * 73) % 1200),
      shape: i % 3 === 0 ? 'circle' : i % 3 === 1 ? 'ribbon' : 'square',
    }))
  }, [])

  if (!visible) return null

  return (
    <div className="celebration-overlay" aria-hidden>
      <div className="celebration-mascot">
        <img src={celebrationConfetti} alt="" className="celebration-confetti-art" draggable={false} />
      </div>
      <div className="confetti-cannon">
        {pieces.map((p) => (
          <span
            key={p.id}
            className={`confetti-particle shape-${p.shape}`}
            style={{
              left: `${p.x}%`,
              width: `${p.size}px`,
              height: p.shape === 'ribbon' ? `${p.size * 2.2}px` : `${p.size}px`,
              backgroundColor: p.color,
              animationDelay: `${p.delay}ms`,
              animationDuration: `${p.duration}ms`,
              ['--rot' as string]: `${p.rotation}deg`,
            }}
          />
        ))}
      </div>
    </div>
  )
}
