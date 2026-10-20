import { timeOf, type ReviewEvent, type TargetLanguage } from './types'

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
  /** Answers of the week before, to show the change. */
  lastAnswers: number
  /** Words answered wrong at least twice this week, the most missed first (at most three). */
  missed?: { entryId: string; wrong: number }[]
  /** The week's wrong answers by kind of error (meaning, gender, accent…). */
  errors?: Record<string, number>
}

/** Wrong twice in a week is a pattern; once is a slip. */
const MISSED_AT_LEAST = 2
const MISSED_SHOWN = 3

const WEEK = 7 * 86_400_000
const localDay = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`

export function weekSummary(input: {
  language: TargetLanguage
  now: Date
  events: readonly { timestamp: Date; correct: boolean; language: TargetLanguage; entryId?: string; mode?: string; errorType?: string }[]
  vocabulary: readonly { addedAt?: Date; source: string; language: TargetLanguage }[]
  texts: readonly { history: { at: string }[] }[]
}): WeekSummary {
  const since = input.now.getTime() - WEEK
  const inWeek = (t: Date | string | undefined) => !!t && new Date(t).getTime() > since && new Date(t).getTime() <= input.now.getTime()
  const answers = input.events.filter((e) => e.language === input.language && inWeek(e.timestamp))
  const before = input.now.getTime() - 2 * WEEK
  const lastAnswers = input.events.filter((e) => e.language === input.language && new Date(e.timestamp).getTime() > before && new Date(e.timestamp).getTime() <= since).length
  const wrong = new Map<string, number>()
  for (const e of answers) if (!e.correct && e.entryId && (e.mode ?? 'normal') === 'normal') wrong.set(e.entryId, (wrong.get(e.entryId) ?? 0) + 1)
  const missed = [...wrong.entries()]
    .filter(([, n]) => n >= MISSED_AT_LEAST)
    .map(([entryId, n]) => ({ entryId, wrong: n }))
    .sort((a, b) => b.wrong - a.wrong || a.entryId.localeCompare(b.entryId))
    .slice(0, MISSED_SHOWN)
  const errors: Record<string, number> = {}
  for (const e of answers) if (!e.correct && e.errorType) errors[e.errorType] = (errors[e.errorType] ?? 0) + 1
  return {
    // 168 hours can touch eight calendar days; the card says "of 7".
    days: Math.min(7, new Set(answers.map((e) => localDay(new Date(e.timestamp)))).size),
    answers: answers.length,
    right: answers.length ? answers.filter((e) => e.correct).length / answers.length : 0,
    newWords: input.vocabulary.filter((v) => v.language === input.language && v.source !== 'sample' && inWeek(v.addedAt)).length,
    texts: input.texts.filter((t) => t.history.some((h) => inWeek(h.at))).length,
    lastAnswers,
    ...(missed.length ? { missed } : {}),
    ...(Object.keys(errors).length ? { errors } : {}),
  }
}

/** A week worth a coach's remark: enough answers to see a pattern in. */
export const WEEK_NOTE_MIN_ANSWERS = 20

/**
 * The week as plain lines for the AI coach: the figures, the change from the week before, the kinds
 * of error, and the words missed most. Undefined for a week too thin to say anything about.
 */
export function weekDigest(s: WeekSummary, lemmaOf: (entryId: string) => string | undefined, errorName: (type: string) => string): string[] | undefined {
  if (s.answers < WEEK_NOTE_MIN_ANSWERS) return undefined
  const errors = Object.entries(s.errors ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([type, n]) => `${errorName(type)} ×${n}`)
  const missed = (s.missed ?? []).flatMap((m) => {
    const lemma = lemmaOf(m.entryId)
    return lemma ? [`${lemma} (${m.wrong} wrong)`] : []
  })
  return [
    `Days studied: ${s.days}/7. Answers: ${s.answers} (${Math.round(s.right * 100)}% right). Week before: ${s.lastAnswers} answers.`,
    `New words added: ${s.newWords}. Texts read: ${s.texts}.`,
    ...(errors.length ? [`Mistakes by kind: ${errors.join(', ')}.`] : []),
    ...(missed.length ? [`Words missed most: ${missed.join(', ')}.`] : []),
  ]
}

/** One line for the week: "5 gün · 312 cevap (%86 doğru) · 18 yeni kelime · 2 metin · bu hafta 17 kelime daha". Empty for a week with nothing. */
export function weekLine(s: WeekSummary, goalWords?: number): string {
  if (!s.answers && !s.newWords && !s.texts && !goalWords) return ''
  let goalClause = ''
  if (goalWords && goalWords > 0) {
    if (s.newWords >= goalWords) {
      goalClause = 'haftalık hedefe ulaşıldı'
    } else {
      goalClause = `bu hafta ${goalWords - s.newWords} kelime daha`
    }
  }
  return [
    s.answers ? `${s.days} gün · ${s.answers} cevap (%${Math.round(s.right * 100)} doğru)` : '',
    s.newWords ? `${s.newWords} yeni kelime` : '',
    s.texts ? `${s.texts} metin` : '',
    goalClause,
  ]
    .filter(Boolean)
    .join(' · ')
}

/** How the week compares with the one before, in a few words. */
export function weekChange(answers: number, last: number): string {
  if (!answers) return ''
  if (!last) return 'Geçen hafta hiç çalışmamıştın; bu hafta güzel bir başlangıç.'
  const pct = Math.round(((answers - last) / last) * 100)
  if (pct === 0) return 'Geçen haftayla aynı tempodasın.'
  return pct > 0 ? `Geçen haftadan %${pct} daha fazla cevap verdin.` : `Geçen haftanın %${Math.round((answers / last) * 100)}'i kadar cevap verdin.`
}

/** How many of the week's missed words one round takes back: about five minutes. */
export const WEEK_MISSES_ROUND = 12

/**
 * The words answered wrong in the last seven days (in one language), most missed first, then the
 * most recently missed: put right since or not, a slip from this week is the one most worth meeting
 * again before it settles. Practice answers count too; an introduction does not (nothing to miss yet).
 */
export function weekMisses(events: readonly ReviewEvent[], language: string, now: Date, limit = WEEK_MISSES_ROUND): string[] {
  const since = now.getTime() - 7 * 86_400_000
  const by = new Map<string, { wrong: number; last: number }>()
  for (const e of events) {
    if (e.language !== language || e.verdict !== 'wrong') continue
    const at = timeOf(e.timestamp)
    if (at < since || at > now.getTime()) continue
    const m = by.get(e.entryId) ?? { wrong: 0, last: 0 }
    m.wrong++
    m.last = Math.max(m.last, at)
    by.set(e.entryId, m)
  }
  return [...by.entries()]
    .sort((a, b) => b[1].wrong - a[1].wrong || b[1].last - a[1].last || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([id]) => id)
}
