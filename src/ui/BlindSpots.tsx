import { useEffect, useState } from 'react'
import type { BlindSpot, RepairTarget } from '../engine/blindSpots'
import type { ErrorType, TargetLanguage } from '../engine/types'
import { lessonFor } from '../data/guide/lessonOf'
import { TENSE_LESSON } from '../data/tenseLesson'
import type { Tense } from '../engine/tenses'
import { loadBlindSpots } from './loadBlindSpots'
import { PlayIcon, TargetIcon } from './icons'

const hasLesson = (language: TargetLanguage, l: { topic?: string; tense?: string }) => (l.topic ? !!lessonFor(language, l.topic) : language !== 'en' && !!l.tense && !!TENSE_LESSON[l.tense as Tense])

/**
 * The learner's weakest places in one card, from what their own answers say (kinds of mistake,
 * tenses, grammar topics, sound contrasts, false friends, slow phrases, missed words); each has a
 * button to the practice for it. Says nothing until the data supports a finding.
 */
export function BlindSpotsCard({
  language,
  errors,
  onRepair,
  onLesson,
}: {
  language: TargetLanguage
  errors: Partial<Record<ErrorType, number>>
  onRepair: (target: RepairTarget) => void
  /** Opens the guide's lesson on a finding (a grammar topic or a tense). */
  onLesson?: (lesson: { topic?: string; tense?: string }) => void
}) {
  const [spots, setSpots] = useState<BlindSpot[] | null>(null)
  useEffect(() => {
    let live = true
    void loadBlindSpots(language, errors)
      .then((s) => live && setSpots(s))
      .catch(() => live && setSpots([]))
    return () => {
      live = false
    }
  }, [language, errors])

  if (!spots?.length) return null
  return (
    <section className="section stack blind-spots" aria-label="Kör nokta röntgeni">
      <p className="eyebrow eyebrow-icon">
        <TargetIcon size={16} /> Kör nokta röntgeni
      </p>
      <h2 className="section-title">En çok takıldığın yerler</h2>
      <p className="small muted">Kendi cevaplarından çıkan en belirgin zayıf noktalar; her birinin yanında çalışacağın yer var.</p>
      <ul className="blind-list">
        {spots.map((s) => (
          <li key={s.id}>
            <div className="blind-text">
              <strong>{s.title}</strong>
              <span className="small muted">{s.detail}</span>
            </div>
            <span className="blind-actions">
              {onLesson && s.lesson && hasLesson(language, s.lesson) && (
                <button type="button" className="btn btn-sm btn-quiet" onClick={() => onLesson(s.lesson!)}>
                  Dersi oku
                </button>
              )}
              <button type="button" className="btn btn-sm" onClick={() => onRepair(s.target)}>
                <PlayIcon size={14} /> {s.action}
              </button>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
