import { useEffect, useState } from 'react'
import { blindSpots, type BlindSpot, type RepairTarget } from '../engine/blindSpots'
import { stillMissed } from '../engine/earMisses'
import type { ErrorType, TargetLanguage } from '../engine/types'
import { db } from '../data/instance'
import { grammarExercises } from '../data/grammar'
import { trapWords } from '../data/traps'
import { lessonFor } from '../data/guide/lessonOf'
import { TENSE_LESSON } from '../data/tenseLesson'
import type { Tense } from '../engine/tenses'
import { writingRows } from '../engine/writingErrors'
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
    void (async () => {
      const [lab, grammar, pairs, traps, reflex, register, ear, writing] = await Promise.all([
        language === 'en' ? Promise.resolve(undefined) : db.getLab(language),
        db.getGrammarLog(),
        db.getPairLog(),
        db.getTrapLog(),
        db.getReflexLog(),
        db.getRegisterLog(),
        db.getEarLog(),
        db.getWritingLog(),
      ])
      const earMissed = Object.values(ear[language] ?? {}).filter(stillMissed).length
      return blindSpots({ language, errors, lab, grammar, grammarExercises: grammarExercises(language), pairs, traps, trapWords, reflex, register, earMissed, writing: writingRows(writing, language) })
    })()
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
