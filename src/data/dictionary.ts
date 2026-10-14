import { normalize, splitArticle, stripDiacritics } from '../engine/answerCheck'
import type { PartOfSpeech, TargetLanguage, VocabularyEntry } from '../engine/types'
import { baseForm, packKeys } from './wordpack'
import type { Pack, PackRecord } from './wordpackBuild'

/**
 * Looking words up in the word pack (wordpack.ts), whether or not they are in the learner's list:
 * the word itself (with or without its article, with or without accents), words that start the
 * same way, and the other way round, foreign words whose Turkish meaning is the one typed.
 * The pack lists words most frequent first, so that order is the ranking everywhere.
 */
export interface DictHit {
  /** The pack's key: the bare, lowercased word. */
  word: string
  rec: PackRecord
  /** Position in the frequency list (1 = most frequent). */
  rank: number
  /** Whether this hit is in the learner's personal vocabulary. */
  isOwn?: boolean
}

export interface DictIndex {
  language: TargetLanguage
  pack: Pack
  keys: string[]
  folded: string[]
  /** Keys present in the learner's personal vocabulary. */
  ownKeys: Set<string>
  /** Own words the pack lacks: their records, built from the learner's entries. */
  extra?: Map<string, PackRecord>
  /** Each Turkish meaning (folded) with the words that carry it: position in the pack and in the word's own meanings. */
  turkish: Map<string, { at: number; order: number }[]>
}

export interface DictResult {
  exact?: DictHit
  /** What was typed, when it is an inflected form of `exact` (allons for aller). */
  form?: string
  /** The word `exact` is also a form of, when it is a word of its own too ("Allons !", and a form of aller). */
  alsoFormOf?: string
  /** Other words starting the same way, most frequent first. */
  similar: DictHit[]
  /** Words whose Turkish meaning matches what was typed. */
  fromTurkish: DictHit[]
  /** The Turkish word they were found through, when it took away a suffix ("gittim" → gitmek). */
  turkishAs?: string
}

const LIMIT = 8

const POS_TO_LETTER: Partial<Record<PartOfSpeech, string>> = {
  noun: 'n',
  verb: 'v',
  adjective: 'a',
  adverb: 'd',
  preposition: 'p',
  conjunction: 'c',
  pronoun: 'r',
  phrase: 'h',
}

export function entryToRecord(entry: VocabularyEntry): PackRecord {
  const meanings = entry.senses.map((s) => s.gloss).concat(entry.senses.flatMap((s) => s.altGlosses ?? []))
  const examples = entry.senses.flatMap((s) => s.examples)
  return {
    t: meanings.length ? meanings : undefined,
    i: entry.ipa || undefined,
    a: entry.audioUrl || undefined,
    e: entry.etymology || undefined,
    s: entry.synonyms?.length ? entry.synonyms : undefined,
    n: entry.antonyms?.length ? entry.antonyms : undefined,
    x: entry.translations && Object.keys(entry.translations).length ? entry.translations : undefined,
    p: entry.partOfSpeech && entry.partOfSpeech !== 'other' ? POS_TO_LETTER[entry.partOfSpeech] : undefined,
    g: entry.gender === 'mf' ? 'e' : entry.gender,
    c: examples.length ? examples.map((e) => [e.text, e.translation ?? ''] as [string, string]) : undefined,
  }
}

/** Case, accents and the Turkish dotless i don't matter when searching: Décider = decider, KOŞMAK = kosmak. */
export const fold = (s: string) => stripDiacritics(s.trim().toLocaleLowerCase('tr')).replace(/ı/g, 'i').replace(/\s+/g, ' ')

/** The pack's own index: built once per pack (it is the slow part, tens of milliseconds), then reused. */
interface BaseIndex {
  keys: string[]
  folded: string[]
  turkish: Map<string, { at: number; order: number }[]>
  position: Map<string, number>
}
const bases = new WeakMap<Pack, BaseIndex>()

function baseIndex(pack: Pack): BaseIndex {
  let base = bases.get(pack)
  if (!base) {
    const keys = Object.keys(pack.w)
    const turkish = new Map<string, { at: number; order: number }[]>()
    keys.forEach((k, i) => {
      for (const [order, m] of (pack.w[k].t ?? []).entries()) {
        const f = fold(m)
        const list = turkish.get(f) ?? []
        if (!list.some((x) => x.at === i)) list.push({ at: i, order })
        turkish.set(f, list)
      }
    })
    base = { keys, folded: keys.map(fold), turkish, position: new Map(keys.map((k, i) => [k, i])) }
    bases.set(pack, base)
  }
  return base
}

/**
 * The search index: the pack's (cached), with the learner's own words laid over it: a word the
 * pack lacks is added at the end, and every own word's Turkish meanings find it first. Only the
 * own words are worked through on each call, so a changed word list costs little.
 */
