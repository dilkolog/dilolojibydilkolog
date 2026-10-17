import { useEffect, useState } from 'react'
import { lessonMinutes, lessonsThisWeek, readToday } from '../engine/guideGoal'
import { localDate } from '../engine/progress'
import type { TargetLanguage } from '../engine/types'
import { db } from '../data/instance'
import { loadMarks } from './guideProgress'
import { CloseIcon } from './icons'
import { NEW_ART } from './drawnArt'

/** The day the learner put today's lesson off, per language (this device only). */
const dismissKey = (language: string) => `diloloji:guide-lesson-nudge:${language}`
const dismissedToday = (language: string, today: string) => {
  try {
    return localStorage.getItem(dismissKey(language)) === today
  } catch {
    return false
  }
}

interface Pick {
  topic: string
  title: string
  level: string
  minutes: number
  week: number
}

/**
 * Today: the next lesson of the guide's path, with how long it takes and, when the learner set a weekly goal, how
 * many lessons that week has. It shows to someone who uses the guide (has read a lesson or set a goal), not on a day a
 * lesson was already read, and not once the weekly goal is reached. The lessons load only when it is going to show.
 */
export function GuideLessonNudge({ language, goal, onOpen }: { language: TargetLanguage; goal?: number; onOpen: (topic: string) => void }) {
  const [pick, setPick] = useState<Pick | null>(null)
  useEffect(() => {
    let live = true
    setPick(null)
    const today = localDate(new Date())
    if (dismissedToday(language, today)) return
    void loadMarks(db)
      .then(async (marks) => {
        const week = lessonsThisWeek(marks, today)
        const uses = !!goal || Object.values(marks).some((m) => m.read)
        if (!uses || readToday(marks, today) || (goal && week >= goal)) return
        const [{ lessonsOf, lessonTitle }, { pathOrder }, { pickNext }, { isRead }] = await Promise.all([
          import('../data/guide/lessonOf'),
          import('../data/guide/path'),
          import('../data/guide/prereqs'),
          import('../engine/guideReview'),
        ])
        const next = pickNext(pathOrder(lessonsOf(language)), (t) => isRead(marks[t]))
        if (live && next) setPick({ topic: next.topic, title: lessonTitle(next), level: next.level, minutes: lessonMinutes(next), week })
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [language, goal])
  if (!pick) return null
  return (
    <div className="habit-nudge">
      <button type="button" className="habit-nudge-main" onClick={() => onOpen(pick.topic)}>
        <img className="nudge-art" src={NEW_ART.guideTeach} alt="" width={30} height={30} draggable={false} />
        <span>
          <strong>Bugünün dersi:</strong> <span className="muted">“{pick.title}” · {pick.level} · ~{pick.minutes} dk{goal ? ` · bu hafta ${pick.week}/${goal}` : ''}</span>
        </span>
        <span className="habit-nudge-cta">Dersi aç</span>
      </button>
      <button
        type="button"
        className="icon-btn icon-btn-sm"
        aria-label="Bugün değil"
        title="Bugün değil"
        onClick={() => {
          try {
            localStorage.setItem(dismissKey(language), localDate(new Date()))
          } catch {
            // Hidden until the page is reloaded.
          }
          setPick(null)
        }}
      >
        <CloseIcon size={16} />
      </button>
    </div>
  )
}
