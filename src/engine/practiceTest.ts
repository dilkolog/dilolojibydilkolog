import { buildExercise, type ChoiceExercise, type TypedExercise } from './exercises'
import { shuffle, type Rng } from './rng'
import { buildStatements, type Statement } from './trueFalse'
import type { VocabularyEntry } from './types'

/**
 * A practice test of mixed questions over the words the learner picked: multiple choice, typing,
 * true/false and matching, as many kinds as were switched on, dealt round the words in turn.
 */
export type TestKind = 'choice' | 'typed' | 'truefalse' | 'match'

export const TEST_KIND_NAME: Record<TestKind, string> = {
  choice: 'Çoktan seçmeli',
  typed: 'Yazarak',
  truefalse: 'Doğru / yanlış',
  match: 'Eşleştirme',
}

export type TestQuestion =
  | { kind: 'choice'; entry: VocabularyEntry; exercise: ChoiceExercise }
  | { kind: 'typed'; entry: VocabularyEntry; exercise: TypedExercise }
  | { kind: 'truefalse'; entry: VocabularyEntry; statement: Statement }
  | { kind: 'match'; entries: VocabularyEntry[]; meanings: { id: string; label: string }[] }

/** Words in one matching question: enough to be a puzzle, few enough for a phone. */
export const MATCH_GROUP = 4

/** What a question is worth: one point, a matching question one per pair. */
export const pointsOf = (q: TestQuestion) => (q.kind === 'match' ? q.entries.length : 1)

/** The words a question is about. */
export const wordsOf = (q: TestQuestion) => (q.kind === 'match' ? q.entries : [q.entry])

export function buildTest(words: readonly VocabularyEntry[], pool: readonly VocabularyEntry[], kinds: readonly TestKind[], rng: Rng): TestQuestion[] {
  const on = kinds.length ? kinds : (['choice'] as TestKind[])
  const statements = new Map(buildStatements(words, pool, rng).map((s) => [s.entry.id, s]))
  const out: TestQuestion[] = []
  let turn = 0
  for (let i = 0; i < words.length; ) {
    const kind = on[turn++ % on.length]
    if (kind === 'match' && words.length - i >= 3) {
      const entries = words.slice(i, i + MATCH_GROUP)
      i += entries.length
      out.push({ kind: 'match', entries, meanings: shuffle(entries.map((e) => ({ id: e.id, label: e.senses[0].gloss })), rng) })
      continue
    }
    const entry = words[i++]
    if (kind === 'truefalse') out.push({ kind, entry, statement: statements.get(entry.id)! })
    else if (kind === 'typed') {
      try {
        out.push({ kind, entry, exercise: buildExercise('typed_translation', entry, pool, rng) as TypedExercise })
        continue
      } catch {
        /* a word that can't be typed from its meaning is asked as a choice */
      }
      out.push({ kind: 'choice', entry, exercise: buildExercise('mc_meaning', entry, pool, rng) as ChoiceExercise })
    } else out.push({ kind: 'choice', entry, exercise: buildExercise('mc_meaning', entry, pool, rng) as ChoiceExercise })
  }
  return out
}

export interface TestScore {
  points: number
  total: number
  /** Points per kind: [right, out of]. */
  byKind: Partial<Record<TestKind, [number, number]>>
}

/** `got[i]` is the points earned on question i. */
export function scoreTest(questions: readonly TestQuestion[], got: readonly number[]): TestScore {
  const byKind: TestScore['byKind'] = {}
  let points = 0
  let total = 0
  questions.forEach((q, i) => {
    const earned = got[i] ?? 0
    points += earned
    total += pointsOf(q)
    const row = byKind[q.kind] ?? [0, 0]
    byKind[q.kind] = [row[0] + earned, row[1] + pointsOf(q)]
  })
  return { points, total, byKind }
}
