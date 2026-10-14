import type { KelimeDB } from '../data/db'
import { createEntry, markWord } from '../data/wordInput'
import type { Gender, PartOfSpeech, TargetLanguage, VocabularyEntry, WordList } from '../engine/types'
import { rememberPlacement } from './listMemory'
import { newListId } from './wordListId'

/** A key word of a text, as the card shows it: its form there, its dictionary form and meaning, its sentence. */
export interface KeyItem {
  word: string
  lemma: string
  turkish: string[]
  sentence: string
  pos?: PartOfSpeech
  gender?: Gender
}

/** The longest list name the list screens take. */
const NAME_MAX = 60

/** Cards for the key words that have a meaning (a card needs one), each with the sentence it was met in. */
export function keyEntries(items: readonly KeyItem[], language: TargetLanguage, now: Date, title?: string): VocabularyEntry[] {
  const seen = new Set<string>()
  return items.flatMap((x) => {
    if (!x.turkish.length) return []
    try {
      const entry = createEntry(
        { word: x.lemma, meaning: x.turkish.slice(0, 2).join(', '), partOfSpeech: x.pos, gender: x.gender, example: markWord(x.sentence, x.word), exampleMetIn: title },
        language,
        now,
      )
      if (seen.has(entry.id)) return []
      seen.add(entry.id)
      return [entry]
    } catch {
      return []
    }
  })
}

/**
 * The key words of a text as a list named after it, in one tap (like a set made from a chapter):
 * a list of that name is reused, words already among the learner's are left where they are, and
 * the list becomes where new words go, so what is added while reading joins it.
 */
export async function addKeyList(db: KelimeDB, language: TargetLanguage, title: string, items: readonly KeyItem[]): Promise<{ list: WordList; added: VocabularyEntry[] }> {
  const name = title.trim().slice(0, NAME_MAX) || 'Okuma'
  const lists = await db.getLists(language)
  const stamp = new Date().toISOString()
  const list = lists.find((l) => l.name.toLocaleLowerCase('tr') === name.toLocaleLowerCase('tr')) ?? { id: newListId(), language, name, levels: [], createdAt: stamp, updatedAt: stamp }
  if (!lists.includes(list)) await db.saveList(list)
  const fresh = keyEntries(items, language, new Date(), title)
  const there = await db.vocabulary.bulkGet(fresh.map((e) => e.id))
  const added = fresh.filter((_, i) => !there[i]).map((e) => ({ ...e, listId: list.id }))
  if (added.length) await db.vocabulary.bulkPut(added)
  rememberPlacement(language, list.id)
  return { list, added }
}
