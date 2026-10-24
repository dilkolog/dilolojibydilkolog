import { type KeyboardEvent, useState } from 'react'
import type { DayActivity } from '../engine/progress'
import { dayLabel } from './progressShared'
import { Sticker } from './Sticker'

/**
 * A column chart is one stop for the keyboard: arrows move between the days (Home/End to the ends)
 * and the readout above says the day's numbers. The columns aren't buttons, so a pointer only hovers
 * them and there are no tiny targets to hit.
 */
function columnKeys(count: number, hover: number | null, setHover: (i: number | null) => void) {
  return {
    tabIndex: 0,
    onFocus: () => setHover(hover ?? count - 1),
    onBlur: () => setHover(null),
    onMouseLeave: () => setHover(null),
    onKeyDown: (e: KeyboardEvent) => {
      const at = hover ?? count - 1
      const next = { ArrowLeft: at - 1, ArrowRight: at + 1, Home: 0, End: count - 1 }[e.key]
      if (next === undefined) return
      e.preventDefault()
      setHover(Math.max(0, Math.min(count - 1, next)))
    },
  }
}

export function StageBar({
  label,
  value,
  max,
  muted,
  tone,
}: {
  label: string
  value: number
  max: number
  muted?: boolean
  tone: 'seed' | 'sprout' | 'growing' | 'flower'
}) {
  return (
    <div className="bar-row">
      <span className={muted ? 'muted' : ''}>{label}</span>
      <div className="bar-track bar-track-plain">
        {value > 0 && <div className={`bar-fill stage-fill is-${tone}`} style={{ width: `${(value / max) * 100}%` }} />}
      </div>
      <span className="bar-value">{value}</span>
    </div>
  )
}

/** Answers per day as thin columns; hover (or focus) shows the exact numbers. */
export function ActivityChart({ activity }: { activity: DayActivity[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const peak = Math.max(0, ...activity.map((a) => a.answers))
  const max = Math.max(1, peak)
  const shown = hover !== null ? activity[hover] : null

  if (peak === 0) {
    return (
      <p className="small muted sticker-note">
        <Sticker name="sleep" size={40} />
        <span>İlk oturumdan sonra günlük cevapların burada sütun olarak görünür.</span>
      </p>
    )
  }

  return (
    <div>
      <p className="chart-readout small" aria-live="polite">
        {shown
          ? `${dayLabel(shown.date, { day: 'numeric', month: 'long', weekday: 'short' })}: ${shown.answers} cevap${
              shown.answers ? `, ${shown.correct} doğru` : ''
            }`
          : `En yoğun gün: ${peak} cevap`}
      </p>
      <div className="columns" role="group" aria-label="Günlük cevaplar; ok tuşlarıyla günler arasında gez" {...columnKeys(activity.length, hover, setHover)}>
        {activity.map((a, i) => (
          <span key={a.date} className="column-hit" onMouseEnter={() => setHover(i)}>
            <span
              className={`column${hover === i ? ' is-active' : ''}${a.answers === max && a.answers > 0 ? ' is-peak' : ''}`}
              data-value={a.answers}
              style={{ height: a.answers ? `${Math.max(4, (a.answers / max) * 100)}%` : 0 }}
            />
          </span>
        ))}
      </div>
      <div className="columns-axis small muted">
        <span>{dayLabel(activity[0].date, { day: 'numeric', month: 'short' })}</span>
        <span>bugün</span>
      </div>
      <details className="small mt-3">
        <summary>Tablo olarak göster</summary>
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Gün</th>
              <th scope="col">Cevap</th>
              <th scope="col">Doğru</th>
            </tr>
          </thead>
          <tbody>
            {activity.map((a) => (
              <tr key={a.date}>
                <td>{dayLabel(a.date, { day: 'numeric', month: 'short', weekday: 'short' })}</td>
                <td>{a.answers}</td>
                <td>{a.correct}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  )
}

export function ForecastChart({ forecast }: { forecast: { date: string; count: number }[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(1, ...forecast.map((f) => f.count))
  const shown = hover !== null ? forecast[hover] : null
  return (
    <div>
      <p className="chart-readout small" aria-live="polite">
        {shown
          ? `${dayLabel(shown.date, { day: 'numeric', month: 'long', weekday: 'short' })}: ${shown.count} kelime`
          : `Toplam ${forecast.reduce((s, f) => s + f.count, 0)} kelime`}
      </p>
      <div className="columns" role="group" aria-label="Önümüzdeki günlerin tekrarları; ok tuşlarıyla günler arasında gez" {...columnKeys(forecast.length, hover, setHover)}>
        {forecast.map((f, i) => (
          <span key={f.date} className="column-hit" onMouseEnter={() => setHover(i)}>
            <span
              className={`column${hover === i ? ' is-active' : ''}${f.count === max && f.count > 0 ? ' is-peak' : ''}`}
              data-value={f.count}
              style={{ height: f.count ? `${Math.max(4, (f.count / max) * 100)}%` : 0, background: i === 0 ? 'var(--flame)' : undefined }}
            />
          </span>
        ))}
      </div>
      <div className="columns-axis small muted">
        <span>bugün</span>
        <span>{dayLabel(forecast.at(-1)!.date, { day: 'numeric', month: 'short' })}</span>
      </div>
      <ul className="chart-legend small muted">
        <li>
          <span className="chart-key is-today" aria-hidden /> bugün, gecikmişler dahil
        </li>
        <li>
          <span className="chart-key" aria-hidden /> sonraki günler
        </li>
      </ul>
    </div>
  )
}
