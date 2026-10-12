import { normalize, splitArticle } from '../engine/answerCheck'
import type { Example, TargetLanguage, VocabularyEntry } from '../engine/types'
import { quietly, type KelimeDB } from './db'
import { canFill, patchWithSources, type FieldName, type SourceKind } from './provenance'
import type { Equivalents } from './wiktionary'
import { genderOfCode, POS_CODE, type Pack, type PackRecord } from './wordpackBuild'

/**
 * The word pack (see wordpackBuild.ts): Turkish meanings, pronunciation, recordings, origins,
 * synonyms and the word in the other two languages, from Wiktionary's dump, offline and instant.
 * A pack is a JSON file per language in ./wordpack/ (built by scripts/build-wordpack.ts); with
 * none there, everything here quietly does nothing. Packs are served as plain files (not code,
 * so they stay out of the install download) and fetched when a language first needs one; the
 * service worker keeps them, so they work offline from then on (vite.config.ts).
 */
const FILES = import.meta.glob<string>('./wordpack/*.json', { query: '?url', import: 'default', eager: true })

const cache = new Map<TargetLanguage, Promise<Pack | undefined>>()

export function loadPack(language: TargetLanguage): Promise<Pack | undefined> {
  let p = cache.get(language)
  if (!p) {
    const url = FILES[`./wordpack/${language}.json`]
    p = url
      ? fetch(url)
          .then((r) => (r.ok ? (r.json() as Promise<Pack>) : undefined))
          .catch(() => undefined)
      : Promise.resolve(undefined)
    // Offline before the pack was ever fetched: try again next time instead of remembering "none".
    void p.then((pack) => pack || cache.delete(language))
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
/**
 * The word an inflected form belongs to, from the pack's form table (allons → aller), when the
 * pack has that word. Only for looking up: a word in the list is filled from its own record, never
 * from another word's (décidé, an adjective, is not décider).
 */
export function baseForm(pack: Pack | undefined, word: string, language: TargetLanguage): string | undefined {
  if (!pack?.f) return undefined
  for (const k of packKeys(word, language)) {
    const base = pack.f[k]
    if (base && pack.w[base]) return base
  }
  return undefined
}

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
  // Like Lexique (lexicon.ts): a part of speech only for a word saved as "other", a gender only
  // for a noun without one; never over what the learner chose.
  const pos = rec.p ? POS_CODE[rec.p] : undefined
  if (pos && entry.partOfSpeech === 'other') {
    patch.partOfSpeech = pos
    wrote.partOfSpeech = 'pack'
  }
  const gender = genderOfCode(rec.g)
  if (gender && entry.language !== 'en' && (patch.partOfSpeech ?? entry.partOfSpeech) === 'noun' && !entry.gender) {
    patch.gender = gender
    wrote.gender = 'pack'
  }
  return Object.keys(patch).length ? { patch, wrote } : undefined
}

/**
 * Fills the learner's words of one language from a pack. Each word records the pack version it
 * got, so a word added later (by hand, a sample, an import or another device) gets the pack on the
 * next pass too, and a new pack version reaches every word once. Returns how many words changed.
 */
export async function applyPack(db: KelimeDB, language: TargetLanguage, pack: Pack): Promise<number> {
  const todo = (await db.vocabulary.where('language').equals(language).toArray()).filter((e) => e.packV !== pack.v)
  if (!todo.length) return 0
  let changed = 0
  await quietly(() =>
    db.transaction('rw', db.vocabulary, async () => {
      for (const e of todo) {
        const rec = packRecord(pack, e.lemma, language)
        const update = rec && packUpdate(e, rec)
        if (update) changed++
        await db.vocabulary.update(e.id, update ? { ...patchWithSources(e, update.patch, update.wrote), packV: pack.v } : { packV: pack.v })
      }
    }),
  )
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

/**
 * Unpacks example sentences from any pack representation (row tuples, columnar object, or TSV string)
 * into a list of [sentence, Turkish] pairs.
 */
export function unpackSentences(bundled: PackRecord['c'] | undefined): [string, string][] | undefined {
  if (!bundled) return undefined
  if (typeof bundled === 'string') {
    const trimmed = bundled.trim()
    if (!trimmed) return undefined
    const lines = trimmed.split('\n').filter(Boolean)
    if (!lines.length) return undefined
    return lines.map((line) => {
      const idx = line.indexOf('\t')
      return idx >= 0 ? [line.slice(0, idx), line.slice(idx + 1)] : [line, '']
    })
  }
  if (!Array.isArray(bundled)) {
    if (bundled && typeof bundled === 'object' && 's' in bundled && Array.isArray((bundled as { s: string[]; t: string[] }).s)) {
      const col = bundled as { s: string[]; t: string[] }
      return col.s.map((text, i) => [text, col.t?.[i] ?? ''])
    }
    return undefined
  }
  if (!bundled.length) return undefined
  return (bundled as [string, string][]).map(([text, translation]) => [text, translation ?? ''])
}

/**
 * Produces Example objects ({ text, translation, form: '' }) from the pack's example sentences.
 */
export function examplesFromPack(bundled: PackRecord['c'] | undefined): Example[] | undefined {
  const unpacked = unpackSentences(bundled)
  return unpacked?.length ? unpacked.map(([text, translation]) => ({ text, translation, form: '' })) : undefined
}

/**
 * Packs sentence pairs into compact columnar format { s: texts, t: translations }.
 */
export function packColumnarSentences(sentences: readonly (readonly [string, string])[]): { s: string[]; t: string[] } {
  return {
    s: sentences.map(([text]) => text),
    t: sentences.map(([, tr]) => tr),
  }
}

/**
 * Packs sentence pairs into compact TSV string.
 */
export function packTsvSentences(sentences: readonly (readonly [string, string])[]): string {
  return sentences.map(([text, tr]) => `${text}\t${tr}`).join('\n')
}

