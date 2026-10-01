import { checkTyped, normalize } from './answerCheck'
import { pick, shuffle, type Rng } from './rng'
import type {
  Direction,
  ErrorType,
  ExerciseType,
  Example,
  Skill,
  VocabularyEntry,
  Verdict,
} from './types'

export interface ExerciseMeta {
  skill: Skill
  direction: Direction
  input: 'choice' | 'typed'
  /** Typical time for a fluent answer; used by grading to detect effortful retrieval. */
  expectedMs: number
  /** Whether the entry has the data this exercise needs. */
  applicable: (entry: VocabularyEntry) => boolean
}

const hasExamples = (e: VocabularyEntry) => e.senses[0]?.examples.length > 0
const always = () => true

export const EXERCISES: Record<ExerciseType, ExerciseMeta> = {
  mc_meaning: { skill: 'recognition', direction: 'target_to_native', input: 'choice', expectedMs: 4000, applicable: always },
  mc_context: { skill: 'recognition', direction: 'context', input: 'choice', expectedMs: 7000, applicable: hasExamples },
  discriminate: {
    skill: 'recognition',
    direction: 'context',
    input: 'choice',
    expectedMs: 7000,
    applicable: (e) => hasExamples(e) && e.relations.some((r) => r.type === 'confusable'),
  },
  typed_translation: { skill: 'recall', direction: 'native_to_target', input: 'typed', expectedMs: 8000, applicable: always },
  cloze_typed: { skill: 'production', direction: 'context', input: 'typed', expectedMs: 12000, applicable: hasExamples },
  word_form: {
    skill: 'production',
    direction: 'native_to_target',
    input: 'typed',
    expectedMs: 10000,
    applicable: (e) => e.wordFamily.length > 0,
  },
  listen_choose: { skill: 'listening', direction: 'audio_to_native', input: 'choice', expectedMs: 6000, applicable: always },
  listen_type: { skill: 'listening', direction: 'audio_to_target', input: 'typed', expectedMs: 10000, applicable: always },
  collocation_choice: {
    skill: 'collocation',
    direction: 'native_to_target',
    input: 'choice',
    expectedMs: 8000,
    applicable: (e) => e.collocations.some((c) => (c.wrongVariants?.length ?? 0) > 0),
  },
}

export function exerciseTypesFor(skill: Skill, entry: VocabularyEntry): ExerciseType[] {
  return (Object.keys(EXERCISES) as ExerciseType[]).filter(
    (t) => EXERCISES[t].skill === skill && EXERCISES[t].applicable(entry),
  )
}

/** "la décision", "l'arbre", "abandon". */
export function displayForm(entry: VocabularyEntry): string {
  if (!entry.article) return entry.lemma
  return entry.article.endsWith("'") ? `${entry.article}${entry.lemma}` : `${entry.article} ${entry.lemma}`
}

// ---------------------------------------------------------------------------
// Exercise content
// ---------------------------------------------------------------------------

export interface ChoiceOption {
  id: string
  label: string
}

interface ExerciseBase {
  type: ExerciseType
  entryId: string
  skill: Skill
  /** Main prompt text (a word, a Turkish meaning, an instruction). */
  prompt: string
  /** Sentence with the target replaced by "___". */
  context?: string
  contextTranslation?: string
  /** Text the client should speak with TTS (listening exercises). */
  audioText?: string
}

export interface ChoiceExercise extends ExerciseBase {
  kind: 'choice'
  options: ChoiceOption[]
  correctOptionId: string
}

export interface TypedExercise extends ExerciseBase {
  kind: 'typed'
  accepted: string[]
  /** Revealed one at a time, never all up front (desirable difficulty). */
  hints: string[]
}

export type Exercise = ChoiceExercise | TypedExercise

/** Hints unlock only after a delay, so the user first makes a real retrieval attempt. */
export const HINT_DELAYS_MS = [6000, 12000, 18000]

export const BLANK = '___'

