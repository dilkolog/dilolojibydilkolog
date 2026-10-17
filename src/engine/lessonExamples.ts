import { analyzeText } from './reading'
import { textForms } from './textForms'
import type { Tense } from './tenses'
import type { TargetLanguage } from './types'

/** A text the learner owns, or a pile of sentences: where the examples of a lesson are looked for. */
export interface OwnSource {
  title: string
  text: string
}

/** A sentence of the learner's own that shows what a lesson teaches, with the stretch that shows it. */
export interface OwnExample {
  sentence: string
  source: string
  /** The part of the sentence that is the lesson's point (character offsets), when it is known. */
  mark?: { start: number; end: number }
}

/** A word-bounded pattern (the letters of every language count as letters, unlike `\b`). */
const words = (src: string) => new RegExp(`(?<![\\p{L}\\p{N}])(?:${src})(?![\\p{L}\\p{N}])`, 'iu')

/**
 * What a pattern can see of the topics that are not a tense: a word, a frame, an ending. They are rough on purpose
 * (a sentence shown for the wrong reason is a small miss; a topic with no pattern shows nothing), so a lesson only
 * lists topics a pattern finds right most of the time. A topic missing here has no "your own sentences" section.
 */
const PATTERNS: Record<string, RegExp> = {
  // French
  negation_fr: words("n(?:e|')\\s*(?:\\p{L}+\\s+){0,3}?(?:plus|jamais|rien|personne|aucune?|guère)"),
  basics_fr_negation: words("n(?:e|')\\s*(?:\\p{L}+\\s+){0,3}?(?:pas|plus|jamais|rien|personne|aucune?|guère)"),
  pronoms_y_en: words("(?:je|j'|tu|il|elle|on|nous|vous|ils|elles)\\s*(?:ne\\s+|n')?(?:en|y)\\s+(?!a\\b|avait\\b|aura\\b)\\p{L}+"),
  pronoms_relatifs: words("dont|lequel|laquelle|lesquel(?:le)?s|auquel|duquel|auxquel(?:le)?s|desquel(?:le)?s"),
  conn_fr: words('pourtant|cependant|néanmoins|toutefois|bien que|quoique|puisque|afin que|tandis que|alors que|malgré'),
  discours_indirect_fr: words("(?:il|elle|ils|elles|je|on)\\s+(?:a|ont|avait|avaient)?\\s*(?:dit|demandé|répondu|expliqué|affirmé|annoncé)\\s+(?:que|qu'|de|si)"),
  basics_fr_depuis: words("depuis|il y a|pendant|ça fait"),
  basics_fr_passif: words("(?:est|sont|était|étaient|a été|ont été|sera|seront)\\s+\\p{L}+(?:é|és|ée|ées|i|is|ie|ies|u|us)\\s+par"),
  basics_fr_gerondif: words("en\\s+\\p{L}+ant"),
  basics_fr_participe_gerondif: words("en\\s+\\p{L}+ant"),
  basics_fr_si_concordance: words("si\\s+(?:je|j'|tu|il|elle|on|nous|vous|ils|elles)"),
  basics_fr_c_est_vs_il_est: words("c'est|ce sont|il est|elle est"),
  basics_fr_comparaison: words("(?:plus|moins|aussi)\\s+\\p{L}+\\s+(?:que|qu')"),
  inversion: words("\\p{L}+-(?:t-)?(?:il|elle|on|ils|elles|je|nous|vous)"),
  basics_fr_questions_inversion: words("\\p{L}+-(?:t-)?(?:il|elle|on|ils|elles|je|nous|vous)"),
  basics_fr_savoir_connaitre: words('sais|sait|savons|savez|savent|connais|connaît|connaissons|connaissez|connaissent'),
  basics_fr_infinitif_passe: words("après\\s+(?:avoir|être|s'être)\\s+\\p{L}+"),
  basics_fr_connecteurs_argumentation: words("en effet|en revanche|d'ailleurs|en outre|de surcroît|certes|dès lors|en définitive|par conséquent"),
  // Spanish
  por_para: words('por|para'),
  ser_estar: words('es|son|era|eran|fue|fueron|soy|eres|somos|está|están|estaba|estaban|estoy|estás|estamos|estuvo'),
  relativos_es: words('quien|quienes|cuy[oa]s?|lo cual|el cual|la cual|los cuales|las cuales|lo que|el que|la que|los que|las que'),
  basics_es_que_quien_el_que: words('quien|quienes|cuy[oa]s?|lo cual|el cual|la cual|los cuales|las cuales|lo que|el que|la que|los que|las que'),
  comparativos_es: words('(?:más|menos)\\s+\\p{L}+\\s+que|tan\\s+\\p{L}+\\s+como|tantos?\\s+\\p{L}+\\s+como|tantas?\\s+\\p{L}+\\s+como'),
  conn_es: words('sin embargo|aunque|a pesar de|por lo tanto|ya que|puesto que|no obstante|de modo que|así que|mientras que'),
  perifrasis: words('(?:voy|vas|va|vamos|van|tengo|tienes|tiene|tenemos|tienen|acabo|acabas|acaba|acabamos|acaban|empiezo|empieza|empiezan|suelo|sueles|suele|solemos|suelen)\\s+(?:a\\s+|que\\s+|de\\s+)?\\p{L}+(?:ar|er|ir)'),
  se_pasivo: words('se\\s+(?:vende|venden|habla|hablan|dice|dicen|puede|pueden|prohíbe|prohíben|necesita|necesitan|permite|permiten|busca|buscan|alquila|alquilan)'),
  estilo_indirecto: words('dijo|dijeron|preguntó|preguntaron|explicó|contestó|respondió|aseguró'),
  basics_es_gustar: words('(?:me|te|le|nos|os|les)\\s+(?:gusta|gustan|encanta|encantan|interesa|interesan|molesta|molestan|duele|duelen|parece|parecen|importa|importan)'),
  basics_es_negacion: words('nunca|nadie|nada|tampoco|ningún|ninguno|ninguna|jamás'),
  basics_es_hace_desde: words('desde hace|hace\\s+\\p{L}+\\s+(?:años|meses|días|semanas|horas|minutos)|desde'),
  basics_es_hay_estar: words('hay|había|habrá'),
  basics_es_adverbios_mente: words('\\p{L}{4,}mente'),
  basics_es_gerundio: words('\\p{L}+(?:ando|iendo|yendo)'),
  basics_es_orden_pronombres: words('(?:se|me|te|nos)\\s+(?:lo|la|los|las)'),
  basics_es_pronombres_dobles_se_lo: words('(?:se|me|te|nos)\\s+(?:lo|la|los|las)'),
  basics_es_saber_conocer: words('sé|sabes|sabe|sabemos|saben|supe|conozco|conoces|conoce|conocemos|conocen|conocí'),
  basics_es_se_accidental: words('se\\s+(?:me|te|le|nos|os|les)\\s+(?:cayó|cayeron|olvidó|olvidaron|rompió|rompieron|perdió|perdieron|acabó|acabaron)'),
  basics_es_como_si_ojala: words('ojalá|como si'),
  basics_es_conectores_dele: words('asimismo|en cambio|de ahí que|por consiguiente|si bien|siempre y cuando'),
  // English
  present_perfect: words("(?:have|has|'ve)\\s+(?:never\\s+|already\\s+|just\\s+|ever\\s+|not\\s+)?(?:\\p{L}+ed|been|done|gone|seen|made|taken|had|got|come|become|known|written|read|met|said|told|found|lost|won|begun|left|kept|felt|heard|thought)"),
  basics_en_present_perfect_continuous: words("(?:have|has|'ve)\\s+been\\s+\\p{L}+ing"),
  basics_en_past_perfect: words("had\\s+(?:\\p{L}+ed|been|done|gone|seen|made|taken|had|come|known|written|said|told|found)"),
  basics_en_past_continuous: words('(?:was|were)\\s+\\p{L}+ing'),
  basics_en_present_continuous: words("(?:am|is|are|'m|'re)\\s+\\p{L}+ing"),
  basics_en_future: words("will\\s+\\p{L}+|going to\\s+\\p{L}+"),
  basics_en_used_to: words('used to'),
  basics_en_there_is: words('there\\s+(?:is|are|was|were)'),
  basics_en_question_tags: words("(?:isn't|aren't|don't|doesn't|didn't|won't|wasn't|weren't|haven't|hasn't|can't|couldn't|wouldn't)\\s+\\p{L}+(?=\\?)"),
  passive_en: words('(?:is|are|was|were|been|being|be)\\s+(?:\\p{L}+ly\\s+)?\\p{L}+(?:ed|en)'),
  modals_en: words("must|mustn't|can't|couldn't|needn't|should|shouldn't|ought to|have to|has to|had to"),
  basics_en_obligation: words("must|mustn't|should|shouldn't|ought to|have to|has to|had to|need to|needn't"),
  relatives_en: words('who|whom|whose|which'),
  basics_en_conditionals: words("if\\s+\\p{L}+"),
  conn_en: words('however|although|though|despite|in spite of|whereas|therefore|nevertheless|moreover|furthermore|consequently|even though'),
  reported_speech: words('(?:said|told|asked|explained|replied|answered)\\s+(?:\\p{L}+\\s+)?(?:that|if|whether|to)'),
  gerund_infinitive: words('(?:enjoy|avoid|suggest|mind|finish|keep|stop|remember|try)\\s+\\p{L}+ing|(?:want|decide|hope|plan|agree|refuse|manage)\\s+to\\s+\\p{L}+'),
  basics_en_comparatives: words('(?:more|less)\\s+\\p{L}+\\s+than|\\p{L}+er\\s+than|as\\s+\\p{L}+\\s+as'),
  basics_en_so_such_too_enough: words('(?:so|such)\\s+(?:a\\s+|an\\s+)?\\p{L}+\\s+that|too\\s+\\p{L}+\\s+to\\s+\\p{L}+|\\p{L}+\\s+enough\\s+to'),
  basics_en_modals_past_deduction: words("(?:must|can't|couldn't|might|may|should|shouldn't|needn't)\\s+have\\s+\\p{L}+"),
  basics_en_correlative_conjunctions: words('no sooner|hardly\\s+had|scarcely\\s+had|not only'),
}

