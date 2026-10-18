import { useEffect, useState } from 'react'
import type { TargetLanguage } from '../engine/types'
import { db } from '../data/instance'
import { loadMarks } from './guideProgress'
import { loadPlacement } from './guidePlacementStore'
import { CloseIcon } from './icons'
import { NEW_ART } from './drawnArt'

/** The learner turned the suggestion down for this language (kept on this device). */
const dismissKey = (language: string) => `diloloji:guide-placement-nudge:${language}`
const dismissed = (language: string) => {
  try {
    return localStorage.getItem(dismissKey(language)) === '1'
  } catch {
    return false
  }
}

/** Own words a learner needs before the suggestion makes sense: someone just looking around is not asked yet. */
export const PLACEMENT_NUDGE_MIN_WORDS = 5

/**
 * Today: to someone who has not used the guide (no lesson read, no weekly goal, no placement result) the offer to find
 * the level to start from. Asked once: "not now" or the test itself ends it for that language. The test's questions
 * load only when it is going to show.
 */
export function GuidePlacementNudge({ language, words, goal, onOpen }: { language: TargetLanguage; words: number; goal?: number; onOpen: () => void }) {
  const [show, setShow] = useState(false)
  useEffect(() => {
    let live = true
    setShow(false)
    if (words < PLACEMENT_NUDGE_MIN_WORDS || goal || dismissed(language) || loadPlacement(language)) return
    void loadMarks(db)
      .then(async (marks) => {
        if (Object.values(marks).some((m) => m.read)) return
        const { placementFor } = await import('../data/guide/placementData')
        if (live && placementFor(language).length > 0) setShow(true)
      })
      .catch(() => {})
    return () => {
      live = false
    }
  }, [language, words, goal])
  if (!show) return null
  return (
    <div className="habit-nudge">
      <button type="button" className="habit-nudge-main" onClick={onOpen}>
        <img className="nudge-art" src={NEW_ART.guideTeach} alt="" width={30} height={30} draggable={false} />
        <span>
          <strong>Seviyeni bul:</strong> <span className="muted">kısa bir gramer testiyle hangi dersten başlaman gerektiğini öğren.</span>
        </span>
        <span className="habit-nudge-cta">Teste başla</span>
      </button>
      <button
        type="button"
        className="icon-btn icon-btn-sm"
        aria-label="Şimdi değil"
        title="Şimdi değil"
        onClick={() => {
          try {
            localStorage.setItem(dismissKey(language), '1')
          } catch {
            // Hidden until the page is reloaded.
          }
          setShow(false)
        }}
      >
        <CloseIcon size={16} />
      </button>
    </div>
  )
}
