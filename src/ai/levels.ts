import type { AiFeature } from './usage'

/**
 * What the AI may do for a person: the owner gives each approved account a level (Supabase profiles.ai_level).
 * Shared by the server (api/ai.ts checks every request) and the app (hides what the account may not use).
 */
export type AiLevel = 'kapali' | 'kelime' | 'calisma' | 'tam'

export const AI_LEVELS: AiLevel[] = ['kapali', 'kelime', 'calisma', 'tam']
/** The level of an approved account the owner has not set one for. */
export const DEFAULT_AI_LEVEL: AiLevel = 'calisma'

export const LEVEL_NAME: Record<AiLevel, string> = { kapali: 'Kapalı', kelime: 'Kelime', calisma: 'Çalışma', tam: 'Tam' }
export const LEVEL_NOTE: Record<AiLevel, string> = {
  kapali: 'YZ özelliklerinin hiçbiri açık değil.',
  kelime: 'Kelime doldurma, öneriler, hafıza ipuçları ve okuma soruları açık.',
  calisma: 'Kelime özelliklerine ek olarak cümle değerlendirme, ters çeviri, hikâye, günlük ve yorumlar açık. Monki sohbeti, fotoğraftan kelime ve mini podcast kapalı.',
  tam: 'Her şey açık: Monki sohbeti, fotoğraftan kelime ve mini podcast dahil.',
}

/** The lowest level that may use each feature. */
export const FEATURE_LEVEL: Record<AiFeature, AiLevel> = {
  test: 'kelime',
  word_fill: 'kelime',
  suggest: 'kelime',
  mnemonic: 'kelime',
  family: 'kelime',
  word_suggest: 'kelime',
  personal_sentences: 'kelime',
  prequestions: 'kelime',
  comprehension: 'kelime',
  notes_quiz: 'kelime',
  sentence: 'calisma',
  translation: 'calisma',
  retell: 'calisma',
  story: 'calisma',
  journal: 'calisma',
  report: 'calisma',
  session_note: 'calisma',
  week_note: 'calisma',
  verb_explain: 'calisma',
  pron_tips: 'calisma',
  chat: 'tam',
  monki: 'tam',
  photo_words: 'tam',
  podcast: 'tam',
}

export const isAiLevel = (v: unknown): v is AiLevel => typeof v === 'string' && (AI_LEVELS as string[]).includes(v)
export const isAiFeature = (v: unknown): v is AiFeature => typeof v === 'string' && Object.prototype.hasOwnProperty.call(FEATURE_LEVEL, v)

/** Whether a level may use a feature. */
export const levelAllows = (level: AiLevel, feature: AiFeature): boolean => AI_LEVELS.indexOf(level) >= AI_LEVELS.indexOf(FEATURE_LEVEL[feature]) && level !== 'kapali'

/** The features a level may use. */
export const featuresOf = (level: AiLevel): AiFeature[] => (Object.keys(FEATURE_LEVEL) as AiFeature[]).filter((f) => levelAllows(level, f))

/** Share of the day's money each level gets (the top level has all of it). */
export const BUDGET_SHARE: Record<AiLevel, number> = { kapali: 0, kelime: 0.2, calisma: 0.5, tam: 1 }