/** Topics that have a pattern (the others have no "your own sentences" section unless they teach a tense). */
export const hasPattern = (topic: string): boolean => topic in PATTERNS

/** The words of a sentence worth showing: not a fragment, not a paragraph. */
const FIT = { minWords: 4, maxWords: 30, maxChars: 200 }

const fits = (sentence: string): boolean => {
  const n = sentence.split(/\s+/).length
  return n >= FIT.minWords && n <= FIT.maxWords && sentence.length <= FIT.maxChars
}

/** The most text of one source that is read (a book is long; the first pages show what a lesson needs). */
const MAX_CHARS = 20_000
/** The most text read for one lesson in all: a search that finds nothing must not read a whole library. */
const MAX_TOTAL = 120_000

/**
 * Sentences of the learner's own texts that show a lesson: for a lesson that teaches a tense the sentences with a form of
 * that tense (the text analysed as the reader does), for a topic with a pattern the sentences the pattern finds. Sources
 * are read in the order given (newest first is the way to ask) and the search stops at `max`; a sentence is never shown twice.
 */
export function ownExamples(language: TargetLanguage, topic: string, tense: Tense | undefined, sources: readonly OwnSource[], max = 3): OwnExample[] {
  const pattern = PATTERNS[topic]
  const byTense = !!tense && language !== 'en'
  if (!byTense && !pattern) return []
  const out: OwnExample[] = []
  const seen = new Set<string>()
  let scanned = 0
  for (const source of sources) {
    if (scanned >= MAX_TOTAL) break
    scanned += Math.min(source.text.length, MAX_CHARS)
    const analysis = analyzeText(source.text.slice(0, MAX_CHARS), language, [], [], new Set())
    const sentences = analysis.paragraphs.flat().map((s) => s.text.trim())
    const hits = new Map<number, string>()
    if (byTense) for (const f of textForms(language as 'fr' | 'es', analysis)) if (f.tense === tense && !hits.has(f.sentence)) hits.set(f.sentence, f.form)
    for (let i = 0; i < sentences.length && out.length < max; i++) {
      const sentence = sentences[i]!
      if (!fits(sentence) || seen.has(sentence.toLocaleLowerCase(language))) continue
      let mark: OwnExample['mark']
      if (byTense) {
        const form = hits.get(i)
        if (form === undefined) continue
        const at = sentence.toLocaleLowerCase(language).replace(/’/g, "'").indexOf(form)
        if (at >= 0) mark = { start: at, end: at + form.length }
      } else {
        const m = pattern!.exec(sentence.replace(/’/g, "'"))
        if (!m) continue
        mark = { start: m.index, end: m.index + m[0].length }
      }
      seen.add(sentence.toLocaleLowerCase(language))
      out.push({ sentence, source: source.title, ...(mark ? { mark } : {}) })
    }
    if (out.length >= max) break
  }
  return out
}
