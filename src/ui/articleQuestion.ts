import { definiteArticle } from '../engine/exercises'
import type { VocabularyEntry } from '../engine/types'

/** The two choices for a noun, and the right one. Before a vowel French hides the gender (l'), so un/une is asked. */
export function articleQuestion(e: VocabularyEntry): { options: [string, string]; answer: string } | null {
  if (e.language === 'fr') {
    if (e.gender !== 'm' && e.gender !== 'f') return null
    const vowel = /^[aeiouyhéèêàâîôûœ]/i.test(e.lemma)
    return vowel ? { options: ['un', 'une'], answer: e.gender === 'm' ? 'un' : 'une' } : { options: ['le', 'la'], answer: e.gender === 'm' ? 'le' : 'la' }
  }
  if (e.language === 'es') {
    const article = definiteArticle(e)
    return article ? { options: ['el', 'la'], answer: article } : null
  }
  return null
}
