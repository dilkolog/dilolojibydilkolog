import type { TargetLanguage } from '../../engine/types'
import type { LessonCheck } from './lessonTypes'

/**
 * Extra questions for a lesson's check, kept in `checks/*.json` (a folder read with `import.meta.glob`: a new file is new
 * questions). A lesson's own `check` (three questions) and these make its pool; each check or review draws three of them,
 * so a review is not the same three questions again. Shape of a file:
 * `{ "language": "fr", "source": "Diloloji (özgün)", "lessons": { "<lesson topic>": [ { prompt, options, answer, why } ] } }`.
 */
export interface CheckPoolFile {
  language: TargetLanguage
  source: string
  lessons: Record<string, LessonCheck[]>
}

const files = import.meta.glob<CheckPoolFile>('./checks/*.json', { eager: true, import: 'default' })

/** Every pool file with its path, for the tests that check them. */
export const CHECK_POOL_FILES: [string, CheckPoolFile][] = Object.entries(files)

const byLanguage = new Map<TargetLanguage, Map<string, LessonCheck[]>>()
for (const [, file] of CHECK_POOL_FILES) {
  const topics = byLanguage.get(file.language) ?? new Map<string, LessonCheck[]>()
  for (const [topic, items] of Object.entries(file.lessons ?? {})) topics.set(topic, [...(topics.get(topic) ?? []), ...items])
  byLanguage.set(file.language, topics)
}

/** The extra questions of a lesson (by its topic), from all the files. */
export const extraChecks = (language: TargetLanguage, topic: string): LessonCheck[] => byLanguage.get(language)?.get(topic) ?? []
