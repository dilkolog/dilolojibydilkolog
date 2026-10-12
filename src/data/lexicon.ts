import { normalize, splitArticle } from '../engine/answerCheck'
import type { Gender, PartOfSpeech, TargetLanguage, VocabularyEntry } from '../engine/types'
import { quietly, type KelimeDB } from './db'
import { patchWithSources } from './provenance'

/**
 * Part of speech and noun gender for French words from Lexique 3.83 (see lexicon/SOURCE.md),
 * offline: the add form knows "asile" is a masculine noun without the AI, and words added
 * without either get them filled in. Loaded as its own chunk, only for French.
 */
export interface LexiconEntry {
  /** Most frequent first. */
  pos: PartOfSpeech[]
  gender?: Gender
}

const CODE: Record<string, PartOfSpeech> = { n: 'noun', v: 'verb', a: 'adjective', d: 'adverb', p: 'preposition', c: 'conjunction', r: 'pronoun' }

/** "asile\tnm" lines (format in scripts/build-lexicon.mjs). */
export function parseLexicon(text: string): Map<string, LexiconEntry> {
  const map = new Map<string, LexiconEntry>()
  for (const line of text.split('\n')) {
    const [lemma, codes] = line.split('\t')
    if (!lemma || !codes) continue
    const entry: LexiconEntry = { pos: [] }
    for (const [, pos, g] of codes.matchAll(/([nvadpcr])([mfe]?)/g)) {
      entry.pos.push(CODE[pos])
      if (pos === 'n' && g) entry.gender = g === 'e' ? 'mf' : (g as Gender)
    }
    map.set(lemma, entry)
  }
  return map
}

let french: Promise<Map<string, LexiconEntry>> | null = null

export function loadLexicon(language: TargetLanguage): Promise<Map<string, LexiconEntry> | undefined> {
  if (language !== 'fr') return Promise.resolve(undefined)
  french ??= import('./lexicon/fr.txt?raw').then((m) => parseLexicon(m.default))
  return french
}

/** The entry for a word as typed ("l'asile", "Asile", "asile"); undefined when not listed. */
export function lookUpLexicon(lexicon: ReadonlyMap<string, LexiconEntry> | undefined, word: string, language: TargetLanguage): LexiconEntry | undefined {
  if (!lexicon) return undefined
  const w = normalize(word).toLocaleLowerCase(language)
  return lexicon.get(w) ?? lexicon.get(splitArticle(w, language).rest)
}

/**
 * Fills what the add form couldn't tell for French words: a part of speech for words saved as
 * "other", and a gender for nouns whose article didn't show it (l', les, none). Never overwrites.
 */
export async function fillFromLexicon(db: KelimeDB, language: TargetLanguage): Promise<number> {
  const lexicon = await loadLexicon(language)
  if (!lexicon) return 0
  let changed = 0
  for (const e of await db.vocabulary.where('language').equals(language).toArray()) {
    const update = lexiconUpdate(e, lexicon)
    if (!update) continue
    const patch = patchWithSources(e, update, { ...(update.partOfSpeech ? { partOfSpeech: 'lexique' as const } : {}), ...(update.gender ? { gender: 'lexique' as const } : {}) })
    await quietly(() => db.vocabulary.update(e.id, patch))
    changed++
  }
  return changed
}

export function lexiconUpdate(e: VocabularyEntry, lexicon: ReadonlyMap<string, LexiconEntry>): Partial<VocabularyEntry> | undefined {
  if (e.source === 'sample' || /\s/.test(e.lemma)) return undefined
  const lex = lookUpLexicon(lexicon, e.lemma, e.language)
  if (!lex?.pos.length) return undefined
  const pos = e.partOfSpeech === 'other' ? lex.pos[0] : e.partOfSpeech
  const gender = pos === 'noun' && !e.gender && lex.gender ? lex.gender : undefined
  if (pos === e.partOfSpeech && !gender) return undefined
  return { ...(pos !== e.partOfSpeech ? { partOfSpeech: pos } : {}), ...(gender ? { gender } : {}) }
}
