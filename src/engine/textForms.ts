import { cleanToken, WORD_SOURCE } from './extract'
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
const BETWEEN = new Set(['pas', 'jamais', 'déjà', 'deja', 'bien', 'encore', 'toujours', 'plus', 'rien', 'enfin', 'souvent', 'presque', 'vite', 'longtemps', 'ya', 'nunca', 'siempre', 'todavía', 'aún', 'también', 'no', 'casi', 'apenas'])

/** A small word that may stand between the auxiliary and the participle: the listed ones, or an adverb in -ment / -mente ("a vraiment aimé"). */
function isBetween(language: 'fr' | 'es', word: string): boolean {
  if (BETWEEN.has(word)) return true
  return language === 'fr' ? /^[a-zàâäéèêëîïôöùûüç]{4,}ment$/.test(word) : /^[a-zñáéíóúü]{4,}mente$/.test(word)
}

/** An inverted question's auxiliary with its subject ("a-t-il", "avez-vous", "étaient-elles") → the auxiliary alone. */
const deInvert = (word: string) => word.replace(/(?:-t)?-(?:je|tu|il|elle|on|nous|vous|ils|elles)$/, '') || word

/** The participle of "to be" after avoir/haber: the sign of a passive ("ont été retrouvés"), whose verb is the next participle. */
const PASSIVE_PP: Record<'fr' | 'es', string> = { fr: 'été', es: 'sido' }

/**
 * What may stand in front of the past infinitive of "être" ("après être parti", "il doit être parti"):
 * a preposition or a modal. Without one, "être + participle" is the passive or an adjective ("il est fatigué").
 */
/** What may stand in front of a typed past infinitive (also "avant de", "después de"). */
const INFINITIVE_LEADS: Record<'fr' | 'es', Set<string>> = { fr: new Set(['après', 'pour', 'sans', 'de', 'd', 'à', 'avant', 'par', 'en']), es: new Set(['después', 'sin', 'por', 'al', 'de', 'antes']) }
const BE_INFINITIVE_LEADS = new Set(['après', 'pour', 'sans', 'de', 'd', 'à', 'avant', 'par', 'en', 'doit', 'dois', 'doivent', 'peut', 'peuvent', 'pourrait', 'devrait', 'semble', 'semblent', 'paraît'])

/** The auxiliary of a Spanish compound infinitive or gerund with its pronouns glued on ("haberme", "habiéndose") → the auxiliary alone. */
const esAuxOf = (word: string) => {
  const m = /^(haber|habiendo|habiéndo)(?:me|te|se|nos|os|lo|la|le|los|las|les)+$/.exec(word)
  return m ? (m[1] === 'habiéndo' ? 'habiendo' : m[1]) : word
}

/** A Spanish participle as written agreeing (tirados, rotas, dicha) → its masculine singular. */
const esMasculine = (word: string) => word.replace(/(?:os|as|a)$/, 'o')

const REFLEXIVE = new Set(['me', 'te', 'se'])

/**
 * The reflexive pronoun in front of an auxiliary, as written ("s'", "se", "nous nous"): the sign of
 * a reflexive verb in a compound tense. Elided (s'est, m'étais) or a word apart (je me suis,
 * nous nous sommes: a lone "nous sommes" is no sign, it is the subject).
 */
