import { normalize, splitArticle, stripDiacritics } from '../engine/answerCheck'
import type { TargetLanguage } from '../engine/types'
import { loadPack, packKeys } from './wordpack'
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
}

export interface DictIndex {
  language: TargetLanguage
  pack: Pack
  keys: string[]
  folded: string[]
  /** Each Turkish meaning (folded) with the words that carry it: position in the pack and in the word's own meanings. */
  turkish: Map<string, { at: number; order: number }[]>
}

export interface DictResult {
  exact?: DictHit
  /** Other words starting the same way, most frequent first. */
  similar: DictHit[]
  /** Words whose Turkish meaning matches what was typed. */
  fromTurkish: DictHit[]
}

const LIMIT = 8

/** Case, accents and the Turkish dotless i don't matter when searching: Décider = decider, KOŞMAK = kosmak. */
export const fold = (s: string) => stripDiacritics(s.trim().toLocaleLowerCase('tr')).replace(/ı/g, 'i').replace(/\s+/g, ' ')

export function buildIndex(pack: Pack, language: TargetLanguage): DictIndex {
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
  return { language, pack, keys, folded: keys.map(fold), turkish }
}

const hit = (index: DictIndex, i: number): DictHit => ({ word: index.keys[i], rec: index.pack.w[index.keys[i]], rank: i + 1 })

export function search(index: DictIndex, query: string): DictResult {
  const q = fold(query)
  if (!q) return { similar: [], fromTurkish: [] }
  const { language } = index
  const bare = fold(splitArticle(normalize(query).toLocaleLowerCase(language), language).rest)

  // The word itself: as written first, then without accents (decider → décider).
  let exactAt = packKeys(query, language).map((k) => index.keys.indexOf(k)).find((i) => i >= 0) ?? -1
  if (exactAt < 0) exactAt = index.folded.findIndex((f) => f === bare || f === q)
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
  const fromTurkish = [...best]
    .sort((a, b) => a[1][0] - b[1][0] || a[1][1] - b[1][1] || a[0] - b[0])
    .slice(0, LIMIT)
    .map(([i]) => hit(index, i))

  return { exact, similar, fromTurkish }
}

const indexes = new Map<TargetLanguage, Promise<DictIndex | undefined>>()

/** The language's index, built once from its pack; undefined while there is no pack (offline before it was ever fetched). */
export function loadIndex(language: TargetLanguage): Promise<DictIndex | undefined> {
  let p = indexes.get(language)
  if (!p) {
    p = loadPack(language).then((pack) => (pack ? buildIndex(pack, language) : undefined))
    void p.then((ix) => ix || indexes.delete(language))
    indexes.set(language, p)
  }
  return p
}

/** Wiktionary's page for the word, at the section of its language. */
export function wiktionaryUrl(word: string, language: TargetLanguage): string {
  const section = { en: 'English', fr: 'French', es: 'Spanish' }[language]
  return `https://en.wiktionary.org/wiki/${encodeURIComponent(word)}#${section}`
}
