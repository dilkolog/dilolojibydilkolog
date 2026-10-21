/**
 * The weekly league among the learner and the friends, and the team goal for the week: both are worked out
 * from the XP-by-day each friend's card carries (the last two weeks), so nothing more is stored on a server.
 */
export interface LeagueEntry {
  code: string
  name: string
  me: boolean
  /** XP by local date. */
  days: Record<string, number>
}

const shift = (day: string, by: number) => {
  const d = new Date(`${day}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + by)
  return d.toISOString().slice(0, 10)
}

/** The Monday of the week a date is in (weeks run Monday to Sunday). */
export function weekStartOf(day: string): string {
  const dow = new Date(`${day}T12:00:00Z`).getUTCDay()
  return shift(day, -((dow + 6) % 7))
}

/** XP over `from`…`to` (both days included). */
export const xpBetween = (days: Record<string, number>, from: string, to: string) => Object.entries(days).reduce((n, [d, xp]) => (d >= from && d <= to ? n + xp : n), 0)

export interface LeagueRow {
  code: string
  name: string
  me: boolean
  xp: number
}

export interface League {
  weekStart: string
  weekEnd: string
  rows: LeagueRow[]
  /** Who came first; more than one when the XP is the same. Empty when nobody studied. */
  winners: string[]
}

/**
 * Last week's standings: Monday to Sunday of the week before the one `today` is in. null when there is no one
 * to compare with or nobody studied that week. (A card keeps fourteen days, which always holds that whole week.)
 */
export function lastWeekLeague(entries: readonly LeagueEntry[], today: string): League | null {
  if (entries.length < 2) return null
  const weekStart = shift(weekStartOf(today), -7)
  const weekEnd = shift(weekStart, 6)
  const rows = entries
    .map((e) => ({ code: e.code, name: e.name, me: e.me, xp: xpBetween(e.days, weekStart, weekEnd) }))
    .sort((a, b) => b.xp - a.xp || Number(b.me) - Number(a.me) || a.name.localeCompare(b.name, 'tr'))
  const top = rows[0].xp
  if (top <= 0) return null
  return { weekStart, weekEnd, rows, winners: rows.filter((r) => r.xp === top).map((r) => r.code) }
}

/** The week-start dates the learner came first, newest first, each once. */
export function addLeagueWin(weeks: readonly string[], weekStart: string): string[] {
  return weeks.includes(weekStart) ? [...weeks] : [weekStart, ...weeks].slice(0, 200)
}

export interface TeamWeek {
  /** XP from Monday to today, all the players together. */
  xp: number
  goal: number
  percent: number
  done: boolean
  /** Whose XP it is, most first. */
  parts: { name: string; me: boolean; xp: number }[]
}

/** The team goal's progress this week: everyone's XP from Monday up to today against the goal. */
export function teamWeek(entries: readonly LeagueEntry[], today: string, goal: number): TeamWeek {
  const start = weekStartOf(today)
  const parts = entries.map((e) => ({ name: e.name, me: e.me, xp: xpBetween(e.days, start, today) })).sort((a, b) => b.xp - a.xp)
  const xp = parts.reduce((n, p) => n + p.xp, 0)
  return { xp, goal, percent: goal > 0 ? Math.min(100, Math.round((xp / goal) * 100)) : 0, done: goal > 0 && xp >= goal, parts }
}

/** Goals to choose from, in XP for the whole group in a week. */
export const TEAM_GOALS = [500, 1000, 2500, 5000] as const

/** From this share of the shared goal on (and until it is reached), the group can be given a last push. */
export const TEAM_PUSH_PERCENT = 80
/** At most this many friends are nudged at once (the server allows 20 messages a minute). */
export const TEAM_PUSH_MAX = 10

/** Whether the "last push" is on offer: the goal is close but not reached, and it was not sent this week already. */
export const teamPushDue = (team: TeamWeek, today: string, sentWeek: string | null): boolean => team.goal > 0 && !team.done && team.percent >= TEAM_PUSH_PERCENT && sentWeek !== weekStartOf(today)

/** The friends a last push goes to: those who have not studied today (a nudge is only for them). */
export const teamPushTargets = <T extends { code: string; days?: Record<string, number> }>(friends: readonly T[], today: string): T[] => friends.filter((f) => !(f.days?.[today] ?? 0)).slice(0, TEAM_PUSH_MAX)
