import type { ErrorType, ExerciseType, ReviewEvent, TargetLanguage, VocabularyEntry } from './types'

/**
 * A month of wrong answers, condensed: how often each kind of error happened, which words and
 * answers keep coming back, and the raw lines an AI coach can read to name the patterns.
 */
export interface ErrorDigest {
  days: number
  answers: number
  wrong: number
  byType: { type: ErrorType; count: number }[]
  byExercise: { type: ExerciseType; wrong: number; total: number }[]
  /** Recurring slips: same word, same wrong answer. */
  recurring: { entryId: string; word: string; given: string; expected: string; type: ErrorType; count: number }[]
  /** One line per distinct error, most frequent first (for the AI). */
  lines: string[]
}

export function errorDigest(events: readonly ReviewEvent[], vocabulary: readonly VocabularyEntry[], language: TargetLanguage, now: Date, days = 30): ErrorDigest {
  const since = now.getTime() - days * 86_400_000
  const recent = events.filter((e) => e.language === language && e.mode === 'normal' && new Date(e.timestamp).getTime() >= since)
  const wrong = recent.filter((e) => e.verdict !== 'correct')
  const byId = new Map(vocabulary.map((v) => [v.id, v]))

  const typeCount = new Map<ErrorType, number>()
  for (const e of wrong) if (e.errorType) typeCount.set(e.errorType, (typeCount.get(e.errorType) ?? 0) + 1)

  const exercise = new Map<ExerciseType, { wrong: number; total: number }>()
  for (const e of recent) {
    const x = exercise.get(e.exerciseType) ?? { wrong: 0, total: 0 }
    x.total++
    if (e.verdict !== 'correct') x.wrong++
    exercise.set(e.exerciseType, x)
  }

  const groups = new Map<string, ErrorDigest['recurring'][number]>()
  for (const e of wrong) {
    const entry = byId.get(e.entryId)
    if (!entry || !e.errorType) continue
    const given = (e.given ?? '').trim()
    const key = `${e.entryId}|${e.errorType}|${given.toLocaleLowerCase()}`
    const g = groups.get(key) ?? { entryId: e.entryId, word: entry.lemma, given, expected: (e.expected ?? entry.lemma).trim(), type: e.errorType, count: 0 }
    g.count++
    groups.set(key, g)
  }
  const sorted = [...groups.values()].sort((a, b) => b.count - a.count)

  return {
    days,
    answers: recent.length,
    wrong: wrong.length,
    byType: [...typeCount.entries()].map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count),
    byExercise: [...exercise.entries()]
      .map(([type, x]) => ({ type, ...x }))
      .filter((x) => x.total >= 5)
      .sort((a, b) => b.wrong / b.total - a.wrong / a.total),
    recurring: sorted.filter((g) => g.count >= 2).slice(0, 8),
    lines: sorted.slice(0, 80).map((g) => `${g.word} [${g.type}]: wrote "${g.given || '(nothing)'}", expected "${g.expected}"${g.count > 1 ? ` ×${g.count}` : ''}`),
  }
}
