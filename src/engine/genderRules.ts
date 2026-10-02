import { normalize, splitArticle } from './answerCheck'
import { definiteArticle } from './exercises'
import { pick, shuffle, type Rng } from './rng'
import type { Mistake, VocabularyEntry } from './types'

/**
 * Noun gender from the ending. Learning a rule with its exceptions generalises to words never
 * seen, where memorising articles one by one doesn't; the exceptions are what is worth drilling.
 * Only endings that hold for the large majority of nouns are listed.
 */

export interface GenderRule {
  id: string
  language: 'fr' | 'es'
  suffix: string
  gender: 'm' | 'f'
  /** Exceptions as written with their article. */
  exceptions: string[]
  /** Typical examples with their article. */
  examples: string[]
}

const r = (language: 'fr' | 'es', suffix: string, gender: 'm' | 'f', examples: string, exceptions = ''): GenderRule => ({
  id: `${language}:${suffix}`,
  language,
  suffix,
  gender,
  examples: examples.split(', '),
  exceptions: exceptions ? exceptions.split(', ') : [],
})

export const GENDER_RULES: GenderRule[] = [
  // French: feminine endings
  r('fr', 'tion', 'f', 'la nation, la question, la situation, la solution, la direction'),
  r('fr', 'sion', 'f', 'la décision, la télévision, la passion, la version, la mission'),
  r('fr', 'té', 'f', 'la liberté, la vérité, la société, la qualité, la beauté', "l'été (m), le côté, le comité, le traité, le pâté"),
  r('fr', 'ure', 'f', 'la culture, la voiture, la nature, la peinture, la blessure', 'le murmure, le mercure'),
  r('fr', 'ence', 'f', 'la différence, la science, la patience, la présence, la confiance', 'le silence'),
  r('fr', 'ance', 'f', 'la chance, la distance, la naissance, la France, la connaissance'),
  r('fr', 'ette', 'f', 'la fourchette, la cigarette, la recette, la baguette, la toilette', 'le squelette'),
  r('fr', 'ade', 'f', 'la promenade, la salade, la limonade, la façade, la parade', 'le stade, le grade'),
  r('fr', 'ie', 'f', 'la vie, la pluie, la partie, la boulangerie, la maladie', "le génie, le parapluie, l'incendie (m)"),
  r('fr', 'ise', 'f', 'la crise, la valise, la surprise, la chemise, la cerise'),
  // French: masculine endings
  r('fr', 'ment', 'm', "le moment, le gouvernement, l'appartement (m), le changement, le sentiment", 'la jument'),
  r('fr', 'age', 'm', 'le voyage, le fromage, le garage, le courage, le visage', "la page, la plage, la cage, l'image (f), la rage, la nage"),
  r('fr', 'isme', 'm', 'le tourisme, le réalisme, le journalisme, le racisme, le capitalisme'),
  r('fr', 'eau', 'm', 'le bureau, le chapeau, le gâteau, le cadeau, le tableau', "l'eau (f), la peau"),
  r('fr', 'oir', 'm', 'le soir, le miroir, le couloir, le devoir, le trottoir'),
  r('fr', 'et', 'm', 'le billet, le jouet, le secret, le projet, le bracelet'),
  r('fr', 'al', 'm', 'le journal, le cheval, le signal, le canal, le festival'),
  r('fr', 'ier', 'm', "le papier, le quartier, le métier, le cahier, l'escalier (m)"),
  // Spanish: feminine endings
  r('es', 'ción', 'f', 'la canción, la información, la estación, la educación, la nación'),
  r('es', 'sión', 'f', 'la televisión, la decisión, la pasión, la misión, la versión'),
  r('es', 'dad', 'f', 'la ciudad, la verdad, la universidad, la realidad, la sociedad'),
  r('es', 'tad', 'f', 'la libertad, la amistad, la mitad, la voluntad, la dificultad'),
  r('es', 'tud', 'f', 'la juventud, la actitud, la plenitud, la virtud, la inquietud'),
  r('es', 'umbre', 'f', 'la costumbre, la cumbre, la incertidumbre, la muchedumbre, la legumbre'),
  r('es', 'eza', 'f', 'la belleza, la cerveza, la naturaleza, la tristeza, la cabeza'),
  r('es', 'ie', 'f', 'la serie, la especie, la superficie, la calvicie, la planicie', 'el pie'),
  r('es', 'a', 'f', 'la casa, la mesa, la playa, la semana, la palabra', 'el día, el mapa, el problema, el sistema, el tema, el idioma, el programa, el clima, el planeta, el mediodía'),
  // Spanish: masculine endings
  r('es', 'aje', 'm', 'el viaje, el mensaje, el paisaje, el garaje, el lenguaje'),
  r('es', 'or', 'm', 'el amor, el color, el dolor, el error, el calor', 'la flor, la labor'),
  r('es', 'o', 'm', 'el libro, el año, el perro, el trabajo, el dinero', 'la mano, la radio, la foto, la moto'),
]

