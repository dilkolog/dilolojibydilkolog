import { normalize, splitArticle } from '../engine/answerCheck'
import type { TargetLanguage, VocabularyEntry } from '../engine/types'
import type { KelimeDB } from './db'
import { canFill, patchWithSources, type FieldName, type SourceKind } from './provenance'
import type { Equivalents } from './wiktionary'
import type { Pack, PackRecord } from './wordpackBuild'

/**
 * The word pack (see wordpackBuild.ts): Turkish meanings, pronunciation, recordings, origins,
 * synonyms and the word in the other two languages, from Wiktionary's dump, offline and instant.
 * A pack is a JSON file per language in ./wordpack/ (built by scripts/build-wordpack.ts); with
 * none there, everything here quietly does nothing. Each is its own chunk, loaded when needed.
 */
const FILES = import.meta.glob<{ default: Pack }>('./wordpack/*.json')

const cache = new Map<TargetLanguage, Promise<Pack | undefined>>()

export function loadPack(language: TargetLanguage): Promise<Pack | undefined> {
  let p = cache.get(language)
  if (!p) {
    const load = FILES[`./wordpack/${language}.json`]
    p = load ? load().then((m) => m.default) : Promise.resolve(undefined)
    cache.set(language, p)
  }
  return p
}

/** The spellings of a lemma worth trying: as typed, without its article, without the reflexive "se". */
export function packKeys(lemma: string, language: TargetLanguage): string[] {
  const full = normalize(lemma).toLocaleLowerCase(language)
  const bare = splitArticle(full, language).rest
  const keys = [full, bare]
  if (language === 'fr') keys.push(bare.replace(/^(se |s['’])/, ''))
  if (language === 'en') keys.push(bare.replace(/^to /, ''))
  return [...new Set(keys.filter(Boolean))]
}

export function packRecord(pack: Pack | undefined, lemma: string, language: TargetLanguage): PackRecord | undefined {
  if (!pack) return undefined
  for (const k of packKeys(lemma, language)) if (pack.w[k]) return pack.w[k]
  return undefined
}

/** Turkish meanings the pack suggests for a word being added (before the learner has typed one). */
export async function suggestMeanings(word: string, language: TargetLanguage): Promise<string[]> {
  return packRecord(await loadPack(language), word, language)?.t ?? []
}

/**
 * What the pack can add to an entry: only fields that are empty or were filled by a source and
 * never edited (see provenance.ts), so a learner's own text always stays. Undefined: nothing.
 */
export function packUpdate(entry: VocabularyEntry, rec: PackRecord): { patch: Partial<VocabularyEntry>; wrote: Partial<Record<FieldName, SourceKind>> } | undefined {
  const patch: Partial<VocabularyEntry> = {}
  const wrote: Partial<Record<FieldName, SourceKind>> = {}
  const put = <K extends keyof VocabularyEntry>(field: FieldName, key: K, value: VocabularyEntry[K] | undefined, same: boolean) => {
    if (value === undefined || same || !canFill(entry, field)) return
    patch[key] = value
    wrote[field] = 'pack'
  }
  put('ipa', 'ipa', rec.i, rec.i === entry.ipa)
  put('audio', 'audioUrl', rec.a, rec.a === entry.audioUrl)
  put('etymology', 'etymology', rec.e, rec.e === entry.etymology)
  put('synonyms', 'synonyms', rec.s, JSON.stringify(rec.s) === JSON.stringify(entry.synonyms))
  const others = rec.x && Object.fromEntries(Object.entries(rec.x).filter(([l]) => l !== entry.language))
  put('translations', 'translations', others && Object.keys(others).length ? (others as VocabularyEntry['translations']) : undefined, JSON.stringify(others) === JSON.stringify(entry.translations))
  if (rec.n && !entry.antonyms?.length) patch.antonyms = rec.n
  return Object.keys(patch).length ? { patch, wrote } : undefined
}

const VERSION_KEY = (language: TargetLanguage) => `wordpack:${language}`

/** Fills the learner's words of one language from a pack; once per pack version. Returns how many words changed. */
export async function applyPack(db: KelimeDB, language: TargetLanguage, pack: Pack): Promise<number> {
  if ((await db.meta.get(VERSION_KEY(language)))?.value === pack.v) return 0
  let changed = 0
  for (const e of await db.vocabulary.where('language').equals(language).toArray()) {
    const rec = packRecord(pack, e.lemma, language)
    const update = rec && packUpdate(e, rec)
    if (!update) continue
    await db.vocabulary.update(e.id, patchWithSources(e, update.patch, update.wrote))
    changed++
  }
  await db.meta.put({ key: VERSION_KEY(language), value: pack.v })
  return changed
}

/** The same with the pack file shipped for the language, if there is one. */
export async function fillFromPack(db: KelimeDB, language: TargetLanguage): Promise<number> {
  const pack = await loadPack(language)
  return pack ? applyPack(db, language, pack) : 0
}

/** The word in the other languages as the "three languages" card wants it, from what the pack stored on the entry. */
export function equivalentsFromPack(entry: VocabularyEntry): Equivalents | null {
  const others = (Object.entries(entry.translations ?? {}) as [TargetLanguage, string[]][]).filter(([l, words]) => l !== entry.language && words.length)
  if (!others.length) return null
  const own = splitArticle(normalize(entry.lemma), entry.language).rest
  return {
    forms: [{ language: entry.language, word: own, gender: entry.gender, root: null }, ...others.map(([language, words]) => ({ language, word: words[0], root: null }))],
    shared: null,
  }
}
