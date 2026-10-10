import { cleanToken } from './extract'
import type { ReadingAnalysis } from './reading'
import { analyzeCompound, analyzeForm, sentenceImperative, type Tense } from './tenses'

/** A verb form found in a text: the word as written (lowercased), its verb and its tense. */
export interface TextForm {
  form: string
  lemma: string
  tense: Tense
}

/** Words that may stand between the auxiliary and the participle: "n'ai pas mangé", "había ya comido". */
const BETWEEN = new Set(['pas', 'jamais', 'déjà', 'deja', 'bien', 'encore', 'toujours', 'plus', 'rien', 'enfin', 'ya', 'nunca', 'siempre', 'todavía', 'aún', 'también', 'no', 'casi', 'apenas'])

/** Every verb form in a text, in reading order (an ambiguous form counts once per verb). */
export function textForms(language: 'fr' | 'es', analysis: ReadingAnalysis): TextForm[] {
  const found: TextForm[] = []
  for (const p of analysis.paragraphs)
    for (const sentence of p) {
      // "Viens ici !": its first word is an imperative, which the forms alone can't tell from the present.
      const imperative = sentenceImperative(language, sentence.tokens.map((t) => t.text).join(''))
      if (imperative) found.push({ form: imperative.form, lemma: imperative.analysis.lemma, tense: imperative.analysis.tense })
      const words = sentence.tokens.filter((t) => t.key).map((t) => cleanToken(t.text, language).toLocaleLowerCase(language))
      for (let i = 0; i < words.length; i++) {
        const form = words[i]
        if (imperative?.form === form) continue
        // A compound tense: the auxiliary and its participle, up to two small words apart ("n'ai pas mangé").
        let compound = false
        for (let gap = 0; gap <= 2 && i + 1 + gap < words.length; gap++) {
          if (gap > 0 && !BETWEEN.has(words[i + gap])) break
          const next = words[i + 1 + gap]
          const hits = analyzeCompound(language, form, next)
          if (!hits.length) continue
          const seenLemmas = new Set<string>()
          for (const a of hits) {
            if (seenLemmas.has(a.lemma)) continue
            seenLemmas.add(a.lemma)
            found.push({ form: `${form} ${next}`, lemma: a.lemma, tense: a.tense })
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
