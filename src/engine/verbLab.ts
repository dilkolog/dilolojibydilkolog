import { conjugateTense, tenseVerbs, type Tense } from './tenses'
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
  const forms = conjugateTense(base, tense)
  if (!forms || !options.negative) return forms
  return forms.map((f) => negated(entry.language as 'fr' | 'es', f))
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
