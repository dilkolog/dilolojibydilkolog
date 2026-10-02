import { checkSentence, checkTyped, levenshtein, normalize, stripDiacritics } from './answerCheck'
import { acceptedForms, conjugate, PERSONS, PRONOUNS } from './conjugation'
import { detectIntrusion, trapGlosses, type Intrusion, type IntrusionSources } from './crossLanguage'
import { pick, shuffle, type Rng } from './rng'
import type {
  Direction,
  EngineOptions,
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
  /** Only offered when the AI layer is available to grade it. */
  requiresAI?: boolean
  /** Only offered when the browser can recognise speech. */
  requiresSpeech?: boolean
}

const hasExamples = (e: VocabularyEntry) => e.senses[0]?.examples.length > 0

const DEFINITE: Record<'fr' | 'es', { m: string; f: string }> = { fr: { m: 'le', f: 'la' }, es: { m: 'el', f: 'la' } }

/**
 * The definite article a FR/ES noun takes, or undefined when there is nothing to test (English,
 * not a noun, unknown or common gender). A written le/la/el is taken as is, so "el agua"
 * (feminine, but el) is still right; elided l' and indefinite articles fall back to the gender.
 */
export function definiteArticle(e: VocabularyEntry): string | undefined {
  if (e.language === 'en' || e.partOfSpeech !== 'noun') return undefined
  const forms = DEFINITE[e.language]
  if (e.article && (e.article === forms.m || e.article === forms.f)) return e.article
  if (e.gender === 'm' || e.gender === 'f') return forms[e.gender]
  return undefined
}
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
  picture_choice: {
    skill: 'recognition',
    direction: 'image_to_target',
    input: 'choice',
    expectedMs: 5000,
    applicable: (e) => !!e.imageId,
  },
  dictation: { skill: 'listening', direction: 'audio_to_target', input: 'typed', expectedMs: 20000, applicable: hasExamples },
  speak_word: {
    skill: 'recall',
    direction: 'native_to_target',
    input: 'typed',
    expectedMs: 6000,
    applicable: always,
    requiresSpeech: true,
  },
  article_choice: {
    skill: 'gender',
    direction: 'target_to_native',
    input: 'choice',
    expectedMs: 3000,
    applicable: (e) => definiteArticle(e) !== undefined,
  },
  conjugation: {
    skill: 'production',
    direction: 'native_to_target',
    input: 'typed',
    expectedMs: 6000,
    applicable: (e) => conjugate(e) !== undefined,
  },
  back_translation: {
    skill: 'production',
    direction: 'native_to_target',
    input: 'typed',
    expectedMs: 40000,
    applicable: (e) => e.senses[0].examples.some((x) => x.translation.trim()),
    requiresAI: true,
  },
  free_sentence: {
    skill: 'production',
    direction: 'native_to_target',
    input: 'typed',
    expectedMs: 45000,
    applicable: always,
    requiresAI: true,
  },
}

export function exerciseTypesFor(skill: Skill, entry: VocabularyEntry, opts: EngineOptions = {}): ExerciseType[] {
  return (Object.keys(EXERCISES) as ExerciseType[]).filter(
    (t) =>
      EXERCISES[t].skill === skill &&
      EXERCISES[t].applicable(entry) &&
      (!EXERCISES[t].requiresAI || opts.ai) &&
      (!EXERCISES[t].requiresSpeech || opts.speech),
  )
}

/**
 * Self-reference prompts: tying a new word to your own life makes it stick far better than a
 * neutral sentence (self-reference effect).
 */
export const PERSONAL_PROMPTS = [
  'Kendi hayatından bir şeyle ilgili olsun.',
  'Bugün ya da bu hafta yaşadığın bir şeyi anlat.',
  'Bir arkadaşına söyleyeceğin bir cümle olsun.',
  'Gelecekle ilgili bir planını anlat.',
  'Sevdiğin ya da sevmediğin bir şeyle ilgili olsun.',
  'Çocukluğundan bir anıyla ilgili olsun.',
]

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
  /** Media id of a picture to show (picture exercises). */
  imageId?: string
}

