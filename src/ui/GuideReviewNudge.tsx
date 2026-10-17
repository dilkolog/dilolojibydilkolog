import { useEffect, useState } from 'react'
import { dueLesson, isRead } from '../engine/guideReview'
import { localDate } from '../engine/progress'
import type { TargetLanguage } from '../engine/types'
import { db } from '../data/instance'
import { loadMarks, markPutOff } from './guideProgress'
import { CloseIcon } from './icons'
import { NEW_ART } from './drawnArt'

/**
 * Today: a lesson of the guide read or learned a while ago comes back for three short questions
 * (3, 10 and 30 days after; see engine/guideReview). The lessons are loaded only when the learner has
 * read one, so Today stays light for everyone else; "not now" asks again after the same wait.
 */
export function GuideReviewNudge({ language, onOpen }: { language: TargetLanguage; onOpen: (topic: string) => void }) {
  const [due, setDue] = useState<{ topic: string; title: string } | null>(null)
  useEffect(() => {
    let live = true
    void loadMarks(db)
      .then(async (marks) => {
        if (!Object.values(marks).some(isRead)) return
        const { checkableTopics, lessonFor, lessonTitle } = await import('../data/guide/lessonOf')
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
        <img className="nudge-art" src={NEW_ART.guideReview} alt="" width={30} height={30} draggable={false} />
        <span>
          <strong>Hatırlıyor musun?</strong> <span className="muted">“{due.title}” dersinden üç kısa soru.</span>
        </span>
        <span className="habit-nudge-cta">Tekrar et · +10 XP</span>
      </button>
      <button
        type="button"
        className="icon-btn icon-btn-sm"
        aria-label="Şimdi değil"
        title="Şimdi değil"
        onClick={() => {
          void loadMarks(db).then((marks) => db.saveGuideMarks(markPutOff(marks, due.topic))).catch(() => {})
          setDue(null)
        }}
      >
        <CloseIcon size={16} />
      </button>
    </div>
  )
}
