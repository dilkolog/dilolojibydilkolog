import type { TargetLanguage } from '../../engine/types'
import type { GuideLevel } from './lessonTypes'

/** One question of the placement test: bound to the lesson (and so the level) it is about. */
export interface PlacementQuestion {
  level: GuideLevel
  lesson: string
  prompt: string
  options: string[]
  answer: number
  why: string
}

interface PlacementFile {
  language: TargetLanguage
  source: string
  questions: PlacementQuestion[]
}

const FILES = import.meta.glob<PlacementFile>('./placement/*.json', { eager: true, import: 'default' })

/** The placement questions of a language, easiest level first (empty when it has none). */
export function placementFor(language: TargetLanguage): PlacementQuestion[] {
  return Object.values(FILES).find((f) => f.language === language)?.questions ?? []
}
