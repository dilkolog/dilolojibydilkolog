import { cleanToken } from './extract'
import type { ReadingAnalysis } from './reading'
import { analyzeCompound, analyzeForm, sentenceImperative, type FormAnalysis, type Tense } from './tenses'

/** A verb form found in a text: the word as written (lowercased), its verb and its tense. */
export interface TextForm {
  form: string
  lemma: string
  tense: Tense
  /** Which sentence of the text it stands in (counted through the whole text, from 0). */
  sentence: number
}

/** Words that may stand between the auxiliary and the participle: "n'ai pas mangé", "había ya comido". */
const BETWEEN = new Set(['pas', 'jamais', 'déjà', 'deja', 'bien', 'encore', 'toujours', 'plus', 'rien', 'enfin', 'ya', 'nunca', 'siempre', 'todavía', 'aún', 'también', 'no', 'casi', 'apenas'])

const REFLEXIVE = new Set(['me', 'te', 'se'])

/**
 * The reflexive pronoun in front of an auxiliary, as written ("s'", "se", "nous nous"): the sign of
 * a reflexive verb in a compound tense. Elided (s'est, m'étais) or a word apart (je me suis,
 * nous nous sommes: a lone "nous sommes" is no sign, it is the subject).
 */
function reflexivePronoun(raws: readonly string[], words: readonly string[], i: number): string | undefined {
  const elided = /^([mts])'/.exec(raws[i])
  if (elided) return `${elided[1]}'`
  const before = words[i - 1]
  if (before && REFLEXIVE.has(before)) return before
  if (before && (before === 'nous' || before === 'vous') && words[i - 2] === before) return `${before} ${before}`
  return undefined
}

