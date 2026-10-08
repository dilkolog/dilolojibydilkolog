import { useState } from 'react'
import { TENSE_BRIDGE, TENSE_GUIDE } from '../../engine/tenseGuide'
import { irregularForms, type Tense } from '../../engine/tenses'
import { labForms } from '../../engine/verbLab'
import { FormTable } from './FormTable'
import { tenseName, verbEntry, type LabLanguage } from './labShared'

/** The three tenses to start with, for a language: the ones learners mix up first. */
const START: Record<LabLanguage, Tense[]> = {
  fr: ['present', 'passe-compose', 'imparfait'],
  es: ['presente', 'imperfecto', 'preterito'],
}

/** Compare (a view of the learn tab): three tenses of the verb side by side, each with what it is for. */
export function CompareTab({ language, verb, available }: { language: LabLanguage; verb: string; available: readonly Tense[] }) {
  const [picked, setPicked] = useState<Tense[]>(() => START[language].filter((t) => available.includes(t)))
  const chosen = [0, 1, 2].map((i) => picked[i] ?? available[i] ?? available[0])
  const entry = verbEntry(language, verb)
  const set = (i: number, t: Tense) => setPicked(chosen.map((c, j) => (j === i ? t : c)))
  return (
    <div className="stack lab-compare">
      <div className="lab-compare-picks">
        {chosen.map((t, i) => (
          <label key={i} className="field">
            <span className="small muted">{i + 1}. Zaman</span>
            <select className="input" value={t} onChange={(e) => set(i, e.target.value as Tense)} lang={language}>
              {available.map((a) => (
                <option key={a} value={a}>
                  {tenseName(a)}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <div className="lab-compare-cards">
        {chosen.map((t, i) => {
          const forms = labForms(entry, t, {})
          if (!forms) return null
          return (
            <article key={`${i}${t}`} className="lab-card">
              <header>
                <h3 lang={language}>{tenseName(t)}</h3>
              </header>
              <p className="small muted">{TENSE_GUIDE[t].short}</p>
              <p className="small lab-bridge-line">
                <span className="muted">Türkçede:</span> {TENSE_BRIDGE[t].suffix}
              </p>
              <FormTable language={language} tense={t} forms={forms} irregular={irregularForms(entry, t)} layout="single" speakable={false} />
              <p className="small lab-markers" lang={language}>
                {TENSE_GUIDE[t].markers.slice(0, 4).join(' · ')}
              </p>
            </article>
          )
        })}
      </div>
    </div>
  )
}
