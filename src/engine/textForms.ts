import { cleanToken } from './extract'
import type { ReadingAnalysis } from './reading'
import { analyzeForm, sentenceImperative, type Tense } from './tenses'

/** A verb form found in a text: the word as written (lowercased), its verb and its tense. */
export interface TextForm {
  form: string
  lemma: string
  tense: Tense
}

/** Every verb form in a text, in reading order (an ambiguous form counts once per verb). */
export function textForms(language: 'fr' | 'es', analysis: ReadingAnalysis): TextForm[] {
  const found: TextForm[] = []
  for (const p of analysis.paragraphs)
    for (const sentence of p) {
      // "Viens ici !": its first word is an imperative, which the forms alone can't tell from the present.
      const imperative = sentenceImperative(language, sentence.tokens.map((t) => t.text).join(''))
      if (imperative) found.push({ form: imperative.form, lemma: imperative.analysis.lemma, tense: imperative.analysis.tense })
      for (const t of sentence.tokens) {
        if (!t.key) continue
        const form = cleanToken(t.text, language).toLocaleLowerCase(language)
        if (imperative?.form === form) continue
        // An ambiguous form (finis: présent or passé simple) counts once per verb, as its first reading.
        const seenLemmas = new Set<string>()
        for (const a of analyzeForm(language, form)) {
          if (seenLemmas.has(a.lemma)) continue
          seenLemmas.add(a.lemma)
          found.push({ form, lemma: a.lemma, tense: a.tense })
        }
      }
    }
  return found
}

/** One tense of a text with the distinct forms met in it, most frequent first. */
export interface TenseGroup {
  tense: Tense
  total: number
  forms: { form: string; lemma: string; count: number }[]
}

/**
 * The forms of a text grouped by tense: the tenses with the most occurrences first, and within
 * a tense the forms met most (ties in order of first appearance).
 */
export function groupByTense(found: readonly TextForm[]): TenseGroup[] {
  const groups = new Map<Tense, Map<string, { form: string; lemma: string; count: number }>>()
  for (const f of found) {
    const forms = groups.get(f.tense) ?? new Map()
    const key = `${f.lemma}|${f.form}`
    const o = forms.get(key)
    forms.set(key, o ? { ...o, count: o.count + 1 } : { form: f.form, lemma: f.lemma, count: 1 })
    groups.set(f.tense, forms)
  }
  return [...groups.entries()]
    .map(([tense, forms]) => {
      const list = [...forms.values()].sort((a, b) => b.count - a.count)
      return { tense, total: list.reduce((n, f) => n + f.count, 0), forms: list }
    })
    .sort((a, b) => b.total - a.total)
}