function blankOut(example: Example): string {
  const i = example.text.toLowerCase().indexOf(example.form.toLowerCase())
  if (i < 0) return example.text
  return example.text.slice(0, i) + BLANK + example.text.slice(i + example.form.length)
}

/** Rotate through examples so the same sentence isn't memorised as a shape (anti-flashcard). */
function chooseExample(entry: VocabularyEntry, rng: Rng): Example | undefined {
  const all = entry.senses.flatMap((s) => s.examples)
  return all.length ? pick(all, rng) : undefined
}

export function buildHints(answer: string, extra?: string): string[] {
  const letters = [...answer]
  const masked = (keep: (i: number) => boolean) =>
    letters.map((ch, i) => (ch === ' ' || ch === "'" || keep(i) ? ch : '_')).join(' ')
  const hints = [masked((i) => i === 0), masked((i) => i % 2 === 0)]
  if (extra) hints.push(extra)
  return hints
}

/**
 * Distractors come from the same language and part of speech with similar frequency, so the
 * correct option can't be spotted by being the only noun or the only rare word. Related words
 * (synonyms) are excluded because they could also be "correct".
 */
export function pickDistractors(
  entry: VocabularyEntry,
  catalog: readonly VocabularyEntry[],
  count: number,
  rng: Rng,
): VocabularyEntry[] {
  const related = new Set(entry.relations.filter((r) => r.type === 'synonym').map((r) => r.targetId))
  const gloss = normalize(entry.senses[0].gloss)
  const pool = catalog.filter(
    (c) =>
      c.id !== entry.id &&
      c.language === entry.language &&
      !related.has(c.id) &&
      normalize(c.senses[0].gloss) !== gloss,
  )
  const score = (c: VocabularyEntry) =>
    (c.partOfSpeech === entry.partOfSpeech ? 0 : 1000) + Math.abs(c.frequencyRank - entry.frequencyRank)
  // Shuffle first so ties don't always produce the same distractors.
  const ranked = shuffle(pool, rng).sort((a, b) => score(a) - score(b))
  // Two distractors that are near-twins (an/année) let the learner eliminate both at once.
  const linked = (a: VocabularyEntry, b: VocabularyEntry) =>
    a.relations.some((r) => r.targetId === b.id) || b.relations.some((r) => r.targetId === a.id)
  const picked: VocabularyEntry[] = []
  for (const c of ranked) {
    if (picked.length >= count) break
    if (!picked.some((p) => linked(p, c))) picked.push(c)
  }
  return picked
}

function choice(
  base: ExerciseBase,
  correct: string,
  distractors: string[],
  rng: Rng,
): ChoiceExercise {
  const unique = [...new Set(distractors.filter((d) => normalize(d) !== normalize(correct)))]
  const labels = shuffle([correct, ...unique], rng)
  const options = labels.map((label, i) => ({ id: String(i), label }))
  return {
    ...base,
    kind: 'choice',
    options,
    correctOptionId: options.find((o) => o.label === correct)!.id,
  }
}

const OPTION_COUNT = 4

