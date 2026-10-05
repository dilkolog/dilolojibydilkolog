import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { TENSE_GUIDE } from '../engine/tenseGuide'
import { canSpeak, speak } from './speech'
import { SpeakerIcon } from './icons'
import { conjugateTense, irregularForms, subjectLabel, tenseSentence, withSubject, tensesLoaded, tensesOf, type Tense } from '../engine/tenses'
import type { VocabularyEntry } from '../engine/types'
import { loadTenses } from '../data/tenseData'

type Verb = Pick<VocabularyEntry, 'language' | 'lemma' | 'partOfSpeech'>

/** Re-renders once the language's tense table has arrived (it is fetched on first need). */
export function useTenses(language: VocabularyEntry['language']): boolean {
  const [ready, setReady] = useState(() => language === 'en' || tensesLoaded(language))
  useEffect(() => {
    let live = true
    if (language !== 'en') void loadTenses(language).then(() => live && setReady(tensesLoaded(language)))
    return () => {
      live = false
    }
  }, [language])
  return ready
}

/** Tenses in four groups, so the choice fits a phone: the group first, then the tense within it. */
export const TENSE_GROUPS: { label: string; tenses: Tense[] }[] = [
  { label: 'Şimdi', tenses: ['present', 'presente'] },
  { label: 'Geçmiş', tenses: ['passe-compose', 'imparfait', 'preterito', 'perfecto', 'imperfecto'] },
  { label: 'Gelecek', tenses: ['futur', 'futuro'] },
  { label: 'Kipler', tenses: ['conditionnel', 'subjonctif', 'condicional', 'subjuntivo'] },
]

/**
 * A verb's forms, one tense at a time: what the tense is for, the six forms with the irregular
 * ones marked, the time words that call for it, and how it is built.
 */