const SUBJECTS: Record<'fr' | 'es', Set<string>> = {
  fr: new Set(['je', 'j', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles', 'qui', 'que', 'qu', 'ne', 'n']),
  es: new Set(['yo', 'tú', 'tu', 'él', 'ella', 'usted', 'nosotros', 'nosotras', 'vosotros', 'vosotras', 'ellos', 'ellas', 'ustedes', 'no']),
}
const REFLEXIVE_WORDS: Record<'fr' | 'es', Set<string>> = { fr: new Set(['me', 'm', 'te', 't', 'se', 's', 'nous', 'vous']), es: new Set(['me', 'te', 'se', 'nos', 'os']) }

/**
 * The compound tense in what was typed ("j'ai mangé", "n'ont pas fini", "il s'était lavé",
 * "habían comido"): its verb and tense, or undefined. Leading subject pronouns and the negation are
 * left out, a reflexive pronoun before the auxiliary marks a reflexive verb, and a small word may
 * stand between the auxiliary and the participle, as in a text. Used when a word is typed into the
 * add-word form: the list keeps the infinitive.
 */
export function typedCompound(language: 'fr' | 'es', typed: string): { lemma: string; tense: Tense; form: string } | undefined {
  const words = typed
    .toLocaleLowerCase(language)
    .replace(/[’‘´`]/g, "'")
    .split(/[\s']+/)
    .filter(Boolean)
  // Lead-in words: subjects, the negation and the reflexive pronouns.
  let start = 0
  while (start < words.length - 1 && (SUBJECTS[language].has(words[start]) || REFLEXIVE_WORDS[language].has(words[start]))) start++
  // The word before the auxiliary is a reflexive pronoun ("nous nous sommes": twice, a lone "nous sommes" is just the subject).
  const before = words[start - 1]
  const reflexive = !!before && REFLEXIVE_WORDS[language].has(before) && (!['nous', 'vous'].includes(before) || words[start - 2] === before)
  const rest = words.slice(start)
  for (let gap = 0; gap <= 2 && 1 + gap < rest.length; gap++) {
    if (gap > 0 && !BETWEEN.has(rest[gap])) break
    const hit = analyzeCompound(language, rest[0], rest[1 + gap], reflexive)[0]
    if (hit) return { lemma: hit.lemma, tense: hit.tense, form: typed.trim() }
  }
  return undefined
}

/** Every verb form in a text, in reading order (an ambiguous form counts once per verb). */
export function textForms(language: 'fr' | 'es', analysis: ReadingAnalysis): TextForm[] {
  const found: TextForm[] = []
  let at = -1
  for (const p of analysis.paragraphs)
    for (const sentence of p) {
      at++
      // "Viens ici !": its first word is an imperative, which the forms alone can't tell from the present.
      const imperative = sentenceImperative(language, sentence.tokens.map((t) => t.text).join(''))
      if (imperative) found.push({ form: imperative.form, lemma: imperative.analysis.lemma, tense: imperative.analysis.tense, sentence: at })
      const raws = sentence.tokens.filter((t) => t.key).map((t) => t.text.toLocaleLowerCase(language).replace(/’/g, "'"))
      const words = sentence.tokens.filter((t) => t.key).map((t) => cleanToken(t.text, language).toLocaleLowerCase(language))
      for (let i = 0; i < words.length; i++) {
        const form = words[i]
        if (imperative?.form === form) continue
        // A compound tense: the auxiliary and its participle, up to two small words apart ("n'ai pas mangé").
        let compound = false
        const pronoun = language === 'fr' ? reflexivePronoun(raws, words, i) : undefined
        for (let gap = 0; gap <= 2 && i + 1 + gap < words.length; gap++) {
          if (gap > 0 && !BETWEEN.has(words[i + gap])) break
          const next = words[i + 1 + gap]
          const hits = analyzeCompound(language, form, next, !!pronoun)
          if (!hits.length) continue
          const seenLemmas = new Set<string>()
          for (const a of hits) {
            if (seenLemmas.has(a.lemma)) continue
            seenLemmas.add(a.lemma)
            found.push({ form: `${pronoun ? `${pronoun}${pronoun.endsWith("'") ? '' : ' '}` : ''}${form} ${next}`, lemma: a.lemma, tense: a.tense, sentence: at })
          }
          // The auxiliary and the participle are spoken for; the participle is no form of its own.
          words[i + 1 + gap] = ''
          compound = true
          break
        }
        if (compound) continue
        // An ambiguous form (finis: présent or passé simple) counts once per verb, as its first reading.
        const seenLemmas = new Set<string>()
        for (const a of analyzeForm(language, form)) {
          if (seenLemmas.has(a.lemma)) continue
          seenLemmas.add(a.lemma)
          found.push({ form, lemma: a.lemma, tense: a.tense, sentence: at })
        }
      }
    }
  return found
}

/** One tense of a text with the distinct forms met in it, most frequent first. */
export interface TenseGroup {
  tense: Tense
  total: number
  forms: { form: string; lemma: string; count: number; /** The sentence it is first met in. */ sentence?: number }[]
}

/**
 * The forms of a text grouped by tense: the tenses with the most occurrences first, and within
 * a tense the forms met most (ties in order of first appearance).
 */
export function groupByTense(found: readonly TextForm[]): TenseGroup[] {
  const groups = new Map<Tense, Map<string, { form: string; lemma: string; count: number; sentence?: number }>>()
  for (const f of found) {
    const forms = groups.get(f.tense) ?? new Map()
    const key = `${f.lemma}|${f.form}`
    const o = forms.get(key)
    forms.set(key, o ? { ...o, count: o.count + 1 } : { form: f.form, lemma: f.lemma, count: 1, sentence: f.sentence })
    groups.set(f.tense, forms)
  }
  return [...groups.entries()]
    .map(([tense, forms]) => {
      const list = [...forms.values()].sort((a, b) => b.count - a.count)
      return { tense, total: list.reduce((n, f) => n + f.count, 0), forms: list }
    })
    .sort((a, b) => b.total - a.total)
}

/**
 * The compound tenses of a sentence that a word takes part in, as its analyses: tap "ai" or "mangé"
 * in "J'ai mangé une pomme" and get manger, passé composé ("ai mangé"), not just avoir or a participle.
 * Same reading as in a text (a reflexive pronoun, small words between).
 */
export function compoundsAround(language: 'fr' | 'es', sentence: string, word: string): FormAnalysis[] {
  const tokens = [...sentence.matchAll(/[\p{L}][\p{L}'’-]*/gu)].map((m) => m[0])
  const raws = tokens.map((t) => t.toLocaleLowerCase(language).replace(/’/g, "'"))
  const words = tokens.map((t) => cleanToken(t, language).toLocaleLowerCase(language))
  const target = cleanToken(word, language).toLocaleLowerCase(language)
  const out: FormAnalysis[] = []
  for (let i = 0; i < words.length; i++) {
    const pronoun = language === 'fr' ? reflexivePronoun(raws, words, i) : undefined
    for (let gap = 0; gap <= 2 && i + 1 + gap < words.length; gap++) {
      if (gap > 0 && !BETWEEN.has(words[i + gap])) break
      const hits = analyzeCompound(language, words[i], words[i + 1 + gap], !!pronoun)
      if (!hits.length) continue
      if (words[i] === target || words[i + 1 + gap] === target) {
        const phrase = `${pronoun ? `${pronoun}${pronoun.endsWith("'") ? '' : ' '}` : ''}${words[i]} ${words[i + 1 + gap]}`
        for (const h of hits) if (!out.some((o) => o.lemma === h.lemma && o.tense === h.tense)) out.push({ ...h, phrase })
      }
      break
    }
  }
  return out
}
