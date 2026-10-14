import type { VocabularyEntry } from './types'

/**
 * How full a word's card is: four things the learner can add themselves, each a quarter.
 * (Pronunciation, gender and the like are filled by the app, so they are not asked of anyone.)
 */
export type CardPart = 'image' | 'audio' | 'example' | 'note'

export const CARD_PARTS: { part: CardPart; label: string; add: string }[] = [
  { part: 'image', label: 'Görsel', add: '+ görsel' },
  { part: 'audio', label: 'Ses', add: '+ kendi sesin' },
  { part: 'example', label: 'Örnek cümle', add: '+ örnek cümle' },
  { part: 'note', label: 'Hafıza ipucu', add: '+ hafıza ipucu' },
]

const has: Record<CardPart, (e: VocabularyEntry) => boolean> = {
  image: (e) => !!e.imageId,
  // The learner's own recording, or a native speaker's from Wiktionary.
  audio: (e) => !!e.audioId || !!e.audioUrl,
  example: (e) => e.senses.some((s) => s.examples.length > 0) || !!e.corpus?.length,
  note: (e) => !!e.notes?.trim(),
}

export interface Completeness {
  /** 0–100 */
  percent: number
  missing: CardPart[]
}

export function cardCompleteness(entry: VocabularyEntry): Completeness {
  const missing = CARD_PARTS.filter(({ part }) => !has[part](entry)).map(({ part }) => part)
  return { percent: Math.round(((CARD_PARTS.length - missing.length) / CARD_PARTS.length) * 100), missing }
}

/** Words that carry meaning: the ones whose usual partners are worth learning with them. */
const CONTENT = new Set(['noun', 'verb', 'adjective', 'adverb'])

/**
 * What the AI can put on a card in one go: an example sentence and a memory hook when they are
 * missing, and the word's usual partners when it has none (only alongside one of those, so a full
 * card is not sent off for partners alone). Pictures and the learner's own voice stay theirs to add.
 */
export function aiFillable(entry: VocabularyEntry): ('example' | 'notes' | 'collocations')[] {
  const { missing } = cardCompleteness(entry)
  const fields: ('example' | 'notes' | 'collocations')[] = []
  if (missing.includes('example')) fields.push('example')
  if (missing.includes('note')) fields.push('notes')
  if (fields.length && !entry.collocations.length && CONTENT.has(entry.partOfSpeech)) fields.push('collocations')
  return fields
}