export function buildIndex(pack: Pack, language: TargetLanguage, vocabulary?: readonly VocabularyEntry[]): DictIndex {
  const base = baseIndex(pack)
  const own: { entry: VocabularyEntry; key: string }[] = []
  for (const entry of vocabulary ?? []) {
    if (entry.language !== language) continue
    const key = splitArticle(normalize(entry.lemma).toLocaleLowerCase(language), language).rest
    if (key) own.push({ entry, key })
  }
  if (!own.length) return { language, pack, keys: base.keys, folded: base.folded, ownKeys: new Set(), turkish: base.turkish }

  const keys = [...base.keys]
  const folded = [...base.folded]
  const extra = new Map<string, PackRecord>()
  const position = (key: string) => base.position.get(key) ?? keys.indexOf(key, base.keys.length)
  for (const { entry, key } of own) {
    if (Object.hasOwn(pack.w, key) || extra.has(key)) continue
    extra.set(key, entryToRecord(entry))
    keys.push(key)
    folded.push(fold(key))
  }
  // Copy only the meaning lists that change; the rest are shared with the cached index.
  const turkish = new Map(base.turkish)
  const add = (meaning: string, at: number, first: boolean) => {
    const f = fold(meaning)
    const list = turkish.get(f) ?? []
    if (list.some((x) => x.at === at)) return
    turkish.set(f, first ? [{ at, order: 0 }, ...list] : [...list, { at, order: 0 }])
  }
  for (const { entry, key } of own) {
    const at = position(key)
    if (at < 0) continue
    for (const sense of entry.senses) for (const m of [sense.gloss, ...(sense.altGlosses ?? [])]) add(m, at, true)
  }
  return { language, pack, keys, folded, ownKeys: new Set(own.map((o) => o.key)), turkish, extra }
}

const hit = (index: DictIndex, i: number): DictHit => ({
  word: index.keys[i],
  rec: index.extra?.get(index.keys[i]) ?? index.pack.w[index.keys[i]],
  rank: i + 1,
  isOwn: index.ownKeys.has(index.keys[i]),
})

export function search(index: DictIndex, query: string): DictResult {
  const q = fold(query)
  if (!q) return { similar: [], fromTurkish: [] }
  const { language } = index
  const bare = fold(splitArticle(normalize(query).toLocaleLowerCase(language), language).rest)

  // The word itself: as written first, then without accents (decider → décider).
  let exactAt = packKeys(query, language).map((k) => index.keys.indexOf(k)).find((i) => i >= 0) ?? -1
  if (exactAt < 0) exactAt = index.folded.findIndex((f) => f === bare || f === q)
  // An inflected form: the word it belongs to (allons → aller, went → go).
  let form: string | undefined
  if (exactAt < 0) {
    const base = baseForm(index.pack, query, language)
    if (base) {
      exactAt = index.keys.indexOf(base)
      form = query.trim()
    }
  }
  const exact = exactAt >= 0 ? hit(index, exactAt) : undefined

  const similar: DictHit[] = []
  for (let i = 0; i < index.keys.length && similar.length < LIMIT; i++) {
    if (i !== exactAt && index.folded[i].startsWith(bare) && index.folded[i] !== bare) similar.push(hit(index, i))
  }

  // Turkish to foreign: the meaning exactly ("ev"), wherever it stands among the word's meanings;
  // as a whole word of it ("karar" in "karar vermek") or, from three letters on, as its beginning
  // ("kara"), only among the word's first two meanings: further down they are side senses
  // (souris: "ev faresi" fourth). Then the word's own order, then frequency.
  const MAIN = 2
  const score = (meaning: string, order: number) => {
    if (meaning === q) return 0
    if (order >= MAIN) return Infinity
    if (meaning.split(' ').includes(q)) return 1
    if (q.length >= 3 && meaning.startsWith(q)) return 2
    return Infinity
  }
  const best = new Map<number, [number, number]>()
  for (const [meaning, carriers] of index.turkish) {
    for (const { at, order } of carriers) {
      const s = score(meaning, order)
      if (s === Infinity || at === exactAt) continue
      const was = best.get(at)
      if (!was || s < was[0] || (s === was[0] && order < was[1])) best.set(at, [s, order])
    }
  }
  let fromTurkish = [...best]
    .sort((a, b) => a[1][0] - b[1][0] || a[1][1] - b[1][1] || a[0] - b[0])
    .slice(0, LIMIT)
    .map(([i]) => hit(index, i))
  // Nothing for the word as typed: an inflected Turkish word, looked up by its root (evler → ev, gittim → gitmek).
  let turkishAs: string | undefined
  if (!fromTurkish.length && q.length >= 4) {
    for (const base of turkishBases(q)) {
      const carriers = index.turkish.get(base)
      if (!carriers) continue
      fromTurkish = [...carriers]
        .filter((c) => c.at !== exactAt)
        .sort((a, b) => a.order - b.order || a.at - b.at)
        .slice(0, LIMIT)
        .map((c) => hit(index, c.at))
      if (fromTurkish.length) {
        turkishAs = base
        break
      }
    }
  }

  const also = exact && !form ? index.pack.f?.[exact.word] : undefined
  return { exact, ...(form ? { form } : {}), ...(also && also !== exact?.word && (index.pack.w[also] || index.extra?.has(also)) ? { alsoFormOf: also } : {}), similar, fromTurkish, ...(turkishAs ? { turkishAs } : {}) }
}

