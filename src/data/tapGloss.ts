import type { TargetLanguage, VocabularyEntry } from '../engine/types'
import { baseForm, packRecord } from './wordpack'
import type { Pack } from './wordpackBuild'

/** What a tapped word of a sentence shows: the word, the word it is a form of (when it is one), and its Turkish meaning. */
export interface TapGloss {
  word: string
  /** The dictionary word, when the tapped one is a form of it (trata → tratar). */
  lemma?: string
  gloss?: string
}

const GLOSSES = 3

const meaningsOf = (t: readonly string[] | undefined) => t?.filter((g) => !/[[\]{}]/.test(g)).slice(0, GLOSSES).join(', ') || undefined

/**
 * The Turkish meaning of a word met in a question's sentence: from the learner's own list when it is
 * there, else from the dictionary (the word itself, or the word it is a form of). Nothing found: the
 * word alone, so the card can say the dictionary does not have it.
 */
export function glossOf(pack: Pack | undefined, word: string, language: TargetLanguage, vocabulary: readonly VocabularyEntry[] = []): TapGloss {
  const key = word.toLocaleLowerCase(language)
  const own = vocabulary.find((v) => v.language === language && v.lemma.toLocaleLowerCase(language) === key)
  const ownGloss = own?.senses[0]?.gloss
  if (ownGloss) return { word, gloss: ownGloss }
  const direct = packRecord(pack, key, language)
  if (direct) return { word, gloss: meaningsOf(direct.t) }
  const base = baseForm(pack, key, language)
  const rec = base ? packRecord(pack, base, language) : undefined
  return rec ? { word, lemma: base, gloss: meaningsOf(rec.t) } : { word }
}
