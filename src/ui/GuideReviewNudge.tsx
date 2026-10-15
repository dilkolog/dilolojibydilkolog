import { useEffect, useState } from 'react'
import { dueLesson } from '../engine/guideReview'
import { localDate } from '../engine/progress'
import type { TargetLanguage } from '../engine/types'
import { loadMarks, markPutOff, saveMarks } from './guideProgress'
import { CloseIcon, SchoolIcon } from './icons'

/**
 * Today: a lesson of the guide read or learned a while ago comes back for three short questions
 * (3, 10 and 30 days after; see engine/guideReview). The lessons are loaded only when the learner has
 * read one, so Today stays light for everyone else; "not now" asks again after the same wait.
 */
export function GuideReviewNudge({ language, onOpen }: { language: TargetLanguage; onOpen: (topic: string) => void }) {
  const [due, setDue] = useState<{ topic: string; title: string } | null>(null)
  useEffect(() => {
    const marks = loadMarks()
    if (!Object.keys(marks).length) return
    let live = true
    void import('../data/guide/lessonOf')
      .then(({ checkableTopics, lessonFor, lessonTitle }) => {
        const topic = dueLesson(marks, checkableTopics(language), localDate(new Date()))
        const lesson = topic ? lessonFor(language, topic) : undefined
        if (live) setDue(lesson ? { topic: lesson.topic, title: lessonTitle(lesson) } : null)
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [language])
  if (!due) return null
  return (
    <div className="habit-nudge">
      <button type="button" className="habit-nudge-main" onClick={() => onOpen(due.topic)}>
        <SchoolIcon size={18} />
        <span>
          <strong>Hatırlıyor musun?</strong> <span className="muted">“{due.title}” dersinden üç kısa soru.</span>
        </span>
        <span className="habit-nudge-cta">Tekrar et</span>
      </button>
      <button
        type="button"
        className="icon-btn icon-btn-sm"
        aria-label="Şimdi değil"
        title="Şimdi değil"
        onClick={() => {
          saveMarks(markPutOff(loadMarks(), due.topic))
          setDue(null)
        }}
      >
        <CloseIcon size={16} />
      </button>
    </div>
  )
}
