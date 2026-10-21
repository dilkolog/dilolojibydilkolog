import { normalize, stripDiacritics } from './answerCheck'
import { timeOf, type TargetLanguage } from './types'

/**
 * Grammar questions: the basics of A1–A2 (the topics of the guide's basic lessons) and the hard points of B1–C1: a gap to fill, a choice, or an error to find.
 * Each carries its rule in Turkish, shown after the answer. Questions come from `src/data/grammar`
 * (own, and later imported open-licence sets); how the learner does is kept per question.
 */
export type GrammarType = 'cloze' | 'choice' | 'error'
export type GrammarLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1'

export interface GrammarExercise {
  id: string
  language: TargetLanguage
  level: GrammarLevel
  /** A key of TOPIC_NAME. */
  topic: string
  type: GrammarType
  /** The sentence; a cloze or choice marks its gap with "___", an error shows a sentence with one wrong word. */
  prompt: string
  /** The word(s) of the gap; for an error, the wrong word as it stands in the sentence (its first occurrence). */
  answer: string
  /** Other answers just as right. */
  alternatives?: string[]
  /** A choice's options (the answer among them). */
  options?: string[]
  /** An error's right word(s). */
  fix?: string
  /** What to think of, before answering ("faire → subjonctif présent"). */
  hint?: string
  /** The rule, in Turkish. */
  explanation: string
  /** Where it comes from (a licence line for imported sets). */
  source: string
}

