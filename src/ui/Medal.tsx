import { useId } from 'react'
import type { MedalTier } from '../engine/gamification'
import { glyphFor } from './Glyph'

const TIER: Record<MedalTier, { rim: [string, string]; face: [string, string]; ribbon: [string, string] }> = {
  bronze: { rim: ['#e8a76f', '#9a5a2b'], face: ['#f6d3b0', '#d79a68'], ribbon: ['#c2410c', '#9a3412'] },
  silver: { rim: ['#e5e7eb', '#8b95a5'], face: ['#f8fafc', '#cbd5e1'], ribbon: ['#2563eb', '#1e40af'] },
  gold: { rim: ['#fde68a', '#b7791f'], face: ['#fff7d1', '#f2c94c'], ribbon: ['#db2777', '#9d174d'] },
  special: { rim: ['#ddd6fe', '#6d28d9'], face: ['#f5f3ff', '#c4b5fd'], ribbon: ['#7c3aed', '#5b21b6'] },
}

/**
 * A badge as a medal on a ribbon, in its tier's metal. Locked medals are drawn faded with an arc
 * around them showing how close they are.
 */
export function Medal({ icon, tier, unlocked, progress = 0, size = 64 }: { icon: string; tier: MedalTier; unlocked: boolean; progress?: number; size?: number }) {
  const id = useId().replace(/:/g, '')
  const t = TIER[tier]
  const r = 25
  const arc = 2 * Math.PI * (r + 4.5)
  const Art = glyphFor(icon)
  return (
    <svg width={size} height={size * 1.15} viewBox="0 0 64 74" className={`medal${unlocked ? ' is-unlocked' : ''}`} aria-hidden>
      <defs>
        <linearGradient id={`rim${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={t.rim[0]} />
          <stop offset="1" stopColor={t.rim[1]} />
        </linearGradient>
        <linearGradient id={`face${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={t.face[0]} />
          <stop offset="1" stopColor={t.face[1]} />
        </linearGradient>
        <clipPath id={`clip${id}`}>
          <circle cx="32" cy="31" r={r} />
        </clipPath>
      </defs>
      <g className="medal-art">
        <path d="M20 44 L13 72 L22 67 L27 73 L32 50 Z" fill={t.ribbon[1]} />
        <path d="M44 44 L51 72 L42 67 L37 73 L32 50 Z" fill={t.ribbon[0]} />
        <circle cx="32" cy="31" r={r} fill={`url(#rim${id})`} />
        <circle cx="32" cy="31" r={r - 4} fill={`url(#face${id})`} />
        <circle cx="32" cy="31" r={r - 4} fill="none" stroke="rgb(255 255 255 / 0.55)" strokeWidth="1" strokeDasharray="2 3" />
        {Art ? (
          <g transform="translate(20 19)" style={{ color: t.ribbon[1] }}>
            <Art size={24} className="medal-glyph" />
          </g>
        ) : (
          <text x="32" y="32" textAnchor="middle" dominantBaseline="central" fontSize="22">
            {icon}
          </text>
        )}
      </g>
      {unlocked && (
        // A glint crosses the face once when it appears, and again whenever it is pointed at.
        <g clipPath={`url(#clip${id})`}>
          <rect className="medal-shine" x="-30" y="2" width="12" height="58" fill="rgb(255 255 255 / 0.55)" transform="skewX(-20)" />
        </g>
      )}
      {!unlocked && progress > 0 && (
        <circle
          cx="32"
          cy="31"
          r={r + 4.5}
          fill="none"
          stroke="var(--lang)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={`${arc * Math.min(1, progress)} ${arc}`}
          transform="rotate(-90 32 31)"
        />
      )}
    </svg>
  )
}
