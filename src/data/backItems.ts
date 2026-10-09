import { backTranslationItems, type BackItem } from '../engine/backTranslation'
import type { TargetLanguage } from '../engine/types'
import { db } from './instance'

/** The sentences ready for back-translation: the translation memory less those already sentence cards. */
export async function loadBackItems(language: TargetLanguage): Promise<BackItem[]> {
  const [memory, cards] = await Promise.all([db.getTranslations().catch(() => []), db.getSentences()])
  return backTranslationItems(memory, cards, language)
}
