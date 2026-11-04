import { conjugateTense, LAB_TENSES, type Tense } from './tenses'

/**
 * Transform pairs: one sentence written twice, before and after a move between tenses (now to then,
 * reported speech, si clauses, the subjunctive's sequence, finished-before). Hand-written in
 * docs/veri/donusum-ciftleri/*.tsv, checked against the verb tables by scripts/add-transform-pairs.ts
 * and stored in src/data/transforms/{fr,es}.json. The same checks run again in the data test.
 */
export type TransformKind = 'temel' | 'aktarim' | 'kosul' | 'uyum' | 'bitmislik'
export const TRANSFORM_KINDS: TransformKind[] = ['temel', 'aktarim', 'kosul', 'uyum', 'bitmislik']

export interface TransformPair {
  id: string
  verb: string
  kind: TransformKind
  from: Tense
  to: Tense
  /** The source sentence, the verb in [brackets]. */
  source: string
  /** The target sentence, the verb in [brackets]. */
  target: string
  /** The target sentence in Turkish. */
  tr: string
  /** The persons both forms can be. */
  persons: number[]
}

type Lang = 'fr' | 'es'
type Move = [Tense, Tense]

/** Both ways for every pair. */
const both = (pairs: Move[]): Move[] => pairs.flatMap(([a, b]) => [[a, b] as Move, [b, a] as Move])
/** Every forward step in a chain (a → b, b → c, a → c). */
const chain = (...tenses: Tense[]): Move[] => tenses.flatMap((a, i) => tenses.slice(i + 1).map((b) => [a, b] as Move))

/** The moves each kind allows (docs/GOREV-DONUSUM-CIFTLERI.md §4). */
export const KIND_MOVES: Record<Lang, Record<TransformKind, Move[]>> = {
  fr: {
    temel: both([
      ['present', 'passe-compose'],
      ['present', 'imparfait'],
      ['present', 'futur'],
      ['passe-compose', 'futur'],
    ]),
    aktarim: [
      ['present', 'imparfait'],
      ['passe-compose', 'plus-que-parfait'],
      ['futur', 'conditionnel'],
      ['futur-anterieur', 'conditionnel-passe'],
    ],
    kosul: [...chain('present', 'imparfait', 'plus-que-parfait'), ...chain('futur', 'conditionnel', 'conditionnel-passe')],
    // Modern French keeps the present subjunctive after a past main verb: only the finished one is a move.
    uyum: [['subjonctif', 'subjonctif-passe']],
    bitmislik: [
      ['passe-compose', 'plus-que-parfait'],
      ['futur', 'futur-anterieur'],
    ],
  },
  es: {
    temel: both([
      ['presente', 'preterito'],
      ['presente', 'imperfecto'],
      ['presente', 'futuro'],
      ['preterito', 'perfecto'],
      ['preterito', 'futuro'],
    ]),
    aktarim: [
      ['presente', 'imperfecto'],
      ['preterito', 'pluscuamperfecto'],
      ['perfecto', 'pluscuamperfecto'],
      ['futuro', 'condicional'],
      ['subjuntivo', 'subjuntivo-imperfecto'],
    ],
    kosul: [...chain('presente', 'subjuntivo-imperfecto', 'subjuntivo-pluscuamperfecto'), ...chain('futuro', 'condicional', 'condicional-perfecto')],
    uyum: [['subjuntivo', 'subjuntivo-imperfecto']],
    bitmislik: [
      ['perfecto', 'pluscuamperfecto'],
      ['preterito', 'pluscuamperfecto'],
      ['futuro', 'futuro-perfecto'],
    ],
  },
}

export const moveAllowed = (lang: Lang, kind: TransformKind, from: Tense, to: Tense) => KIND_MOVES[lang][kind].some(([a, b]) => a === from && b === to)

/** Lower case, the typographic apostrophe as the plain one, single spaces. */
export const normForm = (s: string) => s.toLocaleLowerCase().replace(/[’']/g, "'").replace(/\s+/g, ' ').trim()

/** The text in [brackets] when there is exactly one pair of them, else undefined. */
export function bracketed(sentence: string): string | undefined {
  const all = [...sentence.matchAll(/\[([^\]]+)\]/g)]
  return all.length === 1 && !/[[\]]/.test(sentence.replace(/\[[^\]]+\]/, '')) ? all[0][1] : undefined
}

