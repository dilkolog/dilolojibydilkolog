import { useEffect, useRef, useState } from 'react'
import { loadTenses } from '../../data/tenseData'
import { TENSE_LESSON } from '../../data/tenseLesson'
import { TENSE_LESSON_MORE } from '../../data/tenseLessonMore'
import { TENSE_LESSON_DEEP } from '../../data/tenseLessonDeep'
import { conjugateTense, personsOf, subjectLabel, tensesLoaded, type Tense } from '../../engine/tenses'
import { CloseIcon, InfoIcon, SpeakerIcon } from '../icons'
import { speak } from '../speech'
import { tenseName, type LabLanguage } from './labShared'

const SAMPLE_VERBS: Record<LabLanguage, readonly [string, string, string]> = {
  fr: ['parler', 'finir', 'aller'],
  es: ['hablar', 'comer', 'vivir'],
}
/** The irregular verbs met most, shown beside the regular models. */
const IRREGULAR_VERBS: Record<LabLanguage, readonly string[]> = {
  fr: ['être', 'avoir', 'faire', 'pouvoir', 'venir', 'vouloir'],
  es: ['ser', 'estar', 'tener', 'hacer', 'poder', 'decir'],
}

/** A table of one tense for some verbs, one row a person; null when a verb has no such tense. */
function FormsTable({ language, tense, verbs, label }: { language: LabLanguage; tense: Tense; verbs: readonly string[]; label: string }) {
  const forms = verbs.map((lemma) => conjugateTense({ language, lemma, partOfSpeech: 'verb' }, tense))
  const shown = verbs.map((v, i) => ({ v, f: forms[i] })).filter((x) => !!x.f)
  if (!shown.length) return null
  const persons = personsOf(language, tense)
  return (
    <div className="guide-table-wrap" tabIndex={0} role="region" aria-label={label}>
      <table className="guide-table tense-sample-table">
        <thead>
          <tr>
            <th scope="col">Kişi</th>
            {shown.map(({ v }) => (
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
              {shown.map(({ v, f }) => (
                <td key={v} lang={language}>
                  {f?.[p] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
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
  const more = TENSE_LESSON_MORE[tense]
  const deep = TENSE_LESSON_DEEP[tense] ?? []
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
        {more && (
          <p className="note tg-formula">
            <strong>Formül:</strong> <span lang={language}>{more.formula}</span>
          </p>
        )}
        {more && (
          <section className="tg-section" aria-label="Sinyal sözcükleri">
            <h3 className="subhead">Hangi sözcükler bu zamanı çağırır?</h3>
            <ul className="tg-markers" lang={language}>
              {more.markers.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          </section>
        )}
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
            <FormsTable language={language} tense={tense} verbs={sampleVerbs} label="Örnek çekimler tablosu" />
            <h3 className="subhead">Sık kullanılan düzensiz fiiller</h3>
            <FormsTable language={language} tense={tense} verbs={IRREGULAR_VERBS[language]} label="Düzensiz fiiller tablosu" />
          </section>
        )}
        <section className="tg-section">
          <h3 className="subhead">Örnekler</h3>
          <ul className="tg-examples">
            {[...guide.examples, ...(more?.examples ?? [])].map((x) => (
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
        {more && more.contrast.length > 0 && (
          <section className="tg-section">
            <h3 className="subhead">Karıştırılanlardan farkı</h3>
            <ul className="tg-list">
              {more.contrast.map((x) => (
                <li key={x.with}>
                  <strong>{x.with}:</strong> {x.text}
                </li>
              ))}
            </ul>
          </section>
        )}
        {more && more.slips.length > 0 && (
          <section className="tg-section">
            <h3 className="subhead">Sık yapılan hatalar</h3>
            <ul className="tg-slips">
              {more.slips.map((x) => (
                <li key={x.wrong}>
                  <span className="tg-wrong" lang={language}>
                    {x.wrong}
                  </span>
                  <span className="tg-right" lang={language}>
                    {x.right}
                  </span>
                  <span className="small muted">{x.why}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        <section className="tg-section">
          <h3 className="subhead">Dikkat</h3>
          <ul className="tg-list">
            {guide.watch.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </section>
        {deep.length > 0 && (
          <section className="tg-section tg-deep" aria-labelledby="tense-deep-title">
            <h3 id="tense-deep-title" className="subhead">
              Ayrıntılar
            </h3>
            {deep.map((d) => (
              <details key={d.title} className="tg-deep-item">
                <summary>{d.title}</summary>
                <ul className="tg-list">
                  {d.points.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
                {d.examples && (
                  <ul className="tg-examples">
                    {d.examples.map((x) => (
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
                )}
              </details>
            ))}
          </section>
        )}
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