function reflexivePronoun(raws: readonly string[], words: readonly string[], i: number): string | undefined {
  const elided = /^([mts])'/.exec(raws[i])
  if (elided) return `${elided[1]}'`
  // "s'en est allé", "elle s'y est rendue": the pronoun joined with en / y, or a word apart ("nous nous en sommes").
  const joined = /^([mts]'(?:en|y))$/.exec(raws[i - 1] ?? '')
  if (joined) return joined[1]
  if (['en', 'y'].includes(words[i - 1])) {
    const pp = words[i - 2]
    if (pp && REFLEXIVE.has(pp)) return `${pp} ${words[i - 1]}`
    if ((pp === 'nous' || pp === 'vous') && words[i - 3] === pp) return `${pp} ${pp} ${words[i - 1]}`
  }
  const before = words[i - 1]
  if (before && REFLEXIVE.has(before)) return before
  if (before && (before === 'nous' || before === 'vous') && words[i - 2] === before) return `${before} ${before}`
  return undefined
}

interface CompoundMatch {
  hits: FormAnalysis[]
  /** The index of the participle (the last word of the form). */
  last: number
  phrase: string
  /** The words that are the form itself: the auxiliary, the participle and, in a passive, "été" (small words between are not). */
  indices: number[]
  /** A passive also is the compound tense of "to be" ("a été"): that reading, listed beside the verb's. */
  beHits?: FormAnalysis[]
  /** The auxiliary and "été" as written, for the "to be" reading. */
  bePhrase?: string
}

/**
 * The compound tense that opens at word `i`: the auxiliary and its participle, up to two small words
 * apart ("n'ai pas mangé", "a vraiment aimé"), an inverted question ("a-t-il compris"), a passive
 * with the participle of "to be" in between ("ont été retrouvés": the verb is retrouver).
 */
function compoundAt(language: 'fr' | 'es', raws: readonly string[], words: readonly string[], i: number): CompoundMatch | undefined {
  const pronoun = language === 'fr' ? reflexivePronoun(raws, words, i) : undefined
  const prefix = pronoun ? `${pronoun}${pronoun.endsWith("'") ? '' : ' '}` : ''
  const aux = language === 'fr' ? deInvert(words[i]) : esAuxOf(words[i])
  // "être" + participle is a past infinitive only after a preposition or a modal; otherwise a passive or an adjective.
  if (language === 'fr' && aux === 'être' && !BE_INFINITIVE_LEADS.has(words[i - 1] ?? '') && !/^d'/.test(raws[i])) return undefined
  for (let gap = 0; gap <= 2 && i + 1 + gap < words.length; gap++) {
    if (gap > 0 && !isBetween(language, words[i + gap])) break
    const next = words[i + 1 + gap]
    if (next === PASSIVE_PP[language] && !pronoun) {
      const after = words[i + 2 + gap]
      const hits = after ? analyzeCompound(language, aux, language === 'es' ? esMasculine(after) : after) : []
      if (hits.length) return { hits, last: i + 2 + gap, phrase: `${words[i]} ${next} ${after}`, indices: [i, i + 1 + gap, i + 2 + gap], beHits: analyzeCompound(language, aux, next), bePhrase: `${words[i]} ${next}` }
    }
    const hits = analyzeCompound(language, aux, next, !!pronoun)
    if (hits.length) return { hits, last: i + 1 + gap, phrase: `${prefix}${words[i]} ${next}`, indices: [i, i + 1 + gap] }
  }
  return undefined
}

const SUBJECTS: Record<'fr' | 'es', Set<string>> = {
  fr: new Set(['je', 'j', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles', 'qui', 'que', 'qu', 'ne', 'n']),
  es: new Set(['yo', 'tú', 'tu', 'él', 'ella', 'usted', 'nosotros', 'nosotras', 'vosotros', 'vosotras', 'ellos', 'ellas', 'ustedes', 'no']),
}
/** Object pronouns before the auxiliary ("je l'ai vu", "lo he visto", "il lui a dit"): lead-in words that are no reflexive sign. */
const OBJECT_WORDS: Record<'fr' | 'es', Set<string>> = { fr: new Set(['l', 'le', 'la', 'les', 'lui', 'leur', 'en', 'y']), es: new Set(['lo', 'la', 'los', 'las', 'le', 'les']) }
const REFLEXIVE_WORDS: Record<'fr' | 'es', Set<string>> = { fr: new Set(['me', 'm', 'te', 't', 'se', 's', 'nous', 'vous']), es: new Set(['me', 'te', 'se', 'nos', 'os']) }

/**
 * The compound tense in what was typed ("j'ai mangé", "n'ont pas fini", "il s'était lavé",
 * "habían comido"): its verb and tense, or undefined. Leading subject pronouns and the negation are
 * left out, a reflexive pronoun before the auxiliary marks a reflexive verb, and a small word may
 * stand between the auxiliary and the participle, as in a text. Used when a word is typed into the
 * add-word form: the list keeps the infinitive.
 */
export function typedCompound(language: 'fr' | 'es', typed: string): { lemma: string; tense: Tense; form: string } | undefined {
  let words = typed
    .toLocaleLowerCase(language)
    .replace(/[’‘´`]/g, "'")
    .split(/[\s']+/)
    .filter(Boolean)
  // "après avoir mangé", "sin haberlo visto", "d'avoir marché", "après s'être lavé": what stands in front of a past
  // infinitive is no part of the form, but it is what makes "être" + participle one (and not a passive).
  const opensInfinitive = (w?: string) => !!w && (language === 'fr' ? ['avoir', 'être', 'ayant', 'étant'].includes(w) : /^(haber|habiendo|habiéndo)/.test(w))
  let led = false
  if (words[0] && (INFINITIVE_LEADS[language].has(words[0]) || BE_INFINITIVE_LEADS.has(words[0]))) {
    const k = words[1] === 'de' && ['avant', 'después'].includes(words[0]) ? 2 : 1
    let j = k
    while (j < words.length && REFLEXIVE_WORDS[language].has(words[j])) j++
    if (opensInfinitive(words[j])) {
      words = words.slice(k)
      led = true
    }
  }
  // Lead-in words: subjects, the negation, the reflexive pronouns and the object pronouns ("s'en est allé", "je l'ai vu", "me lo he comido").
  const isLead = (w: string) => SUBJECTS[language].has(w) || REFLEXIVE_WORDS[language].has(w) || OBJECT_WORDS[language].has(w)
  let start = 0
  while (start < words.length - 1 && isLead(words[start])) start++
  // The word before the auxiliary is a reflexive pronoun ("nous nous sommes": twice, a lone "nous sommes" is just the subject).
  const lead = words.slice(0, start)
  while (lead.length && OBJECT_WORDS[language].has(lead[lead.length - 1])) lead.pop()
  const before = lead[lead.length - 1]
  const reflexive = !!before && REFLEXIVE_WORDS[language].has(before) && (!['nous', 'vous'].includes(before) || lead[lead.length - 2] === before)
  const rest = words.slice(start)
  const aux = language === 'fr' && rest[0] ? deInvert(rest[0]) : language === 'es' && rest[0] ? esAuxOf(rest[0]) : rest[0]
  // "être parti" alone is a passive or an adjective: only with a lead.
  if (language === 'fr' && aux === 'être' && !led) return undefined
  for (let gap = 0; gap <= 2 && 1 + gap < rest.length; gap++) {
    if (gap > 0 && !isBetween(language, rest[gap])) break
    // A passive ("ont été retrouvés"): the verb is the participle after "été".
    if (rest[1 + gap] === PASSIVE_PP[language] && rest.length === 3 + gap && !reflexive) {
      const after = language === 'es' ? esMasculine(rest[2 + gap]) : rest[2 + gap]
      const hit = analyzeCompound(language, aux, after)[0]
      if (hit) return { lemma: hit.lemma, tense: hit.tense, form: typed.trim() }
    }
    // Nothing after the participle: "il a mangé une pomme" is a sentence, not a verb form.
    if (rest.length !== 2 + gap) continue
    const hit = analyzeCompound(language, aux, rest[1 + gap], reflexive)[0]
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
        const match = compoundAt(language, raws, words, i)
        if (match) {
          const seenLemmas = new Set<string>()
          for (const a of match.hits) {
            if (seenLemmas.has(a.lemma)) continue
            seenLemmas.add(a.lemma)
            found.push({ form: match.phrase, lemma: a.lemma, tense: a.tense, sentence: at })
          }
          // "ont été retrouvés" is also "ont été": the compound tense of être, counted beside the verb's.
          for (const a of match.beHits ?? []) found.push({ form: match.bePhrase ?? match.phrase, lemma: a.lemma, tense: a.tense, sentence: at })
          // The auxiliary and the participle are spoken for; the participle is no form of its own.
          for (let k = i + 1; k <= match.last; k++) words[k] = ''
          compound = true
        }
        if (compound) continue
        // "plus" (more, no longer) is the adverb and "cela" is the pronoun; plaire's and celer's passé simple are far too rare to list.
        if (language === 'fr' && (form === 'plus' || form === 'cela')) continue
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
  const tokens = [...sentence.matchAll(new RegExp(WORD_SOURCE, 'gu'))].map((m) => m[0])
  const raws = tokens.map((t) => t.toLocaleLowerCase(language).replace(/’/g, "'"))
  const words = tokens.map((t) => cleanToken(t, language).toLocaleLowerCase(language))
  const target = cleanToken(word, language).toLocaleLowerCase(language)
  const out: FormAnalysis[] = []
  for (let i = 0; i < words.length; i++) {
    const match = compoundAt(language, raws, words, i)
    if (!match) continue
    // Only the words of the form itself open its card: a small word between ("pas", "vraiment") is looked up on its own.
    if (!match.indices.some((k) => words[k] === target)) continue
    for (const h of match.hits) if (!out.some((o) => o.lemma === h.lemma && o.tense === h.tense)) out.push({ ...h, phrase: match.phrase })
    for (const h of match.beHits ?? []) if (!out.some((o) => o.lemma === h.lemma && o.tense === h.tense)) out.push({ ...h, phrase: match.bePhrase ?? match.phrase })
  }
  return out
}
