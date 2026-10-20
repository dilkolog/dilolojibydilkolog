import { cleanToken } from '../engine/extract'
import { normalize } from '../engine/answerCheck'
import { analyzeForm, type FormAnalysis } from '../engine/tenses'
import { compoundsAround } from '../engine/textForms'
import type { TargetLanguage, VocabularyEntry } from '../engine/types'
import type { Selected } from './WordCard'

/** The learner's own card for a verb, by its infinitive. */
export const ownVerb = (vocabulary: readonly VocabularyEntry[], language: TargetLanguage, lemma: string) =>
  vocabulary.find((v) => v.language === language && v.partOfSpeech === 'verb' && normalize(v.lemma).toLocaleLowerCase(language) === lemma)

/**
 * What a tapped word can be as a conjugated form: the compound tense it belongs to ("ai" or "mangé" in "j'ai mangé"
 * shows the whole form first), then the single-word readings, the verbs the learner has a card for ahead of the
 * more frequent ones. Empty when nothing is selected.
 */
export function formsOfSelection(
  selected: Pick<Selected, 'token' | 'sentence'> | undefined,
  language: TargetLanguage,
  vocabulary: readonly VocabularyEntry[],
  freq: ReadonlyMap<string, number>,
): FormAnalysis[] {
  if (!selected) return []
  const rank = (lemma: string) => (ownVerb(vocabulary, language, lemma) ? -1 : (freq.get(lemma) ?? Infinity))
  const compounds = language !== 'en' ? compoundsAround(language, selected.sentence, selected.token.text) : []
  const singles = analyzeForm(language, cleanToken(selected.token.text, language))
    .map((a, i) => ({ a, i }))
    .sort((x, y) => rank(x.a.lemma) - rank(y.a.lemma) || x.i - y.i)
    .map((x) => x.a)
  return [...compounds, ...singles]
}
