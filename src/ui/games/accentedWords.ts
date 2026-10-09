import { hasAccent } from '../../engine/accents'
import { displayForm } from '../../engine/exercises'
import type { VocabularyEntry } from '../../engine/types'

/** Enough accented words for a round to be worth playing. */
export const ACCENT_MIN_WORDS = 4

export const accentedWords = (vocabulary: readonly VocabularyEntry[]) => vocabulary.filter((v) => hasAccent(displayForm(v)))
