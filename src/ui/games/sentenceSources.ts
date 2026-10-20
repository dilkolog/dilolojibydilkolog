import type { ContextSource } from '../../engine/contextReview'
import type { TargetLanguage, VocabularyEntry } from '../../engine/types'
import { db } from '../../data/instance'

/** The sentences the learner has met: texts read, sentences translated, their words' examples. */
export async function loadSources(language: TargetLanguage, vocabulary: readonly VocabularyEntry[]): Promise<ContextSource[]> {
  const [texts, memory] = await Promise.all([db.getLibrary(language), db.getTranslations()])
  return [
    ...memory.filter((m) => m.from === language && m.to === 'tr').map((m) => ({ text: m.text, translation: m.translation, from: 'Çevirdiklerin' })),
    ...vocabulary.filter((v) => v.language === language).flatMap((v) => v.senses.flatMap((s) => s.examples.map((x) => ({ text: x.text, translation: x.translation || undefined, from: 'Örnek cümle' })))),
    ...texts.map((t) => ({ text: t.text, from: t.title })),
  ]
}
