import type { ReactNode } from 'react'

/** Circular progress (0–1). Turns green and shows `doneLabel` when complete. */
export function Ring({
  value,
  size = 112,
  stroke = 12,
  label,
  doneLabel,
  start = false,
}: {
  value: number
  size?: number
  stroke?: number
  label?: ReactNode
  doneLabel?: ReactNode
  /** Nothing done yet and something to begin: the ring breathes an invitation (Today only). */
  start?: boolean
}) {
  const v = Math.max(0, Math.min(1, value))
  const done = v >= 1
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div className={`ring${start && v === 0 ? ' is-start' : ''}`} style={{ width: size, height: size }} role="img" aria-label={`%${Math.round(v * 100)} tamamlandı`}>
      <svg width={size} height={size}>
        <circle className="ring-track" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" />
        <circle
          className={`ring-fill${done ? ' done' : ''}`}
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
        />
      </svg>
      <span className={`ring-label${done ? ' done' : ''}`}>{done && doneLabel ? doneLabel : (label ?? `%${Math.round(v * 100)}`)}</span>
    </div>
  )
}
