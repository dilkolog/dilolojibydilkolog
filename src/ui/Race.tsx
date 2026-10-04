import { weeklyRace } from '../engine/race'
import { FlagIcon } from './icons'
import type { GameState } from './game'

/** This week's XP racing last week's XP up to the same weekday. */
export function RaceCard({ game, now = new Date() }: { game: GameState; now?: Date }) {
  const r = weeklyRace(game.xp.byDay, now)
  if (r.thisWeek === 0 && r.lastWeekTotal === 0) return null
  const max = Math.max(r.thisWeek, r.lastWeekSoFar, 1)
  const diff = r.thisWeek - r.lastWeekSoFar
  const message =
    r.lastWeekTotal === 0
      ? 'İlk haftan: gelecek hafta bu haftayla yarışacaksın.'
      : diff > 0
        ? `Geçen haftanın ${diff} XP önündesin.${r.thisWeek < r.lastWeekTotal ? ` Haftayı geçmek için ${r.lastWeekTotal - r.thisWeek + 1} XP daha.` : ' Geçen haftanın tamamını geçtin!'}`
        : diff === 0
          ? 'Geçen haftayla başa baş.'
          : `Geçen haftanın ${-diff} XP gerisindesin; bugün yakalayabilirsin.`
  return (
    <section className="race card">
      <div className="row justify-between">
        <strong>Haftalık yarış</strong>
        {r.streak > 0 && <span className="small race-streak"><FlagIcon size={14} className="inline-icon" />{r.streak} hafta üst üste kendini geçtin</span>}
      </div>
      <div className="race-lane">
        <span className="small">Bu hafta</span>
        <div className="race-track">
          <div className="race-bar race-me" style={{ width: `${(r.thisWeek / max) * 100}%` }} />
        </div>
        <span className="small race-num">{r.thisWeek}</span>
      </div>
      <div className="race-lane">
        <span className="small muted">Geçen hafta</span>
        <div className="race-track">
          <div className="race-bar race-ghost" style={{ width: `${(r.lastWeekSoFar / max) * 100}%` }} />
        </div>
        <span className="small muted race-num">{r.lastWeekSoFar}</span>
      </div>
      <p className="small muted">{message}</p>
    </section>
  )
}
