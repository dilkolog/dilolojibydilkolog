import { useState } from 'react'
import { prefs } from '../prefs'
import { subjectLabel, isCompound, withSubject, type Tense } from '../../engine/tenses'
import { canSpeak, speak } from '../speech'
import { SpeakerIcon } from '../icons'
import { splitEndings, type LabLanguage, type Seg } from './labShared'

/** One form with its ending coloured (and the part that breaks the rule marked when it does). */
function Form({ segs, odd }: { segs: Seg[]; odd: boolean }) {
  return (
    <span className={odd ? 'lab-form is-odd' : 'lab-form'}>
      {segs.map((s, i) => (s.text ? <span key={i} className={s.kind === 'stem' ? undefined : `lab-${s.kind}`}>{s.text}</span> : null))}
      {odd && <span className="sr-only"> (düzensiz)</span>}
    </span>
  )
}

/**
 * The six forms of a tense with their subjects. `columns` sets singular and plural side by side
 * (the way a verb table is learned), `single` stacks them (a narrow card). `hide` is the memorise
 * mode: each form stays covered until it is tapped.
 */
export function FormTable({
  language,
  tense,
  forms,
  irregular = [],
  layout = 'columns',
  hide = false,
  speakable = true,
}: {
  language: LabLanguage
  tense: Tense
  forms: string[]
  irregular?: boolean[]
  layout?: 'columns' | 'single'
  hide?: boolean
  speakable?: boolean
}) {
  const [shown, setShown] = useState<ReadonlySet<number>>(new Set())
  const segs = splitEndings(forms, isCompound(tense))
  const order = [0, 1, 2, 3, 4, 5]
  return (
    <div className={`lab-forms is-${layout}`} lang={language} role="table" aria-label="Çekim">
      {order.map((i) => {
        const faded = language === 'es' && i === 4 && prefs.hideVosotros
        const covered = hide && !shown.has(i)
        return (
          <div key={i} className={`lab-row${faded ? ' is-faded' : ''}`} role="row" title={faded ? 'İspanya’da kullanılır; sorularda çıkmaz (Ayarlar → Sorular)' : undefined}>
            <span className="lab-subject" role="rowheader">
              {subjectLabel(language, tense, i)}
            </span>
            <span className="lab-cell" role="cell">
              {covered ? (
                <button type="button" className="lab-cover" onClick={() => setShown(new Set(shown).add(i))} aria-label={`${subjectLabel(language, tense, i)} biçimini göster`}>
                  • • •
                </button>
              ) : (
                <Form segs={segs[i]} odd={!!irregular[i]} />
              )}
              {speakable && canSpeak() && !covered && (
                <button type="button" className="icon-btn icon-btn-sm lab-say" onClick={() => speak(withSubject(language, tense, i, forms[i]), language)} aria-label={`Dinle: ${withSubject(language, tense, i, forms[i])}`}>
                  <SpeakerIcon size={15} />
                </button>
              )}
            </span>
          </div>
        )
      })}
    </div>
  )
}
