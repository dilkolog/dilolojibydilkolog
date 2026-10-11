import type { WordLookup } from '../engine/derive'
import type { TargetLanguage, VocabularyEntry } from '../engine/types'
import { POS_CODE, type Pack } from './wordpackBuild'

/** The dictionary's words, plus the learner's own that it lacks, as the word-building engine's lookup. */
export function makeLookup(pack: Pack, rank: ReadonlyMap<string, number>, vocabulary: readonly VocabularyEntry[], language: TargetLanguage): WordLookup {
  const own = new Map(vocabulary.filter((v) => v.language === language && v.partOfSpeech !== 'other' && !v.lemma.includes(' ')).map((v) => [v.lemma.toLocaleLowerCase(language), v]))
  return (word) => {
    const r = pack.w[word]
    const pos = r?.p ? POS_CODE[r.p] : undefined
    if (r && pos) return { pos, gloss: r.t?.filter((g) => !/[[\]{}]/.test(g)).slice(0, 2).join(', ') || undefined, rank: rank.get(word) }
    const v = own.get(word)
    return v ? { pos: v.partOfSpeech, gloss: v.senses[0]?.gloss, rank: rank.get(word) } : undefined
  }
}