export function buildExercise(
  type: ExerciseType,
  entry: VocabularyEntry,
  catalog: readonly VocabularyEntry[],
  rng: Rng,
): Exercise {
  const meta = EXERCISES[type]
  if (!meta.applicable(entry)) throw new Error(`${type} is not applicable to ${entry.id}`)
  const base = { type, entryId: entry.id, skill: meta.skill }
  const sense = entry.senses[0]
  const answer = displayForm(entry)
  const accepted = [answer, ...(entry.alternativeForms ?? [])]
  const distractors = () => pickDistractors(entry, catalog, OPTION_COUNT - 1, rng)

  switch (type) {
    case 'mc_meaning':
      return choice(
        { ...base, prompt: answer },
        sense.gloss,
        distractors().map((d) => d.senses[0].gloss),
        rng,
      )

    case 'listen_choose':
      return choice(
        { ...base, prompt: 'Duyduğun kelimenin anlamı ne?', audioText: answer },
        sense.gloss,
        distractors().map((d) => d.senses[0].gloss),
        rng,
      )

    case 'mc_context': {
      const ex = chooseExample(entry, rng)!
      return choice(
        { ...base, prompt: 'Boşluğa hangi kelime gelir?', context: blankOut(ex), contextTranslation: ex.translation },
        ex.form,
        distractors().map((d) => d.senses[0].examples[0]?.form ?? d.lemma),
        rng,
      )
    }

    case 'discriminate': {
      const ex = chooseExample(entry, rng)!
      const confusables = entry.relations
        .filter((r) => r.type === 'confusable')
        .map((r) => catalog.find((c) => c.id === r.targetId)?.lemma)
        .filter((l): l is string => !!l)
      return choice(
        { ...base, prompt: 'Hangisi doğru?', context: blankOut(ex), contextTranslation: ex.translation },
        ex.form,
        confusables,
        rng,
      )
    }

    case 'collocation_choice': {
      const col = pick(
        entry.collocations.filter((c) => (c.wrongVariants?.length ?? 0) > 0),
        rng,
      )
      return choice({ ...base, prompt: col.translation }, col.phrase, col.wrongVariants!, rng)
    }

    case 'typed_translation': {
      const ex = chooseExample(entry, rng)
      return {
        ...base,
        kind: 'typed',
        prompt: sense.gloss,
        accepted,
        hints: buildHints(answer, ex?.translation),
      }
    }

    case 'listen_type':
      return {
        ...base,
        kind: 'typed',
        prompt: 'Duyduğunu yaz',
        audioText: answer,
        accepted,
        hints: buildHints(answer, sense.gloss),
      }

    case 'cloze_typed': {
      const ex = chooseExample(entry, rng)!
      return {
        ...base,
        kind: 'typed',
        prompt: 'Boşluğu doğru biçimle doldur',
        context: blankOut(ex),
        contextTranslation: ex.translation,
        accepted: [ex.form],
        hints: buildHints(ex.form, `${entry.lemma} — ${sense.gloss}`),
      }
    }

    case 'word_form': {
      const member = pick(entry.wordFamily, rng)
      return {
        ...base,
        kind: 'typed',
        prompt: `${entry.lemma} → ${member.partOfSpeech} (${member.gloss})`,
        accepted: [member.lemma],
        hints: buildHints(member.lemma, member.morphology),
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Answer evaluation
// ---------------------------------------------------------------------------

export interface Evaluation {
  verdict: Verdict
  errorType?: ErrorType
  given: string
  expected: string
}

const CHOICE_ERROR: Partial<Record<ExerciseType, ErrorType>> = {
  discriminate: 'confusion',
  collocation_choice: 'collocation',
}

export function evaluateChoice(ex: ChoiceExercise, optionId: string): Evaluation {
  const given = ex.options.find((o) => o.id === optionId)?.label ?? ''
  const expected = ex.options.find((o) => o.id === ex.correctOptionId)!.label
  if (optionId === ex.correctOptionId) return { verdict: 'correct', given, expected }
  return { verdict: 'wrong', errorType: CHOICE_ERROR[ex.type] ?? 'meaning', given, expected }
}

export function evaluateTyped(
  ex: TypedExercise,
  text: string,
  entry: VocabularyEntry,
  catalog: readonly VocabularyEntry[],
): Evaluation {
  const confusables = entry.relations
    .filter((r) => r.type === 'confusable')
    .map((r) => catalog.find((c) => c.id === r.targetId)?.lemma)
    .filter((l): l is string => !!l)
  const familyForms = [entry.lemma, ...entry.wordFamily.map((m) => m.lemma)].filter(
    (f) => !ex.accepted.some((a) => normalize(a) === normalize(f)),
  )
  const r = checkTyped(text, ex.accepted, {
    language: entry.language,
    gender: entry.gender,
    confusables,
    familyForms,
  })
  return { ...r, given: normalize(text), expected: ex.accepted[0] }
}
