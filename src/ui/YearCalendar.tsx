import { useEffect, useMemo, useState } from 'react'
import type { KelimeDB } from '../data/db'
import { heatmap } from '../engine/heatmap'

const CELL = 12
const GAP = 3
const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']

/** A year of study at a glance: one square per day, darker for more answers (all languages). */
export function YearCalendar({ db }: { db: KelimeDB }) {
  const [times, setTimes] = useState<Date[] | null>(null)
  useEffect(() => {
    void db.eventsSince(new Date(Date.now() - 372 * 86_400_000)).then((events) => setTimes(events.map((e) => e.timestamp)))
  }, [db])
  const map = useMemo(() => (times ? heatmap(times, new Date()) : null), [times])
  if (!map || !map.activeDays) return null

  const width = map.weeks.length * (CELL + GAP) + 24
  const height = 7 * (CELL + GAP) + 18
  let lastMonth = -1
  return (
    <section className="section stack span-2">
      <h2 className="section-title">Son bir yıl</h2>
      <p className="small muted">
        {map.activeDays} gün çalıştın, {map.total.toLocaleString('tr-TR')} cevap verdin; en uzun aralıksız dönem {map.longestStreak} gün.
      </p>
      <div className="year-scroll">
        <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height} className="year-calendar" role="img" aria-label="Yıllık çalışma takvimi">
          {['Pzt', 'Çar', 'Cum'].map((d, i) => (
            <text key={d} x={0} y={18 + (i * 2) * (CELL + GAP) + CELL - 2} className="yc-label">
              {d}
            </text>
          ))}
          {map.weeks.map((week, w) => {
            const month = new Date(`${week[0].date}T12:00:00`).getMonth()
            const label = month !== lastMonth ? MONTHS[month] : null
            lastMonth = month
            return (
              <g key={week[0].date} transform={`translate(${24 + w * (CELL + GAP)}, 0)`}>
                {label && (
                  <text x={0} y={10} className="yc-label">
                    {label}
                  </text>
                )}
                {week.map((d, i) =>
                  d.future ? null : (
                    <rect key={d.date} y={18 + i * (CELL + GAP)} width={CELL} height={CELL} rx={3} className={`yc-cell yc-${d.level}`}>
                      <title>
                        {new Date(`${d.date}T12:00:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' })}: {d.count ? `${d.count} cevap` : 'çalışılmadı'}
                      </title>
                    </rect>
                  ),
                )}
              </g>
            )
          })}
        </svg>
      </div>
      <p className="small muted year-legend">
        az <span className="yc-key yc-1" />
        <span className="yc-key yc-2" />
        <span className="yc-key yc-3" />
        <span className="yc-key yc-4" /> çok
      </p>
    </section>
  )
}
