import type { GrammarExercise } from '../engine/grammar'
import type { TargetLanguage } from '../engine/types'

/**
 * The grammar questions: every `grammar/*.json` file holds a list, so an imported open-licence set
 * is one more file. Questions of one language come out together; ids are the key of the learner's log.
 */
const FILES = import.meta.glob<GrammarExercise[]>('./grammar/*.json', { import: 'default', eager: true })

const ALL: GrammarExercise[] = Object.values(FILES).flat()

export const grammarExercises = (language: TargetLanguage): GrammarExercise[] => ALL.filter((e) => e.language === language)
