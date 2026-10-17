import type { KelimeDB, ReadingText } from '../data/db'
import type { GiftWord, InboxItem, SentText } from '../data/friends'
import { createEntry, wordId } from '../data/wordInput'
import { placeNew } from './listMemory'

/** A gift word put in the learner's list (where new words go); 'had' when they already have it. */
export async function acceptGift(db: KelimeDB, gift: GiftWord): Promise<'added' | 'had' | 'failed'> {
  try {
    const entry = createEntry({ word: gift.lemma, meaning: gift.meaning, example: gift.example, exampleTranslation: gift.exampleTranslation }, gift.language, new Date(), 'import')
    if ((await db.vocabulary.get(entry.id)) || (await db.vocabulary.get(wordId(gift.language, entry.lemma)))) return 'had'
    const placed = await placeNew(db, gift.language, [entry])
    await db.vocabulary.bulkPut(placed.entries)
    return 'added'
  } catch {
    return 'failed'
  }
}

/** A text a friend sent, kept in the reading library (it says who sent it). */
export async function acceptText(db: KelimeDB, item: InboxItem & { text: SentText }): Promise<ReadingText> {
  const text: ReadingText = {
    id: crypto.randomUUID(),
    language: item.text.language,
    title: item.text.title,
    text: item.text.body,
    source: `Arkadaşın ${item.from.name} gönderdi`,
    addedAt: new Date().toISOString(),
    history: [],
  }
  await db.saveText(text)
  return text
}