export const TOPIC_NAME: Record<string, string> = {
  subjonctif: 'Subjonctif',
  participe_passe: 'Participe passé uyumu',
  pronoms_relatifs: 'Birleşik ilgi zamirleri',
  conditionnel_passe: 'Conditionnel passé ve şart',
  subjuntivo: 'Subjuntivo',
  ser_estar: 'Ser ve estar',
  por_para: 'Por ve para',
  se_pasivo: 'Se pasivo ve impersonal',
  condicionales: 'Şart cümleleri (si)',
  perifrasis: 'Perífrasis verbales',
  inversion: 'Devrik yapı (inversion)',
  cleft: 'Vurgulu cümle (cleft)',
  mixed_conditionals: 'Karma şart cümleleri',
  subjunctive: 'Subjunctive',
  participle_clauses: 'Participle clauses',
  gerund_infinitive: 'Gerund ve infinitive',
  conn_fr: 'Bağlaçlar (fikrin yönü)',
  conn_es: 'Bağlaçlar (fikrin yönü)',
  conn_en: 'Bağlaçlar (fikrin yönü)',
  prep_fr: 'Fiil ve edat (de / à)',
  prep_es: 'Fiil ve edat (de / en / a / con)',
  prep_en: 'Fiil, sıfat ve edat',
  colloc_fr: 'Eşdizimler (hangi fiil?)',
  colloc_es: 'Eşdizimler (hangi fiil?)',
  colloc_en: 'Eşdizimler (hangi fiil?)',
  pronoms_y_en: 'Zamirler: le / lui / y / en',
  articles_quantite: 'Partitif ve miktar ifadeleri',
  preterito_imperfecto: 'Pretérito ve imperfecto',
  pronombres_atonos: 'Zamirler: lo / la / le / se lo',
  articles_en: 'Artikeller (a / an / the)',
  reported_speech: 'Dolaylı anlatım (reported speech)',
  passe_imparfait: 'Passé composé ve imparfait',
  negation_fr: 'Olumsuzluk (ne … plus / jamais / rien)',
  relativos_es: 'İlgi zamirleri (que / quien / cuyo / donde)',
  comparativos_es: 'Karşılaştırma ve üstünlük',
  present_perfect: 'Present perfect ve past simple',
  modals_en: 'Modal fiiller (must / can’t / should)',
  discours_indirect_fr: 'Dolaylı anlatım ve zaman uyumu',
  futur_fr: 'Gelecek zamanlar (futur, futur proche, futur antérieur)',
  estilo_indirecto: 'Dolaylı anlatım (estilo indirecto)',
  imperativo_es: 'Emir kipi ve zamirler',
  passive_en: 'Edilgen yapı (passive)',
  relatives_en: 'İlgi cümleleri (who / which / whose / where)',
  basics_fr_articles: 'Artikeller ve cinsiyet (le / la / un / une)',
  basics_fr_etre_avoir: 'Être ve avoir',
  basics_fr_present: 'Şimdiki zaman (présent)',
  basics_fr_negation: 'Olumsuz cümle (ne … pas)',
  basics_fr_possessifs: 'İyelik ve işaret sıfatları',
  basics_fr_questions: 'Soru sözcükleri ve soru kurma',
  basics_fr_passe_compose: 'Passé composé',
  basics_fr_adjectifs: 'Sıfatlar: uyum ve yer',
  basics_fr_lieux: 'Yer edatları',
  basics_fr_depuis: 'Süre: depuis / il y a / pendant / dans',
  basics_es_articulos: 'Artikeller ve cinsiyet (el / la / un / una)',
  basics_es_presente: 'Şimdiki zaman (presente)',
  basics_es_gustar: 'Gustar ve benzeri fiiller',
  basics_es_negacion: 'Olumsuzluk (no / nada / nadie)',
  basics_es_posesivos: 'İyelik ve işaret sıfatları',
  basics_es_preguntas: 'Soru sözcükleri',
  basics_es_hay_estar: 'Hay mı, está mı?',
  basics_es_reflexivos: 'Dönüşlü fiiller',
  basics_es_adjetivos: 'Sıfatlar: uyum ve yer',
  basics_es_preterito: 'Pretérito indefinido',
  basics_en_to_be: 'To be (am / is / are)',
  basics_en_present_simple: 'Present simple',
  basics_en_pronouns: 'Zamirler ve iyelik',
  basics_en_there_is: 'There is / there are',
  basics_en_demonstratives: 'This / that / these / those',
  basics_en_questions: 'Soru sözcükleri',
  basics_en_time_prepositions: 'Zaman edatları (in / on / at)',
  basics_en_past_simple: 'Past simple',
  basics_en_comparatives: 'Karşılaştırma (-er / more / the -est)',
  basics_en_past_continuous: "Past continuous ve past simple (when / while)",
  basics_en_ability: "Yetenek: can / could / be able to",
  basics_en_obligation: "Zorunluluk: have to ve must",
  basics_en_place_prepositions: "Yer ve hareket edatları (in / on / at, into, through)",
  basics_en_conditionals: "Birinci ve ikinci koşul cümleleri (if / unless)",
  basics_en_used_to: "Used to, would, be used to, get used to",
  basics_en_past_perfect: "Past perfect (had done)",
  basics_en_question_tags: "Soru ekleri (question tags)",
  basics_en_third_conditional: "Üçüncü koşul ve wish / if only",
  basics_en_future_perfect: "Future continuous ve future perfect",
  basics_en_causative: "Ettirgen yapı: have / get something done",
  basics_en_present_continuous: "Şimdiki zaman (present continuous)",
  basics_en_future_continuous: "Future continuous (will be doing)",
  basics_en_past_perfect_continuous: "Past perfect continuous (had been doing)",
  basics_en_preferences: "Tercih ve uyarı: would rather / prefer / had better",
  basics_en_emphasis: "Vurgu: do / does / did, so / such",
  basics_en_ellipsis: "Kısa cevaplar: so do I, neither, I think so",
  basics_en_phrasal_verbs: "Phrasal verb'ler: ayrılabilen ve ayrılmayan",
  basics_en_future_in_past: "Geçmişteki gelecek (was going to, would, was about to)",
  basics_en_future_perfect_continuous: "Future perfect continuous (will have been doing)",
  basics_en_unreal_past: "Gerçek dışı geçmiş: it's time, as if, suppose",
  basics_en_noun_phrases: "Yoğun yazı dili: isimleştirme ve kısaltılmış ilgi cümleleri",
  basics_en_register: "Resmî ve gündelik dil (register)",
  basics_en_plurals_quantifiers: "Çoğullar ve miktar sözcükleri",
  basics_en_future: "Gelecek zaman (will / going to)",
  basics_es_pronombres: "Kişi zamirleri (yo, mí, conmigo)",
  basics_es_numeros_hora: "Sayılar, saat ve tarih",
  basics_es_perfecto_indefinido: "He hecho mu, hice mi? Zaman işaretleri",
  basics_es_futuro: "Gelecek: ir a, futuro simple ve tahmin",
  basics_es_hace_desde: "Süre: hace, desde, desde hace, llevar",
  basics_es_pluscuamperfecto: "Miş'li geçmiş: había hecho (pluscuamperfecto)",
  basics_es_gerundio: "Gerundio ve İngilizce -ing tuzakları",
  basics_es_orden_pronombres: "Zamir sırası, kazara se ve leísmo",
  basics_es_adverbios_mente: "-mente ile zarflar",
  basics_es_imperfecto_subjuntivo: "İmperfecto de subjuntivo (-ra / -se)",
  basics_es_finales_concesivas: "Amaç ve taviz: para que, aunque",
  basics_es_subjuntivo_compuesto: "Bileşik subjuntivo: haya hecho, hubiera hecho",
  basics_es_marcadores: "Yazıda söylem belirleyicileri (no obstante, por consiguiente)",
  basics_es_subjuntivo_relativo: "İlgi cümlesinde kip: busco a alguien que sepa",
  basics_es_verbos_cambio: "Değişim fiilleri: ponerse, volverse, hacerse, quedarse",
  basics_es_temporales: "Zaman cümleleri: cuando llegues, en cuanto, hasta que",
  basics_es_lo_neutro: "lo + sıfat ve lo que: lo bueno es que…",
  basics_es_pasiva_ser_estar: "Edilgen: ser + ortaç ve estar + ortaç",
  basics_es_probabilidad: "Tahmin: serán las ocho, estaría cansado",
  basics_es_registro_formal: "Resmî yazışma: usted ve nezaket kalıpları",
  basics_es_condicion_alternativa: "Şartın diğer yolları: en caso de que, a no ser que, como, de + mastar",
  basics_es_oraciones_hendidas: "Vurgulu cümleler: fue Ana quien…, lo que necesito es…",
  basics_fr_pronoms: "Kişi zamirleri ve vurgulu zamirler",
  basics_fr_nombres: "Sayılar, saat ve tarih",
  basics_fr_pronominaux: "Dönüşlü fiiller (se lever)",
  basics_fr_comparaison: "Karşılaştırma ve en üstünlük",
  basics_fr_imperatif: "Emir kipi",
  basics_fr_plus_que_parfait: "Plus-que-parfait (geçmişin geçmişi)",
  basics_fr_gerondif: "Gérondif ve participe présent",
  basics_fr_ordre_pronoms: "İki zamir bir arada (me le, le lui)",
  basics_fr_adverbes: "-ment zarfları: kuruluş ve yer",
  basics_fr_subjonctif_passe: "Subjonctif passé ve subjonctiften kaçınma",
  basics_fr_passif: "Edilgen çatı (être + ortaç, on, se faire)",
  basics_fr_passe_simple: "Passé simple (okurken tanımak)",
  basics_fr_concession: "Taviz ve nüans: quoique, encore que, si … que",
  basics_fr_mise_en_relief: "Vurgu yapıları: c'est … qui / que, ce qui … c'est",
  basics_fr_cause_consequence: "Neden ve sonuç: étant donné que, faute de, si bien que",
  basics_fr_demonstratifs: "İşaret zamirleri: celui, celle-ci, ceci, cela",
  basics_fr_faire_causatif: "Yaptırmak: faire + mastar, laisser + mastar",
  basics_fr_registres: "Resmî ve gündelik dil (registres)",
  basics_fr_ne_expletif: "Ne explétif (olumsuz anlam taşımayan ne)",
  basics_fr_nominalisation: "Adlaştırma (nominalisation)",
  basics_fr_hypothese: "Si'siz varsayım: au cas où, à supposer que, quand bien même",
  basics_fr_subjonctif_imparfait: "Subjonctif imparfait ve plus-que-parfait (okurken tanımak)",
  rewrite_fr: 'Cümle dönüşümü',
  rewrite_es: 'Cümle dönüşümü',
  rewrite_en: 'Cümle dönüşümü',
}

