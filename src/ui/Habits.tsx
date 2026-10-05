import { useState } from 'react'
import { CloseIcon, MoonIcon, PinIcon } from './icons'
import type { Settings } from '../data/db'

/** From this hour, a short review of today's new words before sleep is suggested. */
const EVENING_HOUR = 19

/**
 * Small habit nudges on the home screen:
 * - in the evening, a two-minute look at today's new words: sleep consolidates what was
 *   reviewed shortly before it (Diekelmann & Born 2010);
 * - once, an if-then study plan ("when I have my morning coffee"): implementation intentions
 *   roughly double follow-through on goals (Gollwitzer & Sheeran 2006).
 */
export function HabitCards({
  settings,
  onSettings,
  newToday,
  onEveningReview,
  now = new Date(),
}: {
  settings: Settings
  onSettings: (s: Settings) => void
  /** Words met for the first time today. */
  newToday: number
  onEveningReview: () => void
  now?: Date
}) {
  const [cue, setCue] = useState('')
  // The plan question starts as one line under the mission and opens only when asked for.
  const [planOpen, setPlanOpen] = useState(false)
  const evening = now.getHours() >= EVENING_HOUR && newToday > 0

  return (
    <>
      {evening && (
        <section className="habit card">
          <span className="habit-icon" aria-hidden>
            <MoonIcon size={24} />
          </span>
          <div className="stack gap-xs">
            <strong>Yatmadan önce 2 dakika</strong>
            <span className="small muted">
              Bugün tanıştığın {newToday} kelimeye uykudan önce bir kez daha bak. Uyku, yatmadan hemen önce tekrar ettiklerini pekiştirir; sabah ilk
              tekrarların da onlar olacak. Bu pratik takvimi değiştirmez.
            </span>
          </div>
          <button className="btn btn-quiet" onClick={onEveningReview}>
            Gözden geçir
          </button>
        </section>
      )}

      {!settings.studyPlan && !settings.studyPlanAsked && !planOpen && (
        <div className="habit-nudge">
          <button type="button" className="habit-nudge-main" onClick={() => setPlanOpen(true)}>
            <PinIcon size={18} />
            <span>
              <strong>Ne zaman çalışacaksın?</strong> <span className="muted">Somut bir plan alışkanlığı kolaylaştırır.</span>
            </span>
            <span className="habit-nudge-cta">Plan yap</span>
          </button>
          <button type="button" className="icon-btn icon-btn-sm" aria-label="Şimdi değil" title="Şimdi değil" onClick={() => onSettings({ ...settings, studyPlanAsked: true })}>
            <CloseIcon size={16} />
          </button>
        </div>
      )}

      {!settings.studyPlan && !settings.studyPlanAsked && planOpen && (
        <section className="habit card">
          <span className="habit-icon" aria-hidden>
            <PinIcon size={24} />
          </span>
          <form
            className="stack gap-2 grow"
            onSubmit={(e) => {
              e.preventDefault()
              if (cue.trim()) onSettings({ ...settings, studyPlan: cue.trim(), studyPlanAsked: true })
            }}
          >
            <strong>Ne zaman ve nerede çalışacaksın?</strong>
            <span className="small muted">
              “Şu olduğunda, kelime çalışacağım” diye somut bir plan yapmak, niyeti alışkanlığa çevirmenin en etkili yollarından biri.
            </span>
            <div className="row nowrap">
              <input className="input" value={cue} onChange={(e) => setCue(e.target.value)} placeholder="Sabah kahvemi içerken" aria-label="Çalışma planın" autoFocus />
              <button className="btn" type="submit" disabled={!cue.trim()}>
                Kaydet
              </button>
            </div>
            <button type="button" className="link small justify-self-start" onClick={() => onSettings({ ...settings, studyPlanAsked: true })}>
              Şimdi değil
            </button>
          </form>
        </section>
      )}

      {settings.studyPlan && (
        <p className="small muted habit-plan">
          <PinIcon size={16} className="inline-icon" />Planın: <strong>{settings.studyPlan}</strong>
          {settings.reminder.enabled && `, hatırlatma ${settings.reminder.time}`}
        </p>
      )}
    </>
  )
}
