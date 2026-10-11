import type { VocabularyEntry } from '../engine/types'
import type { KelimeDB } from './db'

/** Links two words both ways (keeps each side's other links). */
export async function linkEntries(db: KelimeDB, first: VocabularyEntry, second: VocabularyEntry): Promise<void> {
  const a = (await db.vocabulary.get(first.id)) ?? first
  const b = (await db.vocabulary.get(second.id)) ?? second
  const member = (x: VocabularyEntry) => ({ lemma: x.lemma, partOfSpeech: x.partOfSpeech, gloss: x.senses[0].gloss, entryId: x.id })
  if (!a.wordFamily.some((m) => m.entryId === b.id)) await db.vocabulary.update(a.id, { wordFamily: [...a.wordFamily, member(b)] })
  if (!b.wordFamily.some((m) => m.entryId === a.id)) await db.vocabulary.update(b.id, { wordFamily: [...b.wordFamily, member(a)] })
}
