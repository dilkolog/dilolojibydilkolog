import { useEffect, useMemo, useState } from 'react'
import type { KelimeDB } from '../data/db'
import { memoryCurve } from '../engine/memoryCurve'
import type { ReviewEvent } from '../engine/types'
import { SKILL_NAME } from './labels'

const W = 640
const H = 180
const PAD = { l: 34, r: 10, t: 10, b: 24 }

/** The forgetting curve of one word, from its own answers, with the next 30 days projected. */
export function MemoryCurveChart({ db, entryId, refresh }: { db: KelimeDB; entryId: string; refresh?: unknown }) {
  const [events, setEvents] = useState<ReviewEvent[] | null>(null)
  useEffect(() => {
    void db.events.where('entryId').equals(entryId).toArray().then(setEvents)
  }, [db, entryId, refresh])
  const curve = useMemo(() => (events ? memoryCurve(events, new Date()) : null), [events])
  if (!curve || curve.reviews.length < 2) return null

  const t0 = curve.points[0].t
  const t1 = curve.points.at(-1)!.t
  const x = (t: number) => PAD.l + ((t - t0) / (t1 - t0)) * (W - PAD.l - PAD.r)
  const y = (r: number) => PAD.t + (1 - r) * (H - PAD.t - PAD.b)
  const past = curve.points.filter((p) => p.t <= curve.now)
  const future = curve.points.filter((p) => p.t >= curve.now)
  const path = (ps: typeof curve.points) => ps.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.r).toFixed(1)}`).join('')
  const fmt = (t: number) => new Date(t).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })

  return (
    <section className="section stack">
      <h2 className="section-title">Unutma eğrisi</h2>
      <p className="small muted">
        {SKILL_NAME[curve.skill]} becerisinde hatırlama olasılığın: her tekrar onu yukarı çeker ve her seferinde daha yavaş düşer. Kesikli kısım önümüzdeki 30
        gün, tekrar etmezsen.
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="memory-curve" role="img" aria-label="Unutma eğrisi grafiği">
        {[1, 0.9, 0.7, 0.5].map((r) => (
          <g key={r}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(r)} y2={y(r)} className="mc-grid" />
            <text x={PAD.l - 6} y={y(r) + 4} className="mc-axis" textAnchor="end">
              %{Math.round(r * 100)}
            </text>
          </g>
        ))}
        <line x1={x(curve.now)} x2={x(curve.now)} y1={PAD.t} y2={H - PAD.b} className="mc-now" />
        <text x={x(curve.now)} y={H - 6} className="mc-axis" textAnchor="middle">
          bugün
        </text>
        <text x={PAD.l} y={H - 6} className="mc-axis">
          {fmt(t0)}
        </text>
        <path d={path(past)} className="mc-line" />
        <path d={path(future)} className="mc-line mc-future" />
        {curve.reviews.map((rv) => (
          <circle key={rv.t} cx={x(rv.t)} cy={y(rv.r || 1)} r={4} className={rv.correct ? 'mc-ok' : 'mc-bad'}>
            <title>
              {fmt(rv.t)}: {rv.correct ? 'doğru' : 'yanlış'}
              {rv.r ? `, o an hatırlama %${Math.round(rv.r * 100)}` : ''}
            </title>
          </circle>
        ))}
      </svg>
      <p className="small muted">
        <span className="mc-key mc-key-ok" /> doğru cevap <span className="mc-key mc-key-bad" /> yanlış cevap
      </p>
    </section>
  )
}
