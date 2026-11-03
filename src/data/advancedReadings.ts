import type { TargetLanguage } from '../engine/types'

export type AdvancedLevel = 'B2' | 'C1'
export type AdvancedCategory = 'essay' | 'feature' | 'story'

export interface AdvancedReading {
  id: string
  language: TargetLanguage
  title: string
  category: AdvancedCategory
  level: AdvancedLevel
  /** One Turkish sentence: what the text is about. */
  summary: string
  text: string
}

export const ADVANCED_CATEGORY_LABELS: Record<AdvancedCategory, string> = {
  essay: 'Deneme',
  feature: 'Haber yazısı',
  story: 'Öykü',
}

const FILES = import.meta.glob<{ readings: AdvancedReading[] }>('./advancedReadings/*.json', { import: 'default', eager: true })

/** Original B2–C1 texts written for the app (essays, features, short stories): a new `*.json` in the folder adds more. */
export const ADVANCED_READINGS: readonly AdvancedReading[] = Object.values(FILES).flatMap((f) => f.readings)

export function advancedFor(language: TargetLanguage, level?: AdvancedLevel): AdvancedReading[] {
  return ADVANCED_READINGS.filter((r) => r.language === language && (!level || r.level === level))
}