export const topicName = (topic: string) => TOPIC_NAME[topic] ?? topic

export type GrammarVerdict = 'correct' | 'near' | 'wrong'

/** A typed answer without the sentence's quote marks, final dot and stray spaces. */
const clean = (s: string) => normalize(s.replace(/[’‘]/g, "'").replace(/[.!?]+$/g, ''))

/**
 * Whether the answer is right. A gap or an error: the word(s) exactly (case and spacing aside);
 * the same with other accents is "near" (right word, careless accent: counts, but is said).
 */
export function checkGrammar(ex: GrammarExercise, given: string): GrammarVerdict {
  const g = clean(given)
  if (!g) return 'wrong'
  const accepted = [ex.answer, ...(ex.alternatives ?? [])].map(clean)
  if (accepted.includes(g)) return 'correct'
  const bare = stripDiacritics(g)
  return accepted.some((a) => stripDiacritics(a) === bare) ? 'near' : 'wrong'
}

/** The prompt with its gap filled by `word` (the verb in brackets after the gap goes), for showing the whole sentence after the answer. */
export const filled = (ex: GrammarExercise, word: string) => (ex.type === 'error' ? ex.prompt : ex.prompt.replace(/___(\s*\([^)]*\))?/, () => word))

/** A sentence cut into words (tappable) and what lies between them; the wrong word of an error is the first that reads like its answer. */
export function sentenceTokens(ex: GrammarExercise): { text: string; word: boolean; wrong: boolean }[] {
  const parts = ex.prompt.match(/[\p{L}\p{M}]+|[^\p{L}\p{M}]+/gu) ?? []
  let found = false
  return parts.map((text) => {
    const word = /^[\p{L}\p{M}]/u.test(text)
    const wrong = word && !found && ex.type === 'error' && clean(text) === clean(ex.answer)
    if (wrong) found = true
    return { text, word, wrong }
  })
}

