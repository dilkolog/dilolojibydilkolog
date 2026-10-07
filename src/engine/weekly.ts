import type { SeenForm } from './labProgress'
import type { TargetLanguage } from './types'

/** The last seven days of one language, from what is already recorded. */
export interface WeekSummary {
  /** Days with at least one answer. */
  days: number
  answers: number
  /** Share of answers that were right, 0–1. */
  right: number
  /** Words added to the list. */
  newWords: number
  /** Readings finished. */
  texts: number
  /** The verb met most in the week's readings. */
  topVerb?: { verb: string; count: number }
}

const WEEK = 7 * 86_400_000
const localDay = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`

export function weekSummary(input: {
  language: TargetLanguage
  now: Date
  events: readonly { timestamp: Date; correct: boolean; language: TargetLanguage }[]
  vocabulary: readonly { addedAt?: Date; source: string; language: TargetLanguage }[]
  texts: readonly { history: { at: string }[] }[]
  seen?: Record<string, SeenForm[]>
}): WeekSummary {
  const since = input.now.getTime() - WEEK
  const inWeek = (t: Date | string | undefined) => !!t && new Date(t).getTime() > since && new Date(t).getTime() <= input.now.getTime()
  const answers = input.events.filter((e) => e.language === input.language && inWeek(e.timestamp))
  const verbs = Object.entries(input.seen ?? {})
    .map(([verb, forms]) => ({ verb, count: forms.filter((f) => inWeek(f.at)).reduce((n, f) => n + f.count, 0) }))
    .filter((v) => v.count > 0)
    .sort((a, b) => b.count - a.count || a.verb.localeCompare(b.verb))
  return {
    days: new Set(answers.map((e) => localDay(new Date(e.timestamp)))).size,
    answers: answers.length,
    right: answers.length ? answers.filter((e) => e.correct).length / answers.length : 0,
    newWords: input.vocabulary.filter((v) => v.language === input.language && v.source !== 'sample' && inWeek(v.addedAt)).length,
    texts: input.texts.filter((t) => t.history.some((h) => inWeek(h.at))).length,
    ...(verbs[0] ? { topVerb: verbs[0] } : {}),
  }
}

/** One line for the week: "5 gün · 312 cevap (%86 doğru) · 18 yeni kelime · 2 metin · en çok: être". Empty for a week with nothing. */
export function weekLine(s: WeekSummary): string {
  if (!s.answers && !s.newWords && !s.texts) return ''
  return [
    s.answers ? `${s.days} gün · ${s.answers} cevap (%${Math.round(s.right * 100)} doğru)` : '',
    s.newWords ? `${s.newWords} yeni kelime` : '',
    s.texts ? `${s.texts} metin` : '',
    s.topVerb ? `en çok gördüğün fiil: ${s.topVerb.verb}` : '',
  ]
    .filter(Boolean)
    .join(' · ')
}
