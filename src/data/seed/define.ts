import type {
  CefrLevel,
  Gender,
  PartOfSpeech,
  Register,
  RelationType,
  TargetLanguage,
  VocabularyEntry,
} from '../../engine/types'

/**
 * Compact authoring format for the seed vocabulary. Relations refer to other words by lemma
 * within the same language; `define` turns them into ids.
 *
 * Frequency ranks are approximate (ordering within the seed matters, exact values don't).
 */
export interface SeedWord {
  lemma: string
  pos: PartOfSpeech
  cefr: CefrLevel
  rank: number
  /** Turkish meaning; extra accepted meanings after the first. */
  tr: string | string[]
  /** [sentence, Turkish translation, surface form of the word in the sentence] */
  ex: [string, string, string][]
  /** [phrase, Turkish translation, typical wrong variants] */
  col?: [string, string, string[]?][]
  /** [lemma, part of speech, Turkish meaning, morphology note] */
  fam?: [string, PartOfSpeech, string, string?][]
  rel?: [RelationType, string][]
  gender?: Gender
  article?: string
  register?: Register
}

export function define(language: TargetLanguage, words: SeedWord[]): VocabularyEntry[] {
  const id = (lemma: string) => `${language}:${lemma}`
  return words.map((w) => {
    const [gloss, ...altGlosses] = Array.isArray(w.tr) ? w.tr : [w.tr]
    return {
      id: id(w.lemma),
      language,
      lemma: w.lemma,
      partOfSpeech: w.pos,
      gender: w.gender,
      article: w.article,
      cefr: w.cefr,
      frequencyRank: w.rank,
      register: w.register ?? 'neutral',
      senses: [
        {
          id: `${id(w.lemma)}#1`,
          gloss,
          altGlosses: altGlosses.length ? altGlosses : undefined,
          examples: w.ex.map(([text, translation, form]) => ({ text, translation, form })),
        },
      ],
      collocations: (w.col ?? []).map(([phrase, translation, wrongVariants]) => ({
        phrase,
        translation,
        wrongVariants,
      })),
      relations: (w.rel ?? []).map(([type, lemma]) => ({ type, targetId: id(lemma) })),
      wordFamily: (w.fam ?? []).map(([lemma, partOfSpeech, g, morphology]) => ({
        lemma,
        partOfSpeech,
        gloss: g,
        morphology,
        entryId: words.some((o) => o.lemma === lemma) ? id(lemma) : undefined,
      })),
      tags: [],
      source: 'sample',
    }
  })
}
