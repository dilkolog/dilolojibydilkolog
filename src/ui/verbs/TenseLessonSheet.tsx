import { useEffect, useRef, useState } from 'react'
import { loadTenses } from '../../data/tenseData'
import { TENSE_LESSON } from '../../data/tenseLesson'
import { conjugateTense, personsOf, subjectLabel, tensesLoaded, type Tense } from '../../engine/tenses'
import { CloseIcon, InfoIcon, SpeakerIcon } from '../icons'
import { speak } from '../speech'
import { tenseName, type LabLanguage } from './labShared'

const SAMPLE_VERBS: Record<LabLanguage, readonly [string, string, string]> = {
  fr: ['parler', 'finir', 'aller'],
  es: ['hablar', 'comer', 'vivir'],
}

/**
 * The ⓘ beside the tense chips: opens a short lesson on the tense being looked at (what it is for,
 * how it is made, examples, where learners slip, how to remember it), so a tense can be revised
 * in the middle of practice without leaving the lab.
 */
export function TenseInfoButton({ language, tense }: { language: LabLanguage; tense: Tense }) {
  const [open, setOpen] = useState(false)
  if (!TENSE_LESSON[tense]) return null
  return (
    <>
      <button type="button" className="icon-btn lab-tense-info" aria-label="Bu zamanın konu anlatımı" title="Bu zaman nasıl kullanılır?" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <InfoIcon size={20} />
      </button>
      {open && <TenseLessonSheet language={language} tense={tense} onClose={() => setOpen(false)} />}
    </>
  )
}

export function TenseLessonSheet({ language, tense, onClose, onVerbs }: { language: LabLanguage; tense: Tense; onClose: () => void; onVerbs?: () => void }) {
  const guide = TENSE_LESSON[tense]
  const closeRef = useRef<HTMLButtonElement>(null)
  const [ready, setReady] = useState(() => tensesLoaded(language))
  useEffect(() => {
    let live = true
    if (!tensesLoaded(language)) {
      void loadTenses(language).then(() => {
        if (live) setReady(true)
      })
    }
    return () => {
      live = false
    }
  }, [language])
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.stopImmediatePropagation()
      onClose()
    }
    // Capture phase: Esc closes this before any screen-level shortcut sees it.
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      before?.focus?.()
    }
  }, [onClose])
  if (!guide) return null
  const sampleVerbs = SAMPLE_VERBS[language]
  const sampleForms = ready ? sampleVerbs.map((lemma) => conjugateTense({ language, lemma, partOfSpeech: 'verb' }, tense)) : []
  const persons = personsOf(language, tense)
  const hasTable = sampleForms.length === sampleVerbs.length && sampleForms.every((f) => !!f)
  return (
    <div className="dialog-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog dialog-wide tense-lesson" role="dialog" aria-modal="true" aria-labelledby="tense-lesson-title">
        <div className="tg-head">
          <h2 id="tense-lesson-title" className="section-title" lang={language}>
            {tenseName(tense)}
          </h2>
          <button ref={closeRef} type="button" className="icon-btn" aria-label="Kapat" onClick={onClose}>
            <CloseIcon size={20} />
          </button>
        </div>
        <p className="tg-summary">{guide.summary}</p>
        <section className="tg-section">
          <h3 className="subhead">Ne zaman kullanılır?</h3>
          <ul className="tg-list">
            {guide.uses.map((u) => (
              <li key={u}>{u}</li>
            ))}
          </ul>
        </section>
        <section className="tg-section">
          <h3 className="subhead">Nasıl kurulur?</h3>
          <ul className="tg-list">
            {guide.formation.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </section>
        {hasTable && (
          <section className="tg-section" aria-label="Örnek çekimler">
            <h3 className="subhead">Örnek çekimler</h3>
            <div className="guide-table-wrap" tabIndex={0} role="region" aria-label="Örnek çekimler tablosu">
              <table className="guide-table tense-sample-table">
                <thead>
                  <tr>
                    <th scope="col">Kişi</th>
                    {sampleVerbs.map((v) => (
                      <th key={v} scope="col" lang={language}>
                        {v}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {persons.map((p) => (
                    <tr key={p}>
                      <td className="muted" lang={language}>
                        {subjectLabel(language, tense, p)}
                      </td>
                      {sampleForms.map((forms, idx) => (
                        <td key={sampleVerbs[idx]} lang={language}>
                          {forms?.[p] ?? '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
        <section className="tg-section">
          <h3 className="subhead">Örnekler</h3>
          <ul className="tg-examples">
            {guide.examples.map((x) => (
              <li key={x.text}>
                <button type="button" className="icon-btn icon-btn-sm" onClick={() => speak(x.text, language)} aria-label={`Dinle: ${x.text}`}>
                  <SpeakerIcon size={16} />
                </button>
                <span className="tg-ex" lang={language}>
                  {x.text}
                </span>
                <span className="small muted">{x.tr}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="tg-section">
          <h3 className="subhead">Dikkat</h3>
          <ul className="tg-list">
            {guide.watch.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </section>
        <p className="note tg-tip">
          <strong>Aklında kalsın:</strong> {guide.tip}
        </p>
        {guide.turkish && (
          <p className="small muted">
            <strong>Türkçede:</strong> {guide.turkish}
          </p>
        )}
        {onVerbs && (
          <div className="row">
            <button type="button" className="btn" onClick={onVerbs}>
              Fiil laboratuvarında çalış
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