export const plain = (sentence: string) => sentence.replace(/[[\]]/g, '')

/** The persons whose form in the tense is this one. */
export function personsOf(lang: Lang, verb: string, tense: Tense, form: string): number[] {
  const forms = conjugateTense({ language: lang, lemma: verb, partOfSpeech: 'verb' }, tense)
  if (!forms) return []
  const want = normForm(form)
  return forms.flatMap((f, i) => (f && normForm(f) === want ? [i] : []))
}

/** A short stable digest (FNV-1a) for ids. */
export function digest(text: string): string {
  let h = 0x811c9dc5
  for (const ch of normForm(text)) {
    h ^= ch.codePointAt(0)!
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h.toString(36)
}

export const pairId = (lang: Lang, verb: string, from: Tense, to: Tense, source: string) => `${lang}|${verb}|${from}>${to}|${digest(plain(source))}`

export interface PairInput {
  verb: string
  kind: string
  from: string
  to: string
  source: string
  target: string
  tr: string
}

/**
 * Checks one pair (the rules of §5, in order): the reason it is refused, or the persons both forms
 * share. Whether the source sentence repeats is the caller's to check (it needs the other pairs).
 */
export function checkPair(lang: Lang, p: PairInput): { error: string } | { persons: number[]; warning?: string } {
  if (!(TRANSFORM_KINDS as string[]).includes(p.kind)) return { error: `unknown kind "${p.kind}"` }
  const kind = p.kind as TransformKind
  const tenses = LAB_TENSES[lang] as string[]
  if (!tenses.includes(p.from) || !tenses.includes(p.to)) return { error: `unknown tense ${p.from} → ${p.to}` }
  const from = p.from as Tense
  const to = p.to as Tense
  if (!moveAllowed(lang, kind, from, to)) return { error: `${from} → ${to} is not a ${kind} move` }
  const entry = { language: lang, lemma: p.verb, partOfSpeech: 'verb' as const }
  if (!conjugateTense(entry, from)?.some(Boolean) || !conjugateTense(entry, to)?.some(Boolean)) return { error: `no ${from}/${to} table for "${p.verb}"` }
  const a = bracketed(p.source)
  const b = bracketed(p.target)
  if (a === undefined) return { error: 'the source needs exactly one [form]' }
  if (b === undefined) return { error: 'the target needs exactly one [form]' }
  const pa = personsOf(lang, p.verb, from, a)
  if (!pa.length) return { error: `"${a}" is no ${from} form of ${p.verb} (${conjugateTense(entry, from)?.join(', ')})` }
  const pb = personsOf(lang, p.verb, to, b)
  if (!pb.length) return { error: `"${b}" is no ${to} form of ${p.verb} (${conjugateTense(entry, to)?.join(', ')})` }
  const persons = pa.filter((x) => pb.includes(x))
  if (!persons.length) return { error: `"${a}" (persons ${pa}) and "${b}" (persons ${pb}) share no person` }
  if (normForm(a) === normForm(b)) return { error: 'both forms are the same' }
  if (!p.tr.trim()) return { error: 'no Turkish' }
  return { persons, warning: siWarning(p.target, to) ?? siWarning(p.source, from) }
}

const NO_SI: Partial<Record<Tense, true>> = { futur: true, conditionnel: true, 'conditionnel-passe': true, futuro: true, condicional: true, 'condicional-perfecto': true }

/** A future or conditional within three words after "si" (never said in a si clause). */
function siWarning(sentence: string, tense: Tense): string | undefined {
  if (!NO_SI[tense]) return undefined
  const words = sentence.split(/\s+/)
  const at = words.findIndex((w) => /^(si|s['’]il|s['’]ils)$/i.test(w.replace(/^[¿¡«"]+/, '')))
  if (at < 0) return undefined
  const near = words.slice(at, at + 4).join(' ')
  return /\[/.test(near) ? `${tense} right after "si" in "${plain(sentence)}"` : undefined
}
