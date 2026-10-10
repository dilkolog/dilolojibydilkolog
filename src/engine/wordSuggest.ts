import { stripDiacritics } from './answerCheck'
import { localDate } from './progress'
import { addedTime, type Gender, type VocabularyEntry } from './types'

/**
 * Two helps from the AI that keep the word list growing and whole: new words on a day nothing was
 * added, and the blanks of existing words (a gender, an example sentence, a part of speech) filled
 * in one go. The AI's answer only ever fills what is empty; what the learner wrote stays.
 */

/** Words suggested at a time: what the learner takes in a day (their setting), but never fewer than 3 or more than 10. */
export const suggestCount = (newWordsPerDay: number | undefined) => Math.min(10, Math.max(3, Math.round(newWordsPerDay || 5)))

/** Words the learner added themselves today (the sample words don't count). */
export function addedToday(vocabulary: readonly VocabularyEntry[], now: Date): number {
  const today = localDate(now)
  return vocabulary.filter((v) => v.source !== 'sample' && addedTime(v) > 0 && localDate(new Date(addedTime(v))) === today).length
}

/** At least a few own words: someone who has only just begun doesn't need to be asked yet. */
export const SUGGEST_MIN_WORDS = 5

/** Suggestions are offered on a day no word was added, to someone with a list of their own. */
export function suggestionDue(vocabulary: readonly VocabularyEntry[], now: Date): boolean {
  const own = vocabulary.filter((v) => v.source !== 'sample')
  return own.length >= SUGGEST_MIN_WORDS && addedToday(vocabulary, now) === 0
}

export type Missing = 'example' | 'gender' | 'partOfSpeech'

/** What an entry of the learner's own lacks that the AI can supply. */
export function missingFields(e: VocabularyEntry): Missing[] {
  if (e.source === 'sample') return []
  const out: Missing[] = []
  if (!e.senses.some((s) => s.examples.length) && !e.corpus?.length && e.partOfSpeech !== 'phrase') out.push('example')
  if (e.language !== 'en' && e.partOfSpeech === 'noun' && !e.gender) out.push('gender')
  if (e.partOfSpeech === 'other') out.push('partOfSpeech')
  return out
}

export const needsFill = (vocabulary: readonly VocabularyEntry[]) => vocabulary.filter((e) => missingFields(e).length > 0)

/** The article that goes with a noun's gender (the same rule the list check-up uses). */
export function articleFor(language: VocabularyEntry['language'], lemma: string, gender: Gender): string | undefined {
  if (language === 'en') return undefined
  const vowel = /^[aeiouyhéèêàâîôû]/i.test(lemma)
  return language === 'fr' ? (vowel ? "l'" : gender === 'f' ? 'la' : 'le') : gender === 'f' ? 'la' : 'el'
}

const plain = (s: string) => stripDiacritics(s.trim().toLowerCase())

/**
 * The entry with its blanks filled from what the AI said about it (`donor`: the entry built from
 * the AI's card), or null when there is nothing to add. Only empty fields change, and only when the
 * AI's lemma is the entry's own word (an answer about another word would put wrong data in).
 */
export function fillMissing(entry: VocabularyEntry, donor: VocabularyEntry): VocabularyEntry | null {
  if (plain(donor.lemma) !== plain(entry.lemma)) return null
  const missing = missingFields(entry)
  let next = entry
  if (missing.includes('partOfSpeech') && donor.partOfSpeech !== 'other') next = { ...next, partOfSpeech: donor.partOfSpeech }
  if ((missing.includes('gender') || (next.partOfSpeech === 'noun' && entry.language !== 'en' && !next.gender)) && donor.gender && next.partOfSpeech === 'noun') {
    next = { ...next, gender: donor.gender, article: articleFor(entry.language, entry.lemma, donor.gender) }
  }
  const example = donor.senses[0]?.examples[0]
  if (missing.includes('example') && example) {
    const [first, ...rest] = next.senses
    next = { ...next, senses: [{ ...first, examples: [example] }, ...rest] }
  }
  if (!next.collocations.length && donor.collocations.length) next = { ...next, collocations: donor.collocations }
  if (!next.literal && donor.literal) next = { ...next, literal: donor.literal }
  if (!next.frequencyRank && donor.frequencyRank) next = { ...next, frequencyRank: donor.frequencyRank }
  return next === entry ? null : next
}