const bare = (s: string, language: 'fr' | 'es') => {
  const w = normalize(s).toLocaleLowerCase(language)
  return /^l['’]/.test(w) ? w.slice(2) : splitArticle(w, language).rest
}

/** The most specific rule whose ending the noun has. */
export function ruleForNoun(lemma: string, language: 'fr' | 'es'): GenderRule | undefined {
  const w = bare(lemma, language)
  return GENDER_RULES.filter((g) => g.language === language && w.endsWith(g.suffix) && w.length >= g.suffix.length).sort(
    (a, b) => b.suffix.length - a.suffix.length,
  )[0]
}

export interface RuleMatch {
  rule: GenderRule
  /** The word goes against the rule (an exception). */
  exception: boolean
}

/** The rule for a FR/ES noun entry with a known article, and whether the word is an exception. */
export function ruleFor(entry: VocabularyEntry): RuleMatch | undefined {
  if (entry.language === 'en') return undefined
  const article = definiteArticle(entry)
  if (!article) return undefined
  const rule = ruleForNoun(entry.lemma, entry.language)
  if (!rule) return undefined
  // el agua/el alma take "el" but are feminine; judge by gender when the article misleads.
  const gender = entry.gender === 'm' || entry.gender === 'f' ? entry.gender : article === 'la' ? 'f' : 'm'
  return { rule, exception: gender !== rule.gender }
}

/** Rules the learner trips over most: gender mistakes grouped by rule, worst first. */
export function troubleRules(mistakes: readonly Mistake[], vocabulary: readonly VocabularyEntry[]): { rule: GenderRule; mistakes: number }[] {
  const byId = new Map(vocabulary.map((v) => [v.id, v]))
  const counts = new Map<string, { rule: GenderRule; mistakes: number }>()
  for (const m of mistakes) {
    if (m.errorType !== 'gender') continue
    const entry = byId.get(m.entryId)
    const match = entry && ruleFor(entry)
    if (!match) continue
    const c = counts.get(match.rule.id) ?? { rule: match.rule, mistakes: 0 }
    c.mistakes += m.count
    counts.set(match.rule.id, c)
  }
  return [...counts.values()].sort((a, b) => b.mistakes - a.mistakes)
}

export interface RuleQuestion {
  /** The noun without its article. */
  noun: string
  answer: 'm' | 'f'
  rule: GenderRule
  exception: boolean
}

const genderOf = (withArticle: string, language: 'fr' | 'es'): 'm' | 'f' => {
  const marked = /\((m|f)\)$/.exec(withArticle)
  if (marked) return marked[1] as 'm' | 'f'
  return /^(la |una )/.test(withArticle) || (language === 'es' && /^las /.test(withArticle)) ? 'f' : 'm'
}

const nounOf = (withArticle: string, language: 'fr' | 'es') => bare(withArticle.replace(/\s*\((m|f)\)$/, ''), language)

/**
 * A rule drill: examples and, deliberately often, exceptions. Rules the learner struggles with
 * (`focus`) get more questions; the learner's own nouns join their rule's pool.
 */
export function ruleQuiz(language: 'fr' | 'es', count: number, rng: Rng, focus: readonly string[] = [], own: readonly VocabularyEntry[] = []): RuleQuestion[] {
  const rules = GENDER_RULES.filter((g) => g.language === language)
  const pool: RuleQuestion[] = []
  for (const rule of rules) {
    const weight = focus.includes(rule.id) ? 3 : 1
    for (let i = 0; i < weight; i++) {
      for (const ex of rule.examples) pool.push({ noun: nounOf(ex, language), answer: rule.gender, rule, exception: false })
      for (const ex of rule.exceptions) pool.push({ noun: nounOf(ex, language), answer: genderOf(ex, language), rule, exception: true })
    }
  }
  for (const e of own) {
    if (e.language !== language) continue
    const match = ruleFor(e)
    if (match) pool.push({ noun: e.lemma, answer: match.exception ? (match.rule.gender === 'm' ? 'f' : 'm') : match.rule.gender, rule: match.rule, exception: match.exception })
  }
  // Exceptions are a third of the drill: they are what the rule alone gets wrong.
  const exceptions = shuffle(pool.filter((q) => q.exception), rng)
  const regular = shuffle(pool.filter((q) => !q.exception), rng)
  const out: RuleQuestion[] = []
  const seen = new Set<string>()
  const take = (list: RuleQuestion[], n: number) => {
    for (const q of list) {
      if (out.length >= count || n <= 0) return
      if (seen.has(q.noun)) continue
      seen.add(q.noun)
      out.push(q)
      n--
    }
  }
  take(exceptions, Math.round(count / 3))
  take(regular, count)
  while (out.length < count && pool.length) out.push(pick(pool, rng))
  return shuffle(out, rng)
}
