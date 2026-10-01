import type { TargetLanguage, VocabularyEntry } from '../../engine/types'
import { en } from './en'
import { es } from './es'
import { fr } from './fr'

/** Sample words for trying the app out; real vocabulary is added by the user. */
export const SAMPLE_WORDS: Record<TargetLanguage, VocabularyEntry[]> = { en, fr, es }