/** What the learner has done with each question. */
export interface GrammarRecord {
  ok: number
  wrong: number
  /** Last tried (ISO). */
  last: string
  /** Right answers in a row since the last wrong one; older records lack it (see `streakOf`). */
  streak?: number
}
export type GrammarLog = Record<string, GrammarRecord>

export function recordGrammar(log: GrammarLog, id: string, correct: boolean, now: Date): GrammarLog {
  const had = log[id]
  return { ...log, [id]: { ok: (had?.ok ?? 0) + (correct ? 1 : 0), wrong: (had?.wrong ?? 0) + (correct ? 0 : 1), last: now.toISOString(), streak: correct ? (had ? streakOf(had) : 0) + 1 : 0 } }
}

/** Right answers in a row; a record from before streaks counts as one if it was more often right than wrong. */
export const streakOf = (r: GrammarRecord) => r.streak ?? (r.ok > r.wrong ? 1 : 0)

/** Days until a question is due again, by how many times in a row it was answered right (0 = last time wrong). */
const GRAMMAR_GAPS = [1, 3, 7, 16, 35, 90]

/** When a tried question is due again (ms), or undefined for one never tried. */
export function grammarDueAt(r: GrammarRecord | undefined): number | undefined {
  if (!r) return undefined
  const last = timeOf(r.last)
  return Number.isFinite(last) ? last + GRAMMAR_GAPS[Math.min(streakOf(r), GRAMMAR_GAPS.length - 1)] * 86_400_000 : undefined
}

