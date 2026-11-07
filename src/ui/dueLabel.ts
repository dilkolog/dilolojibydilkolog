import type { UserWordState } from '../engine/types'

/**
 * What a list row says about when the word comes back. Only a word the learner retired is "emekli":
 * one that was introduced but never answered has no review date yet and is "yeni", not retired.
 */
export function dueLabel(state: UserWordState, due: Date | undefined, now: Date): string {
  if (state.retired) return 'emekli'
  return due ? dueShort(due, now) : 'yeni'
}

/** "bugün", "yarın", "5 gün", "12 Kas": short enough for the end of a list row. */
function dueShort(d: Date, now: Date): string {
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diff = Math.round((day(d) - day(now)) / 86_400_000)
  if (diff <= 0) return 'bugün'
  if (diff === 1) return 'yarın'
  if (diff < 30) return `${diff} gün`
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
}
