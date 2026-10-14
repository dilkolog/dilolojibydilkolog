import type { KelimeDB } from '../data/db'
import { baseForm, packRecord, unpackSentences } from '../data/wordpack'
import { genderOfCode, POS_CODE, type Pack } from '../data/wordpackBuild'
import { createEntry, markWord } from '../data/wordInput'
import { formIn } from '../engine/inflection'
import type { Gender, PartOfSpeech, TargetLanguage, VocabularyEntry, WordList } from '../engine/types'
import { rememberPlacement } from './listMemory'
import { newListId } from './wordListId'

/** A key word of a text, as the card shows it: its form there, its dictionary form and meaning, its sentence. */
export interface KeyItem {
  word: string
  lemma: string
  turkish: string[]
  sentence: string
  /** The sentence's Turkish, when it has one. */
  translation?: string
  pos?: PartOfSpeech
  gender?: Gender
}

/**
 * A word as the offline word pack has it: its dictionary form (allons → aller), Turkish meaning,
 * part of speech and gender, and the first of its sentences that shows it. Undefined when the pack
 * has no meaning for it (a card needs one).
 */
export function packItem(pack: Pack | undefined, word: string, language: TargetLanguage): KeyItem | undefined {
  const own = packRecord(pack, word, language)
  const lemma = own ? word : baseForm(pack, word, language)
  const rec = own ?? (lemma ? packRecord(pack, lemma, language) : undefined)
  if (!lemma || !rec?.t?.length) return undefined
  // The first sentence that shows the word, marked where it stands (the questions blank it out there).
  let found = { form: lemma, sentence: '', translation: '' }
  for (const [text, tr] of unpackSentences(rec.c) ?? []) {
    const form = formIn(text, lemma, language)
    if (form) {
      found = { form, sentence: text, translation: tr }
      break
    }
  }
  return { word: found.form, lemma, turkish: rec.t, sentence: found.sentence, translation: found.translation, pos: rec.p ? POS_CODE[rec.p] : undefined, gender: genderOfCode(rec.g) }
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
        {
          word: x.lemma,
          meaning: x.turkish.slice(0, 2).join(', '),
          partOfSpeech: x.pos,
          gender: x.gender,
          example: x.sentence ? markWord(x.sentence, x.word) : undefined,
          exampleTranslation: x.translation,
          exampleMetIn: x.sentence ? title : undefined,
        },
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
 * Words as a list of their own, in one tap (like a set made from a chapter): a list of that name
 * is reused, words already among the learner's are left where they are, and the list becomes where
 * new words go, so what is added next joins it. `metIn` names the text the sentences come from.
 */
export async function addKeyList(
  db: KelimeDB,
  language: TargetLanguage,
  title: string,
  items: readonly KeyItem[],
  metIn: string | undefined = title,
): Promise<{ list: WordList; added: VocabularyEntry[] }> {
  const name = title.trim().slice(0, NAME_MAX) || 'Okuma'
  const lists = await db.getLists(language)
  const stamp = new Date().toISOString()
  const list = lists.find((l) => l.name.toLocaleLowerCase('tr') === name.toLocaleLowerCase('tr')) ?? { id: newListId(), language, name, levels: [], createdAt: stamp, updatedAt: stamp }
  if (!lists.includes(list)) await db.saveList(list)
  const fresh = keyEntries(items, language, new Date(), metIn)
  const there = await db.vocabulary.bulkGet(fresh.map((e) => e.id))
  const added = fresh.filter((_, i) => !there[i]).map((e) => ({ ...e, listId: list.id }))
  if (added.length) await db.vocabulary.bulkPut(added)
  rememberPlacement(language, list.id)
  return { list, added }
}