/** The tried questions that are due now, the longest overdue first. */
export function dueGrammar<T extends { id: string }>(pool: readonly T[], log: GrammarLog, now: Date): T[] {
  const due = pool.flatMap((e) => {
    const at = grammarDueAt(log[e.id])
    return at !== undefined && at <= now.getTime() ? [{ e, at }] : []
  })
  return due.sort((a, b) => a.at - b.at).map((d) => d.e)
}

/** Two devices' logs together: per question, the larger counts and the later try. */
export function mergeGrammarLogs(a: GrammarLog = {}, b: GrammarLog = {}): GrammarLog {
  const out: GrammarLog = { ...a }
  for (const [id, r] of Object.entries(b)) {
    const had = out[id]
    if (!had) {
      out[id] = r
      continue
    }
    // The streak belongs to the later try.
    const later = timeOf(r.last) > timeOf(had.last) ? r : had
    out[id] = { ok: Math.max(had.ok, r.ok), wrong: Math.max(had.wrong, r.wrong), last: later.last, ...(later.streak !== undefined && { streak: later.streak }) }
  }
  return out
}

export interface TopicStat {
  topic: string
  answered: number
  /** Share right, 0–1. */
  accuracy: number
}

/** Per topic of the given exercises: how much was answered and how well, weakest first (untouched topics last). */
export function topicStats(log: GrammarLog, exercises: readonly GrammarExercise[]): TopicStat[] {
  const by = new Map<string, { ok: number; wrong: number }>()
  for (const ex of exercises) {
    const t = by.get(ex.topic) ?? { ok: 0, wrong: 0 }
    const r = log[ex.id]
    by.set(ex.topic, { ok: t.ok + (r?.ok ?? 0), wrong: t.wrong + (r?.wrong ?? 0) })
  }
  return [...by.entries()]
    .map(([topic, t]) => ({ topic, answered: t.ok + t.wrong, accuracy: t.ok + t.wrong ? t.ok / (t.ok + t.wrong) : 1 }))
    .sort((a, b) => Number(a.answered === 0) - Number(b.answered === 0) || a.accuracy - b.accuracy || b.answered - a.answered)
}

/** Questions in one round. */
export const GRAMMAR_ROUND = 8

/**
 * A round of items: the ones never tried and the ones more often wrong than right come first,
 * then the rest, the longest untried first; no item twice.
 */
export function pickWeighted<T extends { id: string }>(pool: readonly T[], log: GrammarLog, rng: () => number, size: number): T[] {
  const weight = (e: T) => {
    const r = log[e.id]
    if (!r) return 3
    if (r.wrong > r.ok) return 4
    return 1 / (1 + r.ok - r.wrong)
  }
  const chosen: T[] = []
  const left = [...pool]
  while (chosen.length < size && left.length) {
    const total = left.reduce((n, e) => n + weight(e), 0)
    let at = rng() * total
    let i = 0
    while (i < left.length - 1 && (at -= weight(left[i])) > 0) i++
    chosen.push(left.splice(i, 1)[0])
  }
  return chosen
}

/** A round of grammar questions (see pickWeighted); a topic can be asked for. */
export function pickGrammarRound(
  exercises: readonly GrammarExercise[],
  log: GrammarLog,
  rng: () => number,
  { topic, size = GRAMMAR_ROUND, due, now = new Date() }: { topic?: string; size?: number; due?: boolean; now?: Date } = {},
): GrammarExercise[] {
  if (due) return dueGrammar(exercises.filter((e) => !topic || e.topic === topic), log, now).slice(0, size)
  return pickWeighted(
    exercises.filter((e) => !topic || e.topic === topic),
    log,
    rng,
    size,
  )
}
