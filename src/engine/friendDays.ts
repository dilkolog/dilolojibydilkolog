import { localDate } from './progress'

/** How many days a friend's page shows. */
export const FRIEND_DAYS = 14

/** The last `FRIEND_DAYS` local dates up to `today`, oldest first, with the XP the card has for each. */
export function lastDays(days: Record<string, number>, today: string): { day: string; xp: number }[] {
  const end = new Date(`${today}T12:00:00`)
  return Array.from({ length: FRIEND_DAYS }, (_, i) => {
    const d = new Date(end)
    d.setDate(end.getDate() - (FRIEND_DAYS - 1 - i))
    const day = localDate(d)
    return { day, xp: days[day] ?? 0 }
  })
}
