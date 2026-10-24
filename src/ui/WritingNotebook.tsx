import { useEffect, useState } from 'react'
import { db } from '../data/instance'
import { lessonFor } from '../data/guide/lessonOf'
import type { RepairTarget } from '../engine/blindSpots'
import type { TargetLanguage } from '../engine/types'
import { repairFor, WRITING_LABEL, writingRows, type WritingRow } from '../engine/writingErrors'
import { dayAgo } from './format'
import { PenIcon, PlayIcon } from './icons'
import { AskMonki } from './monki/AskMonki'
import { habitAsk } from './monki/asks'

/** At most this many kinds are listed: the few that matter most. */
const SHOWN = 5

/**
 * "Yazı hata defterim": what the grammar checker found in the learner's own texts (Günlük, Hikâye, Rehber), by kind and over
 * time, with the last examples (what was written → what it should be) and the practice for each kind. A single underline
 * in one text says little; the same kind coming back again and again is what is worth working on.
 */
export function WritingNotebook({
  language,
  onRepair,
  onLesson,
}: {
  language: TargetLanguage
  onRepair: (target: RepairTarget) => void
  onLesson?: (lesson: { topic?: string }) => void
}) {
  const [rows, setRows] = useState<WritingRow[]>([])
  useEffect(() => {
    let live = true
    db.getWritingLog()
      .then((log) => live && setRows(writingRows(log, language)))
      .catch(() => live && setRows([]))
    return () => {
      live = false
    }
  }, [language])

  if (!rows.length) return null
  const total = rows.reduce((n, r) => n + r.n, 0)
  return (
    <section className="section stack writing-notebook" aria-label="Yazı hata defterim">
      <p className="eyebrow eyebrow-icon">
        <PenIcon size={16} /> Yazı hata defterim
      </p>
      <h2 className="section-title">Yazılarında tekrar eden hatalar</h2>
      <p className="small muted">Denetlediğin yazılardan (Günlük, Hikâye, Rehber) toplanan {total} hata. Aynı türün tekrar tekrar gelmesi, çalışılacak yerin ipucudur.</p>
      <ul className="blind-list">
        {rows.slice(0, SHOWN).map((r) => {
          const fix = repairFor(r.kind, language)
          const lesson = fix?.lesson && lessonFor(language, fix.lesson) ? fix.lesson : undefined
          return (
            <li key={r.kind}>
              <div className="blind-text">
                <strong>{WRITING_LABEL[r.kind]}</strong>
                <span className="small muted">
                  {r.n} kez · son: {dayAgo(r.last)}
                </span>
                {r.samples.slice(0, 2).map((s) => (
                  <span key={`${s.wrong}|${s.fix}`} className="small writing-sample" lang={language}>
                    <s>{s.wrong}</s> → <strong>{s.fix}</strong>
                  </span>
                ))}
              </div>
              {fix && (
                <span className="blind-actions">
                  <AskMonki label="Monki'ye sor" ask={() => habitAsk(WRITING_LABEL[r.kind], r.n, r.samples)} />
                  {onLesson && lesson && (
                    <button type="button" className="btn btn-sm btn-quiet" onClick={() => onLesson({ topic: lesson })}>
                      Dersi oku
                    </button>
                  )}
                  <button type="button" className="btn btn-sm" onClick={() => onRepair(fix.target)}>
                    <PlayIcon size={14} /> {fix.action}
                  </button>
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}