export interface ChoiceExercise extends ExerciseBase {
  kind: 'choice'
  options: ChoiceOption[]
  correctOptionId: string
  /** Options that are a false friend's meaning; picking one is a 'false_friend' error. */
  traps?: string[]
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

/** 0 = identical spelling, 1 = nothing in common. */
function spellingDistance(a: string, b: string): number {
  const x = stripDiacritics(normalize(a))
  const y = stripDiacritics(normalize(b))
  return levenshtein(x, y) / Math.max(x.length, y.length, 1)
}

/**
 * Distractors are chosen to be confusing, not random: words the learner is known to mix up
 * first, then look-alikes (affect/effect, désert/dessert), then the same part of speech, so the
 * answer can't be spotted by being the only verb. Synonyms are excluded — they'd also be right.
 */
export function pickDistractors(
  entry: VocabularyEntry,
  catalog: readonly VocabularyEntry[],
  count: number,
  rng: Rng,
): VocabularyEntry[] {
  const synonyms = new Set(entry.relations.filter((r) => r.type === 'synonym').map((r) => r.targetId))
  const confusable = new Set(entry.relations.filter((r) => r.type === 'confusable').map((r) => r.targetId))
  for (const c of catalog) {
    if (c.relations.some((r) => r.type === 'confusable' && r.targetId === entry.id)) confusable.add(c.id)
  }
  const gloss = normalize(entry.senses[0].gloss)
  const pool = catalog.filter(
    (c) =>
      c.id !== entry.id &&
      c.language === entry.language &&
      !synonyms.has(c.id) &&
      normalize(c.senses[0].gloss) !== gloss,
  )
  const noise = new Map(pool.map((c) => [c.id, rng() * 15]))
  const score = (c: VocabularyEntry) =>
    (confusable.has(c.id) ? 0 : 100) +
    (c.partOfSpeech === entry.partOfSpeech ? 0 : 40) +
    60 * spellingDistance(c.lemma, entry.lemma) +
    noise.get(c.id)!
  // Shuffle first so ties don't always produce the same distractors.
  const ranked = shuffle(pool, rng).sort((a, b) => score(a) - score(b))
  // Two distractors that are near-twins (an/année) let the learner eliminate both at once.
  const linked = (a: VocabularyEntry, b: VocabularyEntry) =>
    a.relations.some((r) => r.targetId === b.id) || b.relations.some((r) => r.targetId === a.id)
  const picked: VocabularyEntry[] = []
  for (const c of ranked) {
    if (picked.length >= count) break
    if (!picked.some((p) => linked(p, c) || normalize(p.senses[0].gloss) === normalize(c.senses[0].gloss))) picked.push(c)
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

/**
 * Last-resort Turkish meanings, used only when the vocabulary is too small to fill four options.
 * Grouped by part of speech so a filler is never an obvious odd one out.
 */
const FILLER_GLOSSES: Record<'noun' | 'verb' | 'adjective' | 'other', string[]> = {
  noun: ['kapı', 'deniz', 'anahtar', 'yolculuk', 'fikir', 'korku', 'sabah', 'pazar', 'gölge', 'kalabalık', 'sınav', 'hediye'],
  verb: ['beklemek', 'unutmak', 'taşımak', 'kaçınmak', 'denemek', 'sakınmak', 'kandırmak', 'ertelemek', 'yakalamak', 'paylaşmak'],
  adjective: ['yorgun', 'cesur', 'sessiz', 'tuhaf', 'kıskanç', 'hafif', 'karanlık', 'nazik', 'kararsız', 'dikkatli'],
  other: ['belki', 'hemen', 'aslında', 'zaten', 'yine de', 'neredeyse', 'birlikte', 'sonunda', 'hâlâ', 'özellikle'],
}

/**
 * Wrong meanings for a meaning question. A false friend's meaning goes first: it is the error
 * the learner is most likely to make, so it is the one worth practising against.
 */
function meaningOptions(entry: VocabularyEntry, catalog: readonly VocabularyEntry[], rng: Rng): string[] {
  const traps = trapGlosses(entry).slice(0, 1)
  const glosses = [...traps, ...pickDistractors(entry, catalog, OPTION_COUNT - 1, rng).map((d) => d.senses[0].gloss)]
    .filter((g, i, all) => all.findIndex((x) => normalize(x) === normalize(g)) === i)
    .slice(0, OPTION_COUNT - 1)
  const pos = entry.partOfSpeech === 'noun' || entry.partOfSpeech === 'verb' || entry.partOfSpeech === 'adjective' ? entry.partOfSpeech : 'other'
  const own = new Set([entry.senses[0].gloss, ...glosses].map(normalize))
  for (const f of shuffle(FILLER_GLOSSES[pos], rng)) {
    if (glosses.length >= OPTION_COUNT - 1) break
    if (!own.has(normalize(f))) glosses.push(f)
  }
  return glosses
}

function withTraps(ex: ChoiceExercise, entry: VocabularyEntry): ChoiceExercise {
  const traps = trapGlosses(entry).filter((t) => ex.options.some((o) => o.label === t))
  return traps.length ? { ...ex, traps } : ex
}

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
      return withTraps(choice({ ...base, prompt: answer }, sense.gloss, meaningOptions(entry, catalog, rng), rng), entry)

    case 'listen_choose':
      return withTraps(
        choice({ ...base, prompt: 'Duyduğun kelimenin anlamı ne?', audioText: answer }, sense.gloss, meaningOptions(entry, catalog, rng), rng),
        entry,
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
      // Pad with look-alikes so it's never a coin toss between two options.
      const lookAlikes = pickDistractors(entry, catalog, 2, rng).map((d) => d.senses[0].examples[0]?.form ?? d.lemma)
      return choice(
        { ...base, prompt: 'Hangisi doğru?', context: blankOut(ex), contextTranslation: ex.translation },
        ex.form,
        [...confusables, ...lookAlikes].slice(0, OPTION_COUNT - 1),
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

    case 'dictation': {
      const ex = chooseExample(entry, rng)!
      return {
        ...base,
        kind: 'typed',
        prompt: 'Duyduğun cümleyi yaz',
        audioText: ex.text,
        contextTranslation: ex.translation,
        accepted: [ex.text],
        hints: [ex.translation || sense.gloss, blankOut(ex)],
      }
    }

    case 'speak_word':
      return {
        ...base,
        kind: 'typed',
        prompt: sense.gloss,
        accepted,
        hints: buildHints(answer),
      }

    case 'picture_choice': {
      // Options are words in the target language; distractors' pictures are irrelevant here.
      const options = pickDistractors(entry, catalog, OPTION_COUNT - 1, rng).map(displayForm)
      return choice({ ...base, prompt: 'Bu resim hangi kelime?', imageId: entry.imageId }, answer, options, rng)
    }

    case 'free_sentence': {
      const ex = chooseExample(entry, rng)
      const col = entry.collocations[0]
      return {
        ...base,
        kind: 'typed',
        prompt: `"${answer}" ile bir cümle kur`,
        context: pick(PERSONAL_PROMPTS, rng),
        accepted: [],
        hints: [
          `Anlamı: ${sense.gloss}`,
          ...(col ? [`Kalıp: ${col.phrase}`] : []),
          ...(ex ? [`Örnek: ${ex.text}`] : []),
        ],
      }
    }

    case 'article_choice': {
      // Gender errors persist even at advanced levels; a fast, focused choice makes it automatic.
      const forms = DEFINITE[entry.language as 'fr' | 'es']
      const correct = definiteArticle(entry)!
      return {
        ...base,
        kind: 'choice',
        prompt: entry.lemma,
        context: sense.gloss,
        options: [forms.m, forms.f].map((label, i) => ({ id: String(i), label })),
        correctOptionId: correct === forms.m ? '0' : '1',
      }
    }

    case 'back_translation': {
      // Pushed output: producing a whole sentence shows what is missing in a way reading can't.
      const ex = pick(sense.examples.filter((x) => x.translation.trim()), rng)
      const words = ex.text.split(/\s+/)
      return {
        ...base,
        kind: 'typed',
        prompt: ex.translation,
        accepted: [ex.text],
        hints: [`Kelime: ${answer}`, `Başlangıç: ${words.slice(0, Math.min(3, Math.ceil(words.length / 3))).join(' ')}…`],
      }
    }

    case 'conjugation': {
      const conj = conjugate(entry)!
      const lang = entry.language as 'fr' | 'es'
      const person = pick(PERSONS, rng)
      const form = conj.forms[person]
      return {
        ...base,
        kind: 'typed',
        prompt: `${PRONOUNS[lang][person].slice(0, 2).join(' / ')} · ${conj.infinitive}`,
        context: `${sense.gloss}, ${lang === 'fr' ? 'présent' : 'presente'}`,
        accepted: acceptedForms(lang, person, form),
        hints: buildHints(form, `${conj.infinitive}: ${conj.forms.slice(0, 3).join(', ')}…`),
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

/**
 * Meaning question for a word seen for the first time (pretesting). Unlike review questions,
 * the options must not include words it is confused with or meanings that overlap: those are
 * hard on purpose for a known word, but unfair before the learner has seen it at all.
 */
export function buildPretest(entry: VocabularyEntry, catalog: readonly VocabularyEntry[], rng: Rng): ChoiceExercise {
  const gloss = normalize(entry.senses[0].gloss)
  const related = (c: VocabularyEntry) =>
    entry.relations.some((r) => r.targetId === c.id) || c.relations.some((r) => r.targetId === entry.id)
  const overlaps = (c: VocabularyEntry) => {
    const g = normalize(c.senses[0].gloss)
    return g.includes(gloss) || gloss.includes(g)
  }
  const fair = catalog.filter((c) => c.id === entry.id || (!related(c) && !overlaps(c)))
  return buildExercise('mc_meaning', entry, fair, rng) as ChoiceExercise
}

// ---------------------------------------------------------------------------
// Answer evaluation
// ---------------------------------------------------------------------------

export interface Evaluation {
  verdict: Verdict
  errorType?: ErrorType
  given: string
  expected: string
  /** The wrong answer was a word of another of the learner's languages. */
  intrusion?: Intrusion
}

const CHOICE_ERROR: Partial<Record<ExerciseType, ErrorType>> = {
  discriminate: 'confusion',
  collocation_choice: 'collocation',
  article_choice: 'gender',
}

export function evaluateChoice(ex: ChoiceExercise, optionId: string): Evaluation {
  const given = ex.options.find((o) => o.id === optionId)?.label ?? ''
  const expected = ex.options.find((o) => o.id === ex.correctOptionId)!.label
  if (optionId === ex.correctOptionId) return { verdict: 'correct', given, expected }
  if (ex.traps?.includes(given)) return { verdict: 'wrong', errorType: 'false_friend', given, expected }
  return { verdict: 'wrong', errorType: CHOICE_ERROR[ex.type] ?? 'meaning', given, expected }
}

export function evaluateTyped(
  ex: TypedExercise,
  text: string,
  entry: VocabularyEntry,
  catalog: readonly VocabularyEntry[],
  intrusionSources?: IntrusionSources,
): Evaluation {
  const result = evaluateTypedInner(ex, text, entry, catalog)
  // Only a plain miss is checked: a typo or accent slip is still the right word.
  if (result.verdict !== 'wrong' || result.errorType !== 'meaning' || !intrusionSources || ex.type === 'dictation') return result
  const intrusion = detectIntrusion(text, entry.language, intrusionSources)
  return intrusion ? { ...result, errorType: 'cross_language', intrusion } : result
}

function evaluateTypedInner(
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
  if (ex.type === 'dictation') {
    const s = checkSentence(text, ex.accepted[0], entry.language)
    return { verdict: s.verdict, errorType: s.errorType, given: normalize(text), expected: ex.accepted[0] }
  }
  if (ex.type === 'conjugation') {
    // Another person's form of the same verb: the verb was right, the ending wasn't.
    const forms = conjugate(entry)?.forms ?? []
    const r = checkTyped(text, ex.accepted, { language: entry.language, gender: entry.gender, confusables: [], familyForms: forms.filter((f) => !ex.accepted.includes(f)) })
    return { ...r, given: normalize(text), expected: ex.accepted[0] }
  }
  const r = checkTyped(text, ex.accepted, {
    language: entry.language,
    gender: entry.gender,
    confusables,
    familyForms,
  })
  return { ...r, given: normalize(text), expected: ex.accepted[0] }
}
