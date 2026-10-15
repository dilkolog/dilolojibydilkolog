import { lessonFor, lessonTitle } from '../data/guide/lessonOf'
import type { TargetLanguage } from '../engine/types'
import { SchoolIcon } from './icons'

/** "The lesson on this": a quiet link from a mistake to the guide's lesson for its grammar topic (nothing when there is none). */
export function LessonLink({ language, topic, onOpen }: { language: TargetLanguage; topic: string; onOpen: (topic: string) => void }) {
  const lesson = lessonFor(language, topic)
  if (!lesson) return null
  return (
    <button type="button" className="link small lesson-link" onClick={() => onOpen(lesson.topic)}>
      <SchoolIcon size={16} className="inline-icon" /> Konunun dersi: {lessonTitle(lesson)}
    </button>
  )
}
