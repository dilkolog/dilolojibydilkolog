import { useEffect, useMemo, useState } from 'react'
import type { FriendView } from '../data/friends'
import { addLeagueWin, lastWeekLeague, teamWeek, TEAM_GOALS, type LeagueEntry } from '../engine/friendLeague'
import { ChevronDownIcon } from './icons'

const GOAL_KEY = 'diloloji:friend-goal'
const WINS_KEY = 'diloloji:league-wins'

const read = <T,>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}
const write = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Not remembered; fine.
  }
}

/**
 * Under the friends board: the group's goal for the week (everyone's XP added up) and last week's league (who
 * came first, from the XP of each card's last two weeks). A week the learner came first is remembered on this device.
 */
export function FriendLeague({ me, friends, nicknames, today }: { me: FriendView; friends: FriendView[]; nicknames: Record<string, string>; today: string }) {
  const [goal, setGoal] = useState<number>(() => {
    const g = read<number>(GOAL_KEY, 1000)
    return (TEAM_GOALS as readonly number[]).includes(g) ? g : 1000
  })
  const [wins, setWins] = useState<string[]>(() => read<string[]>(WINS_KEY, []))
  const entries = useMemo<LeagueEntry[]>(
    () => [{ code: me.code, name: 'Sen', me: true, days: me.days ?? {} }, ...friends.map((f) => ({ code: f.code, name: nicknames[f.code] || f.name, me: false, days: f.days ?? {} }))],
    [me, friends, nicknames],
  )
  const league = useMemo(() => lastWeekLeague(entries, today), [entries, today])
  const team = useMemo(() => teamWeek(entries, today, goal), [entries, today, goal])
  const iWon = !!league && league.winners.includes(me.code)

  // A week won is written down once.
  useEffect(() => {
    if (!league || !iWon) return
    setWins((cur) => {
      const next = addLeagueWin(cur, league.weekStart)
      if (next.length === cur.length) return cur
      write(WINS_KEY, next)
      return next
    })
  }, [league, iWon])

  const place = league ? league.rows.findIndex((r) => r.me) + 1 : 0
  return (
    <details className="friends-league">
      <summary className="friends-accordion-summary small">
        <span className="friends-accordion-title">
          <span className="friends-accordion-icon" aria-hidden="true">🎯</span>
          <span>Ortak hedef ve haftanın ligi</span>
        </span>
        <ChevronDownIcon size={16} className="friends-accordion-arrow" />
      </summary>
      <div className="stack gap-2 friends-league-body">
        <div className="stack gap-2">
          <p className="small">
            <strong>Bu hafta birlikte:</strong> {team.xp.toLocaleString('tr-TR')} / {team.goal.toLocaleString('tr-TR')} XP{team.done ? ' · hedef tamam 🎉' : ''}
          </p>
          <progress className="friends-progress" max={100} value={team.percent} aria-label={`Ortak hedef: yüzde ${team.percent}`} />
          <div className="choice-row" role="group" aria-label="Ortak haftalık hedef">
            {TEAM_GOALS.map((g) => (
              <button
                key={g}
                type="button"
                className="chip chip-sm"
                aria-pressed={goal === g}
                onClick={() => {
                  setGoal(g)
                  write(GOAL_KEY, g)
                }}
              >
                {g.toLocaleString('tr-TR')} XP
              </button>
            ))}
          </div>
          <p className="small muted">{team.parts.filter((p) => p.xp > 0).map((p) => `${p.name} ${p.xp.toLocaleString('tr-TR')}`).join(' · ') || 'Henüz kimse çalışmadı.'}</p>
        </div>
        <div className="stack gap-2">
          <p className="small">
            <strong>Geçen haftanın ligi</strong>
          </p>
          {league ? (
            <>
              <ol className="friends-podium">
                {league.rows.slice(0, 3).map((r, i) => (
                  <li key={r.code} className={r.me ? 'friends-me' : undefined}>
                    <span className="friends-rank">{['🥇', '🥈', '🥉'][i]}</span>
                    <span className="friends-name">{r.name}</span>
                    <span className="friends-xp">{r.xp.toLocaleString('tr-TR')} XP</span>
                  </li>
                ))}
              </ol>
              <p className="small" role="status">
                {iWon ? `🏆 Geçen haftanın birincisi sensin!${wins.length > 1 ? ` (${wins.length}. kez)` : ''}` : place > 3 ? `Geçen hafta ${place}. oldun.` : `Geçen hafta ${place}. oldun; bu hafta bir basamak yukarı.`}
              </p>
            </>
          ) : (
            <p className="small muted">Geçen hafta için sıralama yok (birlikte çalışılan bir hafta gerekir).</p>
          )}
          {wins.length > 0 && !iWon && <p className="small muted">Toplam {wins.length} hafta birinci oldun.</p>}
        </div>
      </div>
    </details>
  )
}
