import { useId, useState } from 'react'
import type { GuideTerm } from '../data/guide/terms'
import type { TargetLanguage } from '../engine/types'
import { SpeakerIcon } from './icons'
import { speak } from './speech'

/**
 * The grammar terms a lesson uses, as small chips: one opens what the term is called in Turkish, what it means and an
 * example. Only one is open at a time; the lesson itself stays as it is.
 */
export function LessonTerms({ terms, language }: { terms: GuideTerm[]; language: TargetLanguage }) {
  const [open, setOpen] = useState<string | null>(null)
  const panelId = useId()
  if (!terms.length) return null
  const shown = terms.find((t) => t.term === open)
  return (
    <div className="lesson-terms stack gap-1">
      <p className="small muted">Bu derste geçen terimler: dokun, ne demek olduğunu gör.</p>
      <div className="choice-row" role="group" aria-label="Dilbilgisi terimleri">
        {terms.map((t) => (
          <button
            key={t.term}
            type="button"
            className="chip chip-sm"
            lang={language}
            aria-expanded={open === t.term}
            aria-controls={panelId}
            onClick={() => setOpen(open === t.term ? null : t.term)}
          >
            {t.term}
          </button>
        ))}
      </div>
      <div id={panelId} role="region" aria-label={shown ? `${shown.term} terimi` : undefined} hidden={!shown}>
        {shown && (
          <div className="note stack gap-1 lesson-term-card">
            <p>
              <strong lang={language}>{shown.term}</strong> · {shown.tr}
            </p>
            <p className="small">{shown.explanation}</p>
            {shown.example && (
              <p className="small row items-center gap-1">
                <button type="button" className="icon-btn icon-btn-sm" onClick={() => speak(shown.example!.text, language)} aria-label={`Dinle: ${shown.example.text}`}>
                  <SpeakerIcon size={16} />
                </button>
                <span lang={language}>{shown.example.text}</span> <span className="muted">{shown.example.tr}</span>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
