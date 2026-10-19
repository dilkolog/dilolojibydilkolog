/** "bugün 14:47", "yarın 09:00", "cumartesi 10:15", "12 Ekim" */
export function relativeTime(d: Date, now = new Date()): string {
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diff = Math.round((day(d) - day(now)) / 86_400_000)
  const time = d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
  if (diff <= 0) return `bugün ${time}`
  if (diff === 1) return `yarın ${time}`
  if (diff < 7) return `${d.toLocaleDateString('tr-TR', { weekday: 'long' }).toLocaleLowerCase('tr-TR')} ${time}`
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })
}

/** A day (yyyy-mm-dd) as the learner counts it: "bugün", "dün", "3 gün önce". Only the day is known, so no time of day is made up. */
export function dayAgo(day: string, now = new Date()): string {
  const [y, m, d] = day.split('-').map(Number)
  const then = new Date(y, m - 1, d)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const n = Math.max(0, Math.round((today.getTime() - then.getTime()) / 86_400_000))
  return n === 0 ? 'bugün' : n === 1 ? 'dün' : `${n} gün önce`
}
