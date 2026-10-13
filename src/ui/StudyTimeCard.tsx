import { useEffect, useState } from 'react'
import type { KelimeDB } from '../data/db'
import { durationText, goalProgress, GOAL_CHOICES, weekOf, type TimeLog } from '../engine/studyTime'
import type { TargetLanguage } from '../engine/types'
import { dayLabel } from './progressShared'

/**
 * Time spent reading and listening this week (the last seven days), in the language being learned,
 * with an optional weekly goal. Counted only while a text is open and touched, or a recording plays.
 */
export function StudyTimeCard({ db, language, goal, onGoal }: { db: KelimeDB; language: TargetLanguage; goal: number | undefined; onGoal: (minutes: number | undefined) => void }) {
  const [log, setLog] = useState<TimeLog | null>(null)
  useEffect(() => {
    void db.getTimeLog().then(setLog)
  }, [db])
  if (!log) return null
  const week = weekOf(log, language, new Date())
  const peak = Math.max(60, ...week.days.map((d) => d.read + d.listen))
  const progress = goalProgress(week.total, goal)
  const summary = week.days.map((d) => `${dayLabel(d.day, { weekday: 'long' })} ${durationText(d.read + d.listen)}`).join(', ')
  return (
    <section className="section stack" aria-labelledby="study-time-title">
      <h2 id="study-time-title" className="section-title">
        Okuma ve dinleme süren
      </h2>
      {week.total === 0 ? (
        <p className="small muted">Son 7 günde bu dilde okuma ya da dinleme yok. Bir metin açıp okumaya ya da bir kaydı dinlemeye başlayınca süre burada birikir.</p>
      ) : (
        <>
          <p className="time-total">
            <strong>{durationText(week.total)}</strong> <span className="small muted">son 7 gün</span>
          </p>
          <p className="small muted">
            Okuma {durationText(week.read)} · Dinleme {durationText(week.listen)}
          </p>
          <div className="time-days" role="img" aria-label={summary}>
            {week.days.map((d) => (
              <span key={d.day} className="time-day">
                <span className="time-bar" aria-hidden>
                  <span className="time-listen" style={{ height: `${((d.listen / peak) * 100).toFixed(1)}%` }} />
                  <span className="time-read" style={{ height: `${((d.read / peak) * 100).toFixed(1)}%` }} />
                </span>
                <span className="small muted" aria-hidden>
                  {dayLabel(d.day, { weekday: 'narrow' })}
                </span>
              </span>
            ))}
          </div>
        </>
      )}
      <div className="stack">
        <p className="small">Haftalık hedef</p>
        <div className="seg-group" role="radiogroup" aria-label="Haftalık okuma ve dinleme hedefi">
          <button type="button" role="radio" aria-checked={!goal} className="seg-btn" onClick={() => onGoal(undefined)}>
            Yok
          </button>
          {GOAL_CHOICES.map((m) => (
            <button key={m} type="button" role="radio" aria-checked={goal === m} className="seg-btn" onClick={() => onGoal(m)}>
              {m >= 60 ? `${m / 60} sa` : `${m} dk`}
            </button>
          ))}
        </div>
        {progress && (
          <>
            <div className="bar-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress.share * 100)} aria-label="Haftalık hedefe ilerleme">
              <div className="bar-fill" style={{ width: `${progress.share * 100}%` }} />
            </div>
            <p className="small muted">{progress.done ? 'Haftalık hedef tamam.' : `Hedefe ${durationText(progress.leftMinutes * 60)} kaldı.`}</p>
          </>
        )}
      </div>
    </section>
  )
}