export function ConjugationTable({ entry, initial }: { entry: Verb; initial?: Tense }) {
  useTenses(entry.language)
  const uid = useId()
  const tenses = tensesOf(entry)
  const [picked, setPicked] = useState<Tense | undefined>(initial)
  const tense = picked && tenses.includes(picked) ? picked : tenses[0]
  // After an arrow key, focus follows to the newly selected tab once it is drawn.
  const focusTab = useRef<string | null>(null)
  useEffect(() => {
    if (!focusTab.current) return
    document.getElementById(focusTab.current)?.focus()
    focusTab.current = null
  }, [tense])
  if (!tense || entry.language === 'en') return null
  const lang = entry.language
  const groups = TENSE_GROUPS.map((g) => ({ label: g.label, tenses: g.tenses.filter((t) => tenses.includes(t)) })).filter((g) => g.tenses.length)
  const current = groups.find((g) => g.tenses.includes(tense))
  // Arrow keys move between the groups (the tabs pattern); focus follows the selection.
  const moveTab = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : e.key === 'Home' ? -Infinity : e.key === 'End' ? Infinity : 0
    if (!step || !current) return
    e.preventDefault()
    const i = groups.indexOf(current)
    const next = groups[Math.max(0, Math.min(groups.length - 1, Number.isFinite(step) ? i + step : step < 0 ? 0 : groups.length - 1))]
    focusTab.current = `${uid}-tab-${next.label}`
    setPicked(next.tenses[0])
  }
  const forms = conjugateTense(entry, tense)!
  const odd = irregularForms(entry, tense)
  const guide = TENSE_GUIDE[tense]
  const compound = tense === 'passe-compose' || tense === 'perfecto'
  const sentence = tenseSentence(entry, tense)
  return (
    <div className="stack conj">
      {tenses.length > 1 && (
        <div className="tense-picker">
          <div className="segmented tense-tabs" role="tablist" aria-label="Zaman grubu" onKeyDown={moveTab}>
            {groups.map((g) => {
              const on = g.tenses.includes(tense)
              return (
                <button
                  key={g.label}
                  id={`${uid}-tab-${g.label}`}
                  role="tab"
                  className="segmented-btn"
                  aria-selected={on}
                  aria-controls={`${uid}-panel`}
                  tabIndex={on ? 0 : -1}
                  onClick={() => setPicked(g.tenses[0])}
                >
                  {g.label}
                </button>
              )
            })}
          </div>
          {(() => {
            const group = TENSE_GROUPS.find((g) => g.tenses.includes(tense))!.tenses.filter((t) => tenses.includes(t))
            return (
              group.length > 1 && (
                <div className="tense-sub" role="group" aria-label="Zaman">
                  {group.map((t) => (
                    <button key={t} type="button" className="chip chip-sm" aria-pressed={t === tense} onClick={() => setPicked(t)} lang={lang}>
                      {TENSE_GUIDE[t].name}
                    </button>
                  ))}
                </div>
              )
            )
          })()}
        </div>
      )}
      <div className="stack conj-panel" role={tenses.length > 1 ? 'tabpanel' : undefined} id={`${uid}-panel`} aria-labelledby={current && tenses.length > 1 ? `${uid}-tab-${current.label}` : undefined}>
      <p className="conj-lead">
        <strong>
          <span lang={lang}>{guide.name}</span> · {guide.tr}.
        </strong>{' '}
        {guide.short}
      </p>
      <table className="conj-table" lang={lang}>
        <tbody>
          {forms.map((f, i) => (
            <tr key={i}>
              <th scope="row">{subjectLabel(lang, tense, i)}</th>
              <td>
                {odd[i] ? (
                  compound ? (
                    // In a compound tense the participle is what breaks the rule (ai su), not the auxiliary.
                    <>
                      {f.slice(0, f.lastIndexOf(' ') + 1)}
                      <mark className="conj-odd" title="Düzensiz">
                        {f.slice(f.lastIndexOf(' ') + 1)}
                        <span className="sr-only"> (düzensiz)</span>
                      </mark>
                    </>
                  ) : (
                    <mark className="conj-odd" title="Düzensiz">
                      {f}
                      <span className="sr-only"> (düzensiz)</span>
                    </mark>
                  )
                ) : (
                  f
                )}
              </td>
              {canSpeak() && (
                <td className="conj-say">
                  {/* Hearing the form matters most where the ending is silent (parle, parles, parlent). */}
                  <button type="button" className="icon-btn icon-btn-sm" onClick={() => speak(withSubject(lang, tense, i, f), lang)} aria-label={`Dinle: ${withSubject(lang, tense, i, f)}`}>
                    <SpeakerIcon size={15} />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {odd.some(Boolean) && (
        <p className="small muted">
          <mark className="conj-odd">Altı çizili</mark> biçimler kuralın dışında; bunlara ayrıca dikkat et.
        </p>
      )}
      {sentence && (
        <p className="conj-sentence">
          <span lang={lang}>
            {sentence.text.split('___')[0]}
            <strong>{sentence.form}</strong>
            {sentence.text.split('___')[1]}
            {canSpeak() && (
              <button type="button" className="icon-btn icon-btn-sm conj-sentence-say" onClick={() => speak(sentence.text.replace('___', sentence.form), lang)} aria-label="Cümleyi dinle">
                <SpeakerIcon size={15} />
              </button>
            )}
          </span>
          {sentence.translation && <span className="muted small">{sentence.translation}</span>}
        </p>
      )}
      <div className="conj-markers" lang={lang}>
        <span className="small muted">Sık birlikte:</span>
        {guide.markers.map((m) => (
          <span key={m} className="pill">
            {m}
          </span>
        ))}
      </div>
      <details className="conj-how">
        <summary>Nasıl kurulur?</summary>
        <div className="stack">
          <p className="small">{guide.formation}</p>
          <ul className="conj-examples">
            {guide.examples.map(([s, tr]) => (
              <li key={s}>
                <span lang={lang}>{s}</span> <span className="muted">{tr}</span>
              </li>
            ))}
          </ul>
        </div>
      </details>
      </div>
    </div>
  )
}
