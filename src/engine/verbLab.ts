import { conjugateTense, isImperative, tenseVerbs, type Tense } from './tenses'
import type { VocabularyEntry } from './types'

/**
 * The verb lab's helpers: the alternatives to a plain affirmative form (negative, reflexive) and
 * the level bands the verbs are sorted into.
 */
type Verb = Pick<VocabularyEntry, 'language' | 'lemma' | 'partOfSpeech'>

const FR_REFLEXIVE = /^(me |te |se |nous |vous |m'|t'|s')/

/**
 * The negative of a form as the table shows it (no subject): Spanish puts "no" in front
 * (no me lavo), French wraps the verb in ne … pas (ne mange pas, n'ai pas mangé, ne me lève pas).
 */
export function negated(language: 'fr' | 'es', form: string): string {
  if (language === 'es') return `no ${form}`
  const pronoun = form.match(FR_REFLEXIVE)?.[0] ?? ''
  const [verb, ...rest] = form.slice(pronoun.length).split(' ')
  // Before a vowel or a mute h, ne becomes n' (but a reflexive pronoun already stands in between).
  const ne = !pronoun && /^[aeiouyéèêâîôûh]/i.test(verb) && !/^ha[ïi]/i.test(verb) ? "n'" : 'ne '
  return `${ne}${pronoun}${verb} pas${rest.length ? ` ${rest.join(' ')}` : ''}`
}

/** The verb with its reflexive pronoun (manger → se manger, lavar → lavarse), or undefined when it already has it. */
export function reflexiveOf(entry: Verb): Verb | undefined {
  const lemma = entry.lemma.trim()
  if (entry.language === 'fr') {
    if (/^(se |s['’])/i.test(lemma)) return undefined
    return { ...entry, lemma: /^[aeiouyéèêâîôûh]/i.test(lemma) ? `s'${lemma}` : `se ${lemma}` }
  }
  if (/se$/i.test(lemma)) return undefined
  return { ...entry, lemma: `${lemma}se` }
}

/** The same verb without its reflexive pronoun. */
export function plainOf(entry: Verb): Verb {
  const lemma = entry.lemma.trim()
  return { ...entry, lemma: entry.language === 'fr' ? lemma.replace(/^(se |s['’])/i, '') : lemma.replace(/se$/i, '') }
}

/** The six forms for the chosen alternatives: reflexive and/or negative. */
export function labForms(entry: Verb, tense: Tense, options: { reflexive?: boolean; negative?: boolean }): string[] | undefined {
  if (entry.language === 'en') return undefined
  const base = options.reflexive ? (reflexiveOf(entry) ?? entry) : entry
  if (options.negative && isImperative(tense)) return negativeImperative(base)
  const forms = conjugateTense(base, tense)
  if (!forms || !options.negative) return forms
  return forms.map((f) => negated(entry.language as 'fr' | 'es', f))
}

/**
 * The negative imperative, which is not the affirmative with "no": Spanish takes the subjunctive
 * (no hables, no te levantes), French puts a reflexive pronoun back in front (ne te lève pas).
 */
function negativeImperative(entry: Verb): string[] | undefined {
  if (entry.language === 'es') {
    const sub = conjugateTense(entry, 'subjuntivo')
    return sub && ['', ...sub.slice(1).map((f) => `no ${f}`)]
  }
  const plain = plainOf(entry)
  const forms = conjugateTense(plain, 'imperatif')
  if (!forms) return undefined
  if (plain.lemma === entry.lemma.trim()) return forms.map((f) => (f ? negated('fr', f) : ''))
  const pronoun = ['', 'te', '', 'nous', 'vous', '']
  return forms.map((f, i) => (f ? `ne ${pronoun[i] === 'te' && /^[aeiouyéèêâîôûh]/i.test(f) ? `t'${f}` : `${pronoun[i]} ${f}`} pas` : ''))
}

export type Level = 'A1' | 'A2' | 'B1' | 'B2' | 'C1'
export const LEVELS: readonly Level[] = ['A1', 'A2', 'B1', 'B2', 'C1']

/** How many of the most frequent verbs each level takes (the rest is C1): about the verbs a learner needs by then. */
const BAND: readonly [Level, number][] = [
  ['A1', 40],
  ['A2', 120],
  ['B1', 300],
  ['B2', 600],
]

/**
 * Verbs sorted into levels by how often they are heard (subtitle frequency of the infinitive and
 * the verbs the tables hold). An approximation: the frequency of a verb is not its CEFR level,
 * but the most common verbs are the first ones taught.
 */
export function verbLevels(language: 'fr' | 'es', frequency: ReadonlyMap<string, number>): Map<string, Level> {
  const verbs = tenseVerbs(language)
  const ranked = verbs
    .map((v, i) => ({ v, rank: frequency.get(v) ?? Number.MAX_SAFE_INTEGER, i }))
    .sort((a, b) => a.rank - b.rank || a.i - b.i)
  const out = new Map<string, Level>()
  let seen = 0
  for (const { v, rank } of ranked) {
    // A verb the frequency list does not hold is rarer than all that it does.
    const band = rank === Number.MAX_SAFE_INTEGER ? undefined : BAND.find(([, upTo]) => seen < upTo)
    out.set(v, band?.[0] ?? 'C1')
    seen++
  }
  return out
}

/** Verbs a learner typing a few letters probably means: starts-with first, then contains, by frequency. */
export function suggestVerbs(language: 'fr' | 'es', typed: string, frequency: ReadonlyMap<string, number>, limit = 8): string[] {
  const q = typed.trim().toLocaleLowerCase(language)
  if (!q) return []
  const rank = (v: string) => frequency.get(v) ?? Number.MAX_SAFE_INTEGER
  const verbs = tenseVerbs(language)
  const starts = verbs.filter((v) => v.startsWith(q))
  const rest = verbs.filter((v) => !v.startsWith(q) && v.includes(q))
  return [...starts.sort((a, b) => rank(a) - rank(b)), ...rest.sort((a, b) => rank(a) - rank(b))].slice(0, limit)
}

/**
 * The day's verb: one of the learner's own verbs not yet mastered (else any of their own, else a
 * common one), the same all day and another the next. `day` is a date number such as 20261008.
 */
export function verbOfTheDay(own: readonly string[], common: readonly string[], mastery: (verb: string) => number, day: number): string | undefined {
  const learning = own.filter((v) => mastery(v) < 100)
  const pool = [...(learning.length ? learning : own.length ? own : common)].sort()
  if (!pool.length) return undefined
  // Consecutive days land far apart in the list (Knuth's multiplicative hash).
  return pool[(Math.imul(day, 2654435761) >>> 0) % pool.length]
}
