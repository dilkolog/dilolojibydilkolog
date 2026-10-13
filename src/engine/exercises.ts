import { checkSentence, checkTyped, levenshtein, normalize, stripDiacritics } from './answerCheck'
import { PERSONS } from './conjugation'
import { TENSE_GUIDE } from './tenseGuide'
import { answersFor, aspectItemsFor, conjugateTense, subjectLabel, tenseSentence, tensesOf, tenseVariants, unlockedTenses, type Tense } from './tenses'
import { detectIntrusion, trapGlosses, type Intrusion, type IntrusionSources } from './crossLanguage'
import { pick, shuffle, type Rng } from './rng'
import { sweetSpot } from './sentenceFit'
import { familyRelative, suffixVariants } from './morphology'
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

/** A sentence with the word in it, which can be blanked out (a pasted sentence may lack the word). */
const hasForm = (x: Example) => !!x.form
const hasExamples = (e: VocabularyEntry) => !!e.senses[0]?.examples.some(hasForm) || !!e.corpus?.length
const hasSentences = (e: VocabularyEntry) => e.senses[0]?.examples.length > 0 || !!e.corpus?.length

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
  // Which past: the time words in the sentence settle it (hier → passé composé). Only for verbs
  // with such sentences, and only once the word is produced (see buildDailyPlan / the context).
  aspect_choice: {
    skill: 'production',
    direction: 'context',
    input: 'choice',
    expectedMs: 7000,
    applicable: (e) => e.partOfSpeech === 'verb' && aspectItemsFor(e).length > 0,
  },
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
  dictation: { skill: 'listening', direction: 'audio_to_target', input: 'typed', expectedMs: 20000, applicable: hasSentences },
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
    applicable: (e) => tensesOf(e).length > 0,
  },
  back_translation: {
    skill: 'production',
    direction: 'native_to_target',
    input: 'typed',
    expectedMs: 40000,
    applicable: (e) => e.senses[0].examples.some((x) => x.translation.trim()),
    requiresAI: true,
  },
  family_choice: {
    skill: 'recall',
    direction: 'native_to_target',
    input: 'choice',
    expectedMs: 6000,
    applicable: (e) => !!familyRelative(e) && !e.lemma.includes(' ') && suffixVariants(e.lemma, e.language).length >= 3,
  },
  idiom_complete: {
    skill: 'collocation',
    direction: 'context',
    input: 'choice',
    expectedMs: 6000,
    applicable: (e) => e.partOfSpeech === 'phrase' && e.lemma.trim().split(/\s+/).length >= 2,
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

/** A meaning of this many words (or characters) is a definition rather than a translation. */
export const LONG_GLOSS_WORDS = 7
export const LONG_GLOSS_CHARS = 60
export const hasLongGloss = (entry: VocabularyEntry) => {
  const gloss = entry.senses[0]?.gloss.trim() ?? ''
  return gloss.split(/\s+/).filter(Boolean).length > LONG_GLOSS_WORDS || gloss.length > LONG_GLOSS_CHARS
}
/** The questions that put the meaning itself on screen as what is asked (a long one is a wall of text to read and then to answer from). */
const GLOSS_QUESTIONS: readonly ExerciseType[] = ['typed_translation', 'speak_word', 'family_choice']

/** Whether the learner's settings keep this kind of question from this word: switched off, or a meaning too long to be asked from. */
export const blockedByPrefs = (type: ExerciseType, entry: VocabularyEntry, opts: EngineOptions = {}) =>
  !!opts.off?.includes(type) || (!!opts.skipLong && GLOSS_QUESTIONS.includes(type) && hasLongGloss(entry))

export function exerciseTypesFor(skill: Skill, entry: VocabularyEntry, opts: EngineOptions = {}): ExerciseType[] {
  return (Object.keys(EXERCISES) as ExerciseType[]).filter(
    (t) =>
      EXERCISES[t].skill === skill &&
      EXERCISES[t].applicable(entry) &&
      (!EXERCISES[t].requiresAI || opts.ai) &&
      (!EXERCISES[t].requiresSpeech || opts.speech) &&
      !blockedByPrefs(t, entry, opts),
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
  /** Letters shown at the start of the blank (a first-letter cue). */
  blankStart?: string
  /** Where the sentence comes from, when it is the learner's own (a text they read, their sentence). */
  contextSource?: ContextSource
  /** Text the client should speak with TTS (listening exercises). */
  audioText?: string
  /** Media id of a picture to show (picture exercises). */
  imageId?: string
  /** The tense a conjugation question asks for. */
  tense?: Tense
  /** The time words that settle a past-tense choice ("hier"), named in the feedback. */
  cue?: string
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

export const BLANK = '___'

function blankOut(example: Example): string {
  if (!example.form) return example.text
  const i = example.text.toLowerCase().indexOf(example.form.toLowerCase())
  if (i < 0) return example.text
  return example.text.slice(0, i) + BLANK + example.text.slice(i + example.form.length)
}

/**
 * Rotate through examples so the same sentence isn't memorised as a shape (anti-flashcard).
 * Half the time a real corpus sentence, so the word keeps turning up in new contexts.
 */
/**
 * A sentence the learner met or wrote is remembered with where it came from (self-reference
 * effect; Rogers et al. 1977), so the question says so. Bundled and corpus sentences say nothing.
 */
export interface ContextSource {
  kind: 'reading' | 'own' | 'added'
  text: string
}

export function exampleSource(ex: Example, entry: VocabularyEntry): ContextSource | undefined {
  if (ex.metIn) return { kind: 'reading', text: `Okuduğun metinden: ${ex.metIn}` }
  if (ex.personal) return { kind: 'own', text: 'Kendi cümlen' }
  if (ex.source || entry.source === 'sample' || !entry.senses[0].examples.includes(ex)) return undefined
  return { kind: 'added', text: 'Eklediğin cümle' }
}

function chooseExample(entry: VocabularyEntry, rng: Rng, needForm = true): Example | undefined {
  const own = entry.senses.flatMap((s) => s.examples).filter((x) => !needForm || hasForm(x))
  const corpus = entry.corpus ?? []
  // Real sentences with at most one word the learner doesn't know come first (i + 1), when there are any.
  if (corpus.length && (!own.length || rng() < 0.5)) return pick(sweetSpot(corpus), rng)
  return own.length ? pick(own, rng) : undefined
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

/** Writes a word with the same initial case as `model`, so a capital never singles out an option. */
export function matchCase(word: string, model: string): string {
  const first = model.charAt(0)
  if (!word || first.toLowerCase() === first.toUpperCase()) return word
  // Acronyms (ONU, NASA) keep their capitals.
  if (word.length > 1 && word === word.toUpperCase() && word !== word.toLowerCase()) return word
  const upper = first !== first.toLowerCase()
  return (upper ? word.charAt(0).toUpperCase() : word.charAt(0).toLowerCase()) + word.slice(1)
}

const sameCase = (options: readonly string[], model: string) => options.map((o) => matchCase(o, model))

const VOWEL_START = /^[aeiouyhàâäéèêëîïôöûüœæ]/i

/** What the word before a blank says about the word that fills it. */
export interface Slot {
  /** Must start with a vowel (French l'/d'/qu', English "an") or with a consonant (le, la, "a"). */
  start?: 'vowel' | 'consonant'
  gender?: 'm' | 'f'
  /** Comes right after a determiner, so a noun (or an adjective before one) is expected. */
  afterDeterminer?: boolean
}

const DETERMINERS: Record<VocabularyEntry['language'], Record<string, Slot>> = {
  fr: {
    le: { start: 'consonant', gender: 'm' }, la: { start: 'consonant', gender: 'f' }, les: {}, un: { gender: 'm' }, une: { gender: 'f' }, des: {},
    du: { start: 'consonant', gender: 'm' }, au: { start: 'consonant', gender: 'm' }, aux: {}, ce: { start: 'consonant', gender: 'm' }, cet: { start: 'vowel', gender: 'm' },
    cette: { gender: 'f' }, ces: {}, mon: {}, ton: {}, son: {}, ma: { start: 'consonant', gender: 'f' }, ta: { start: 'consonant', gender: 'f' },
    sa: { start: 'consonant', gender: 'f' }, mes: {}, tes: {}, ses: {}, notre: {}, votre: {}, nos: {}, vos: {}, leur: {}, leurs: {}, chaque: {}, quelques: {},
  },
  es: {
    el: { gender: 'm' }, la: { gender: 'f' }, los: { gender: 'm' }, las: { gender: 'f' }, un: { gender: 'm' }, una: { gender: 'f' }, unos: { gender: 'm' },
    unas: { gender: 'f' }, del: { gender: 'm' }, al: { gender: 'm' }, este: { gender: 'm' }, esta: { gender: 'f' }, estos: { gender: 'm' }, estas: { gender: 'f' },
    ese: { gender: 'm' }, esa: { gender: 'f' }, mi: {}, tu: {}, su: {}, mis: {}, tus: {}, sus: {}, nuestro: { gender: 'm' }, nuestra: { gender: 'f' }, cada: {},
  },
  en: {
    a: { start: 'consonant' }, an: { start: 'vowel' }, the: {}, this: {}, that: {}, these: {}, those: {}, my: {}, your: {}, his: {}, her: {}, its: {}, our: {},
    their: {}, every: {}, each: {},
  },
}

/** Reads the word right before the blank: an elided l', an article, a possessive. */
export function slotOf(example: Example, language: VocabularyEntry['language']): Slot {
  const i = example.text.toLowerCase().indexOf(example.form.toLowerCase())
  if (i <= 0) return {}
  const before = example.text.slice(0, i)
  // Elision (l'asile, d'abord, qu'il): only a vowel or a mute h can follow.
  if (language === 'fr' && /\p{L}['’]$/u.test(before)) {
    const elided = before.match(/(\p{L}+)['’]$/u)![1].toLowerCase()
    return { start: 'vowel', afterDeterminer: elided === 'l' }
  }
  const word = before.match(/(\p{L}+)\s+$/u)?.[1].toLowerCase()
  const det = word ? DETERMINERS[language][word] : undefined
  return det ? { ...det, afterDeterminer: true } : {}
}

/**
 * Part of speech as far as it is known: an entry with an article or gender is a noun; "other"
 * (nothing could be guessed when it was added) counts as unknown, except French -é/-ée participles.
 */
function knownPos(e: VocabularyEntry): VocabularyEntry['partOfSpeech'] | undefined {
  if (e.partOfSpeech !== 'other') return e.partOfSpeech
  if (e.article || e.gender === 'm' || e.gender === 'f') return 'noun'
  if (e.language === 'fr' && /ée?s?$/.test(e.lemma) && !e.lemma.includes(' ')) return 'adjective'
  return undefined
}

/** Whether a word could grammatically fill the slot (first letter after l'/an/le, noun gender). */
function fitsSlot(c: VocabularyEntry, slot: Slot): boolean {
  if (slot.start) {
    const first = c.lemma.trim()
    // An English "a" before a vowel letter is still possible (a university), so only "an" is strict.
    if (slot.start === 'vowel' ? !VOWEL_START.test(first) : c.language !== 'en' && VOWEL_START.test(first) && !/^h/i.test(first)) return false
  }
  if (slot.gender && (c.gender === 'm' || c.gender === 'f') && c.gender !== slot.gender) return false
  return true
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
  /**
   * For a blank in a sentence: a word of another part of speech is ruled out by grammar alone, and
   * so is one the word before the blank doesn't allow (l' + consonant, la + masculine noun).
   */
  { inContext = false, slot }: { inContext?: boolean; slot?: Slot } = {},
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
  const want = slot?.afterDeterminer && !knownPos(entry) ? 'noun' : knownPos(entry)
  const posCost = (c: VocabularyEntry) => {
    const pos = knownPos(c)
    if (pos === want) return 0
    // In a sentence, an unknown part of speech is a gamble; a known different one gives the answer away.
    if (!pos || !want) return inContext ? 150 : 20
    return inContext ? 300 : 40
  }
  const score = (c: VocabularyEntry) =>
    (confusable.has(c.id) ? 0 : 100) +
    posCost(c) +
    (slot && !fitsSlot(c, slot) ? 250 : 0) +
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

/**
 * Distractor forms for a blank: base forms when the answer is a base form, otherwise an inflected
 * form of each distractor where one is known, so the ending doesn't single out the answer.
 */
export function contextForms(entry: VocabularyEntry, answerForm: string, distractors: readonly VocabularyEntry[]): string[] {
  const inflected = normalize(answerForm) !== normalize(entry.lemma)
  const answer = normalize(answerForm)
  return distractors
    .map((d) => {
      if (!inflected) return d.lemma
      const forms = [...d.senses[0].examples, ...(d.corpus ?? [])].map((x) => x.form).filter((f): f is string => !!f && normalize(f) !== normalize(d.lemma))
      // Prefer a form ending like the answer (lente → a feminine -e form).
      return forms.find((f) => f.slice(-1) === answerForm.slice(-1)) ?? forms[0] ?? d.lemma
    })
    .filter((f) => normalize(f) !== answer)
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

/** Particles of English phrasal verbs: the part learners mix up (give up / give in / give out). */
const PARTICLES = ['up', 'down', 'in', 'out', 'off', 'on', 'over', 'away', 'back', 'through', 'around', 'along', 'into']

/**
 * Which word of an idiom to blank out, and three wrong options. Phrasal verbs lose their
 * particle; other idioms lose their longest word, replaced by words from other idioms or the list.
 */
export function idiomGap(entry: VocabularyEntry, catalog: readonly VocabularyEntry[], rng: Rng): { words: string[]; blank: number; options: string[] } {
  const words = entry.lemma.trim().split(/\s+/)
  const particleAt = entry.language === 'en' ? words.findIndex((w, i) => i > 0 && PARTICLES.includes(w.toLowerCase())) : -1
  if (particleAt >= 0) {
    const options = shuffle(PARTICLES.filter((p) => p !== words[particleAt].toLowerCase()), rng).slice(0, OPTION_COUNT - 1)
    return { words, blank: particleAt, options }
  }
  const blank = words.reduce((best, w, i) => (w.replace(/[^\p{L}]/gu, '').length > words[best].replace(/[^\p{L}]/gu, '').length ? i : best), 0)
  const target = words[blank].toLowerCase()
  const pool = [
    ...catalog.filter((c) => c.id !== entry.id && c.language === entry.language && c.partOfSpeech === 'phrase').flatMap((c) => c.lemma.split(/\s+/)),
    ...catalog.filter((c) => c.id !== entry.id && c.language === entry.language && !c.lemma.includes(' ')).map((c) => c.lemma),
  ].filter((w) => w.length >= 3 && w.toLowerCase() !== target)
  // Words close in length to the missing one, so length gives nothing away.
  const options = [...new Set(shuffle(pool, rng).sort((a, b) => Math.abs(a.length - target.length) - Math.abs(b.length - target.length)))].slice(0, OPTION_COUNT - 1)
  return { words, blank, options }
}

function withTraps(ex: ChoiceExercise, entry: VocabularyEntry): ChoiceExercise {
  const traps = trapGlosses(entry).filter((t) => ex.options.some((o) => o.label === t))
  return traps.length ? { ...ex, traps } : ex
}

/** What the learner has done with the word so far, for exercises that grow with it. */
export interface ExerciseContext {
  /** Correct productions so far (the production card's reps): opens past and future tenses. */
  productionReps?: number
  /** Persons not to ask (4 = vosotros, for learners of Latin American Spanish). */
  skipPersons?: number[]
}

export function buildExercise(
  type: ExerciseType,
  entry: VocabularyEntry,
  catalog: readonly VocabularyEntry[],
  rng: Rng,
  context: ExerciseContext = {},
): Exercise {
  const meta = EXERCISES[type]
  if (!meta.applicable(entry)) throw new Error(`${type} is not applicable to ${entry.id}`)
  const base = { type, entryId: entry.id, skill: meta.skill }
  const sense = entry.senses[0]
  const answer = displayForm(entry)
  const accepted = [answer, ...(entry.alternativeForms ?? [])]

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
      const slot = slotOf(ex, entry.language)
      return choice(
        { ...base, prompt: 'Boşluğa hangi kelime gelir?', context: blankOut(ex), contextTranslation: ex.translation, contextSource: exampleSource(ex, entry) },
        ex.form,
        sameCase(contextForms(entry, ex.form, pickDistractors(entry, catalog, OPTION_COUNT - 1, rng, { inContext: true, slot })), ex.form),
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
      const lookAlikes = pickDistractors(entry, catalog, 2, rng, { slot: slotOf(ex, entry.language) }).map((d) => d.senses[0].examples.find(hasForm)?.form ?? d.lemma)
      return choice(
        { ...base, prompt: 'Hangisi doğru?', context: blankOut(ex), contextTranslation: ex.translation, contextSource: exampleSource(ex, entry) },
        ex.form,
        sameCase([...confusables, ...lookAlikes].slice(0, OPTION_COUNT - 1), ex.form),
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
        contextSource: exampleSource(ex, entry),
        accepted: [ex.form],
        hints: buildHints(ex.form, `${entry.lemma} — ${sense.gloss}`),
      }
    }

    case 'dictation': {
      const ex = chooseExample(entry, rng, false)!
      return {
        ...base,
        kind: 'typed',
        prompt: 'Duyduğun cümleyi yaz',
        audioText: ex.text,
        contextTranslation: ex.translation,
        accepted: [ex.text],
        hints: ex.form ? [ex.translation || sense.gloss, blankOut(ex)] : [ex.translation || sense.gloss],
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
      const options = sameCase(pickDistractors(entry, catalog, OPTION_COUNT - 1, rng).map(displayForm), answer)
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

    case 'family_choice': {
      const relative = familyRelative(entry)!
      return choice({ ...base, prompt: `“${sense.gloss}” anlamındaki kelime hangisi?`, context: `${relative.lemma} (${relative.gloss}) ailesinden` }, entry.lemma, suffixVariants(entry.lemma, entry.language), rng)
    }

    case 'idiom_complete': {
      const { words, blank, options } = idiomGap(entry, catalog, rng)
      const correct = words[blank]
      return choice(
        { ...base, prompt: words.map((w, i) => (i === blank ? BLANK : w)).join(' '), context: sense.gloss },
        correct,
        options,
        rng,
      )
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
      const lang = entry.language as 'fr' | 'es'
      const open = unlockedTenses(entry, context.productionReps ?? 0)
      // The newest tense comes up more often while it is new; the others keep coming back.
      const tense: Tense = open.length > 1 && rng() < 0.4 ? open[open.length - 1] : pick(open, rng)
      const forms = conjugateTense(entry, tense)!
      const guide = TENSE_GUIDE[tense]
      // In a sentence when there is one: the time words around the blank call for the tense.
      const sentence = tenseSentence(entry, tense)
      if (sentence && rng() < 0.6)
        return {
          ...base,
          kind: 'typed',
          prompt: `${entry.lemma} · ${guide.name}`,
          context: sentence.text,
          contextTranslation: sentence.translation,
          tense,
          accepted: [sentence.form, ...tenseVariants(lang, sentence.form)],
          hints: buildHints(sentence.form, guide.short),
        }
      const person = pick(entry.language === 'es' && context.skipPersons?.length ? PERSONS.filter((p) => !context.skipPersons!.includes(p)) : PERSONS, rng)
      return {
        ...base,
        kind: 'typed',
        prompt: `${subjectLabel(lang, tense, person)} · ${entry.lemma}`,
        context: `${sense.gloss} · ${guide.name} (${guide.tr.toLocaleLowerCase('tr')})`,
        tense,
        accepted: answersFor(entry, tense, person),
        hints: buildHints(forms[person], `${guide.name}: ${forms.slice(0, 3).join(', ')}…`),
      }
    }

    case 'aspect_choice': {
      // The past tenses open with the first production (as in conjugation questions).
      if (context.productionReps !== undefined && context.productionReps < 1 && EXERCISES.conjugation.applicable(entry)) return buildExercise('conjugation', entry, catalog, rng, context)
      const item = pick(aspectItemsFor(entry), rng)
      const lang = entry.language as 'fr' | 'es'
      const atStart = item.text.startsWith(BLANK)
      const cap = (x: string) => (atStart ? x.charAt(0).toLocaleUpperCase(lang) + x.slice(1) : x)
      const right = cap(item.form.toLocaleLowerCase(lang))
      const options = shuffle([right, cap(item.other)], rng).map((label, i) => ({ id: String(i), label }))
      return {
        ...base,
        kind: 'choice',
        // No translation up front: its Turkish tense would give the answer away.
        prompt: `${entry.lemma} · ${sense.gloss}`,
        context: item.text,
        tense: item.tense,
        cue: item.cue,
        options,
        correctOptionId: options.find((o) => o.label === right)!.id,
      } as ChoiceExercise
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
  aspect_choice: 'form',
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
    // Another person's or tense's form of the same verb: the verb was right, the ending wasn't.
    const forms = tensesOf(entry).flatMap((t) => conjugateTense(entry, t) ?? [])
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