/**
 * Turkish suffixes, folded like the index (no ı, ö, ü, ş, ç, ğ), longest first: verb endings
 * (gidiyorum, gittim, gidecek, gitmiş, giderim) and noun endings (evler, evde, evden, evim).
 */
const SUFFIXES = [
  'iyorsunuz', 'iyorlar', 'iyorum', 'iyorsun', 'iyoruz', 'uyorum', 'uyorsun', 'uyoruz', 'uyorlar', 'iyor', 'uyor', 'yor',
  'eceksiniz', 'acaksiniz', 'ecegim', 'acagim', 'ecegiz', 'acagiz', 'ecekler', 'acaklar', 'eceksin', 'acaksin', 'ecek', 'acak',
  'dikleri', 'tikleri', 'diniz', 'tiniz', 'dunuz', 'tunuz', 'diler', 'tiler', 'dular', 'tular',
  'dim', 'din', 'dik', 'tim', 'tin', 'tik', 'dum', 'dun', 'duk', 'tum', 'tun', 'tuk', 'di', 'ti', 'du', 'tu',
  'misim', 'mussun', 'mislar', 'misler', 'mis', 'mus', 'meli', 'mali', 'abil', 'ebil',
  'lerinden', 'larindan', 'lerinde', 'larinda', 'lerini', 'larini', 'lerin', 'larin', 'leri', 'lari', 'ler', 'lar',
  'imiz', 'umuz', 'iniz', 'unuz', 'nden', 'ndan', 'nde', 'nda', 'den', 'dan', 'ten', 'tan', 'de', 'da', 'te', 'ta',
  'nin', 'nun', 'yla', 'yle', 'la', 'le', 'yi', 'yu', 'ya', 'ye', 'si', 'su', 'im', 'um', 'in', 'un',
  'ir', 'ur', 'ar', 'er', 'i', 'u', 'a', 'e',
]

/** A root's final consonant before a vowel suffix is softened (git → gid-iyor, kitap → kitab-ı): back to the hard one. */
// The words are folded (ç → c), so a softened ç (ağaç → ağac-ı) shows as c and goes back to c.
const HARDEN: Record<string, string> = { d: 't', b: 'p', g: 'k', c: 'c' }

/**
 * Where an inflected Turkish word (folded) may come from, nearest first: its roots with up to two
 * suffixes taken away, each as it is, with its final consonant hardened, and as a verb (+mak/+mek).
 */
export function turkishBases(word: string): string[] {
  const roots: string[] = []
  let layer = [word]
  for (let depth = 0; depth < 2; depth++) {
    const next: string[] = []
    for (const w of layer)
      for (const suffix of SUFFIXES)
        if (w.endsWith(suffix) && w.length - suffix.length >= 2) {
          const root = w.slice(0, -suffix.length)
          if (!roots.includes(root)) {
            roots.push(root)
            next.push(root)
          }
        }
    layer = next
  }
  const out: string[] = []
  for (const root of roots) {
    const hard = HARDEN[root.slice(-1)] ? root.slice(0, -1) + HARDEN[root.slice(-1)] : root
    for (const r of [...new Set([root, hard])]) out.push(r, `${r}mek`, `${r}mak`)
  }
  return [...new Set(out)].filter((b) => b !== word)
}

/** Wiktionary's page for the word, at the section of its language. */
export function wiktionaryUrl(word: string, language: TargetLanguage): string {
  const section = { en: 'English', fr: 'French', es: 'Spanish' }[language]
  return `https://en.wiktionary.org/wiki/${encodeURIComponent(word)}#${section}`
}

/**
 * The day's word: one of the 300th–4000th most frequent words (common enough to meet, past the
 * ones everybody knows) that has a Turkish meaning and a part of speech and is not in the learner's
 * list yet. The same all day (from the day's seed), and another tomorrow.
 */
export function wordOfTheDay(index: DictIndex, seed: number): DictHit | undefined {
  const from = 300
  const to = Math.min(4000, Object.keys(index.pack.w).length)
  const span = to - from
  if (span <= 0) return undefined
  const start = Math.abs(Math.imul(seed, 2654435761)) % span
  for (let step = 0; step < span; step++) {
    const i = from + ((start + step) % span)
    const key = index.keys[i]
    const rec = index.pack.w[key]
    if (!rec?.t?.length || !rec.p || key.length < 3 || index.ownKeys.has(key)) continue
    return hit(index, i)
  }
  return undefined
}
