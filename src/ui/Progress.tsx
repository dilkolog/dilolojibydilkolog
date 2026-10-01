import { useEffect, useState } from 'react'
import { MASTERY_STAGES, skillProfile } from '../engine/mastery'
import { progressStats, type DayActivity, type ProgressStats } from '../engine/progress'
import type { Scheduler } from '../engine/scheduler'
import { SKILLS, type TargetLanguage, type UserWordState } from '../engine/types'
import type { KelimeDB } from '../data/db'
import { SKILL_NAME, STAGE_NAME } from './labels'

const DAYS = 14

export function ProgressScreen({
  db,
  language,
  vocabularyCount,
  states,
  scheduler,
}: {
  db: KelimeDB
  language: TargetLanguage
  vocabularyCount: number
  states: UserWordState[]
  scheduler: Scheduler
}) {
  const [stats, setStats] = useState<ProgressStats | null>(null)

  useEffect(() => {
    const now = new Date()
    const since = new Date(now.getFullYear(), now.getMonth(), now.getDate() - DAYS + 1)
    db.eventsSince(since, language).then((events) =>
      setStats(progressStats({ vocabularyCount, states, events, scheduler, now, days: DAYS })),
    )
  }, [db, language, vocabularyCount, states, scheduler])

  if (!stats) return null
  const profile = skillProfile(states, scheduler, new Date())
  const maxStage = Math.max(1, stats.notStarted, ...Object.values(stats.stageCounts))

  return (
    <div>
      <section className="section stack">
        <h1 className="today-title">İlerleme</h1>
        <div className="hero-stat">
          <span className="hero-number">{stats.activeVocabulary}</span>
          <span>
            <strong>aktif kelime</strong>
            <br />
            <span className="small muted">
              İpucu olmadan cümlede üretebildiğin ve şu an hâlâ hatırladığın kelimeler. Asıl hedef bu sayının büyümesi.
            </span>
          </span>
        </div>
      </section>

      <section className="section stack">
        <h2 className="today-title">Kelimeler nerede?</h2>
        <div className="bars">
          {[...MASTERY_STAGES].reverse().map((stage) => (
            <StageBar key={stage} label={STAGE_NAME[stage]} value={stats.stageCounts[stage]} max={maxStage} />
          ))}
          <StageBar label="Başlanmadı" value={stats.notStarted} max={maxStage} muted />
        </div>
      </section>

      <section className="section stack">
        <h2 className="today-title">Son {DAYS} gün</h2>
        <p className="small muted">
          {stats.daysPractised > 0
            ? `${DAYS} günün ${stats.daysPractised} gününde çalıştın. Serbest pratik sayılmaz.`
            : 'Bu dönemde henüz çalışma yok.'}
        </p>
        <ActivityChart activity={stats.activity} />
      </section>

      <section className="section stack">
        <h2 className="today-title">Beceriler</h2>
        <div className="bars">
          {SKILLS.map((s) => (
            <div className="bar-row" key={s}>
              <span>{SKILL_NAME[s]}</span>
              <div className="bar-track">
                <div className="bar-fill" style={{ width: `${profile[s] ?? 0}%` }} />
              </div>
              <span className="bar-value">{profile[s] === null ? 'henüz yok' : `%${profile[s]}`}</span>
            </div>
          ))}
        </div>
        <p className="small muted">Yüzde, o beceride çalıştığın kelimeleri şu an hatırlama olasılığının ortalaması.</p>
      </section>
    </div>
  )
}

function StageBar({ label, value, max, muted }: { label: string; value: number; max: number; muted?: boolean }) {
  return (
    <div className="bar-row">
      <span className={muted ? 'muted' : ''}>{label}</span>
      <div className="bar-track bar-track-plain">
        {value > 0 && <div className={muted ? 'bar-fill bar-fill-muted' : 'bar-fill'} style={{ width: `${(value / max) * 100}%` }} />}
      </div>
      <span className="bar-value">{value}</span>
    </div>
  )
}

const dayLabel = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('tr-TR', opts)

/** Answers per day as thin columns; hover (or focus) shows the exact numbers. */
function ActivityChart({ activity }: { activity: DayActivity[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(1, ...activity.map((a) => a.answers))
  const shown = hover !== null ? activity[hover] : null

  return (
    <div>
      <p className="chart-readout small" aria-live="polite">
        {shown
          ? `${dayLabel(shown.date, { day: 'numeric', month: 'long', weekday: 'short' })}: ${shown.answers} cevap${
              shown.answers ? `, ${shown.correct} doğru` : ''
            }`
          : `En yoğun gün: ${max} cevap`}
      </p>
      <div className="columns" onMouseLeave={() => setHover(null)}>
        {activity.map((a, i) => (
          <button
            key={a.date}
            type="button"
            className="column-hit"
            aria-label={`${dayLabel(a.date, { day: 'numeric', month: 'long' })}: ${a.answers} cevap`}
            onMouseEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
          >
            <span
              className={`column${hover === i ? ' is-active' : ''}`}
              style={{ height: a.answers ? `${Math.max(4, (a.answers / max) * 100)}%` : 0 }}
            />
          </button>
        ))}
      </div>
      <div className="columns-axis small muted">
        <span>{dayLabel(activity[0].date, { day: 'numeric', month: 'short' })}</span>
        <span>bugün</span>
      </div>
      <details className="small" style={{ marginTop: '0.75rem' }}>
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
