import { useEffect, useState } from 'react'
import type { KelimeDB } from '../data/db'
import { durationText, goalProgress, weekOf, type TimeLog } from '../engine/studyTime'
import type { TargetLanguage } from '../engine/types'

/**
 * Today: the time spent reading and listening in this language, today and over the week, with the
 * progress to the weekly goal when there is one. Shown only once there is something to show (some
 * time this week, or a goal), and it opens the progress screen, where the goal is set.
 */
export function TodayTime({ db, language, goal, onOpen }: { db: KelimeDB; language: TargetLanguage; goal: number | undefined; onOpen: () => void }) {
  const [log, setLog] = useState<TimeLog | null>(null)
  useEffect(() => {
    let live = true
    void db.getTimeLog().then((l) => live && setLog(l))
    return () => {
      live = false
    }
  }, [db])
  if (!log) return null
  const week = weekOf(log, language, new Date())
  if (week.total === 0 && !goal) return null
  const today = week.days[week.days.length - 1]
  const todaySeconds = today.read + today.listen
  const progress = goalProgress(week.total, goal)
  return (
    <section className="today-time" aria-label="Okuma ve dinleme süren">
      <div className="today-time-head">
        <h2 className="section-title">Okuma ve dinleme</h2>
        <button type="button" className="link small" onClick={onOpen}>
          Ayrıntı
        </button>
      </div>
      <p className="today-time-line">
        <strong>{todaySeconds > 0 ? durationText(todaySeconds) : 'Bugün yok'}</strong>
        <span className="small muted"> bugün · {durationText(week.total)} bu hafta</span>
      </p>
      {progress && (
        <>
          <div className="bar-track" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress.share * 100)} aria-label="Haftalık hedefe ilerleme">
            <div className="bar-fill" style={{ width: `${progress.share * 100}%` }} />
          </div>
          <p className="small muted">{progress.done ? 'Haftalık hedef tamam.' : `Haftalık hedefe ${durationText(progress.leftMinutes * 60)} kaldı.`}</p>
        </>
      )}
    </section>
  )
}
