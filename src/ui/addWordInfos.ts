import { wordInfoToInput, type WordInfo } from '../ai'
import type { KelimeDB } from '../data/db'
import { createEntry, wordId } from '../data/wordInput'
import type { TargetLanguage, VocabularyEntry } from '../engine/types'
import { placeNew } from './listMemory'

/**
 * Adds the cards the AI made (suggested words, words read off a photo) to the list the learner is
 * filling now. Words already there and cards the AI built badly (no meaning) are left out.
 */
export async function addWordInfos(db: KelimeDB, language: TargetLanguage, vocabulary: VocabularyEntry[], infos: WordInfo[]): Promise<{ added: number; listName?: string }> {
  const now = Date.now()
  const entries: VocabularyEntry[] = []
  const keys = new Set(vocabulary.map((v) => v.id))
  infos.forEach((info, i) => {
    try {
      const entry = createEntry(wordInfoToInput(info), language, new Date(now + i), 'import')
      if (keys.has(entry.id) || keys.has(wordId(language, entry.lemma))) return
      keys.add(entry.id)
      entries.push(entry)
    } catch {
      // A card the AI built badly (no meaning): left out.
    }
  })
  const placed = await placeNew(db, language, entries)
  if (entries.length) await db.vocabulary.bulkPut(placed.entries)
  return { added: entries.length, listName: placed.listName }
}
