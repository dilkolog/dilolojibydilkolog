import type { GiftWord, SentText } from '../data/friends'
import { displayForm } from './exercises'
import type { VocabularyEntry } from './types'

/** A word of the learner's own, as a gift: the word with its article, its meanings and its first sentence. */
export function giftOf(entry: VocabularyEntry): GiftWord {
  const sense = entry.senses[0]
  const example = sense.examples.find((e) => e.text?.trim())
  return {
    language: entry.language,
    lemma: displayForm(entry),
    meaning: [sense.gloss, ...(sense.altGlosses ?? [])].slice(0, 3).join(', '),
    ...(example ? { example: example.text, ...(example.translation ? { exampleTranslation: example.translation } : {}) } : {}),
  }
}

/** The most of a text that is sent: a page to read together, not a book. */
export const MAX_SENT = 3000

/** A text of the learner's library, as a text to send: cut at the end of a sentence or a line when it is long. */
export function sentTextOf(text: { language: 'en' | 'fr' | 'es'; title: string; text: string }): SentText {
  let body = text.text.trim()
  if (body.length > MAX_SENT) {
    const cut = body.slice(0, MAX_SENT)
    const end = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf('\n'), cut.lastIndexOf('! '), cut.lastIndexOf('? '))
    body = end > MAX_SENT / 2 ? cut.slice(0, end + 1) : cut
  }
  return { language: text.language, title: text.title, body }
}

/** Words of the learner matching what was typed (the word or a meaning), the word starting with it first. */
export function giftMatches(vocabulary: readonly VocabularyEntry[], query: string, limit = 6): VocabularyEntry[] {
  const q = query.trim().toLocaleLowerCase('tr')
  if (!q) return []
  const hit = (e: VocabularyEntry) => e.lemma.toLocaleLowerCase('tr').includes(q) || e.senses[0].gloss.toLocaleLowerCase('tr').includes(q)
  return vocabulary
    .filter(hit)
    .sort((a, b) => Number(!a.lemma.toLocaleLowerCase('tr').startsWith(q)) - Number(!b.lemma.toLocaleLowerCase('tr').startsWith(q)))
    .slice(0, limit)
}
