import type { SentenceCard } from '../engine/sentences'
import type { TargetLanguage, VocabularyEntry } from '../engine/types'
import { quietly } from './db'
import { db } from './instance'
import { translate, TranslateError } from './translate'

/** A sentence in the learner's lists without its Turkish: an example of a word, or a sentence card. */
interface Missing {
  text: string
  language: TargetLanguage
  /** Where it goes: an example (word, sense, position) or a sentence card. */
  at: { entryId: string; sense: number; example: number } | { sentenceId: string }
}

const hasText = (s: string | undefined) => !!s?.replace(/\*/g, '').trim()

/** Every sentence in the word list and the sentence cards that has no translation yet. */
export async function missingTranslations(): Promise<Missing[]> {
  const [vocabulary, sentences] = await Promise.all([db.vocabulary.toArray(), db.getSentences()])
  const out: Missing[] = []
  for (const e of vocabulary)
    e.senses.forEach((s, si) =>
      s.examples.forEach((ex, xi) => {
        if (hasText(ex.text) && !ex.translation?.trim()) out.push({ text: ex.text, language: e.language, at: { entryId: e.id, sense: si, example: xi } })
      }),
    )
  for (const s of sentences) if (hasText(s.text) && !s.translation?.trim()) out.push({ text: s.text, language: s.language, at: { sentenceId: s.id } })
  return out
}

/**
 * Translates them one after another and writes each translation where it belongs (read fresh, so
 * an edit made meanwhile is kept). Stops at the first "later" (month used up, too busy, offline)
 * and says why. The translation exercise opens for every sentence filled.
 */
export async function fillTranslations(onProgress: (done: number, total: number) => void): Promise<{ filled: number; total: number; stopped?: string }> {
  const todo = await missingTranslations()
  let filled = 0
  for (const [i, m] of todo.entries()) {
    let translation: string
    try {
      translation = await translate(m.text, m.language)
    } catch (e) {
      return { filled, total: todo.length, stopped: e instanceof TranslateError ? e.message : 'Çeviri şu an alınamadı.' }
    }
    if ('entryId' in m.at) {
      const { entryId, sense, example } = m.at
      const entry = (await db.vocabulary.get(entryId)) as VocabularyEntry | undefined
      const ex = entry?.senses[sense]?.examples[example]
      if (entry && ex && ex.text === m.text && !ex.translation?.trim()) {
        const senses = entry.senses.map((s, si) => (si !== sense ? s : { ...s, examples: s.examples.map((x, xi) => (xi === example ? { ...x, translation } : x)) }))
        await quietly(() => db.vocabulary.put({ ...entry, senses }))
        filled++
      }
    } else {
      const id = m.at.sentenceId
      const card = (await db.getSentences()).find((s: SentenceCard) => s.id === id)
      if (card && !card.translation?.trim()) {
        await db.saveSentence({ ...card, translation })
        filled++
      }
    }
    onProgress(i + 1, todo.length)
  }
  return { filled, total: todo.length }
}
