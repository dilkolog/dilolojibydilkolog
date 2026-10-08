import { useState } from 'react'
import { prefs } from '../prefs'
import { subjectLabel, isCompound, personsOf, withSubject, type Tense } from '../../engine/tenses'
import { canSpeak, speak } from '../speech'
import { CheckIcon, CloseIcon, SpeakerIcon } from '../icons'
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
 * mode: each form stays covered until it is tapped; with `onMemorised`, the learner then says whether
 * they knew it, and once every form is marked the results go to mastery.
 */
export function FormTable({
  language,
  tense,
  forms,
  irregular = [],
  layout = 'columns',
  hide = false,
  speakable = true,
  weak = {},
  turkish,
  onMemorised,
}: {
  language: LabLanguage
  tense: Tense
  forms: string[]
  irregular?: boolean[]
  layout?: 'columns' | 'single'
  hide?: boolean
  speakable?: boolean
  /** Persons the learner often gets wrong in this tense, with a short note ("3/5 yanlış"). */
  weak?: Readonly<Record<number, string>>
  /** The same forms in Turkish (bekliyorum…), by person, when the verb's meaning allows it. */
  turkish?: readonly string[]
  /** Memorise mode marked through: knew it or not, for each person (vosotros left out when hidden). */
  onMemorised?: (results: { person: number; ok: boolean }[]) => void
}) {
  const [shown, setShown] = useState<ReadonlySet<number>>(new Set())
  const [graded, setGraded] = useState<Readonly<Record<number, boolean>>>({})
  // The persons the tense has (the imperative speaks to some only); endings are coloured among those.
  const order = personsOf(language, tense)
  const shownSegs = splitEndings(order.map((i) => forms[i]), isCompound(tense))
  const segs = Object.fromEntries(order.map((i, n) => [i, shownSegs[n]]))
  const counted = order.filter((i) => !(language === 'es' && i === 4 && prefs.hideVosotros))
  const grade = (person: number, ok: boolean) => {
    const next = { ...graded, [person]: ok }
    setGraded(next)
    if (counted.every((p) => p in next)) onMemorised?.(counted.map((p) => ({ person: p, ok: next[p] })))
  }
  return (
    <div className={`lab-forms is-${layout}`} lang={language} role="table" aria-label="Çekim">
      {order.map((i) => {
        const faded = language === 'es' && i === 4 && prefs.hideVosotros
        const covered = hide && !shown.has(i)
        const content = (
          <>
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
            {hide && !covered && onMemorised && counted.includes(i) && (
              i in graded ? (
                <span className={`lab-graded ${graded[i] ? 'is-ok' : 'is-no'}`} role="img" aria-label={graded[i] ? 'Bildin' : 'Bilemedin'}>
                  {graded[i] ? <CheckIcon size={15} /> : <CloseIcon size={15} />}
                </span>
              ) : (
                <span className="lab-grade" role="group" aria-label={`${subjectLabel(language, tense, i)}: bildin mi?`}>
                  <button type="button" className="icon-btn icon-btn-sm is-ok" onClick={() => grade(i, true)} aria-label="Bildim" title="Bildim">
                    <CheckIcon size={15} />
                  </button>
                  <button type="button" className="icon-btn icon-btn-sm is-no" onClick={() => grade(i, false)} aria-label="Bilemedim" title="Bilemedim">
                    <CloseIcon size={15} />
                  </button>
                </span>
              )
            )}
          </>
        )
        return (
          <div key={i} className={`lab-row${faded ? ' is-faded' : ''}${weak[i] ? ' is-weak' : ''}${turkish?.[i] ? ' has-tr' : ''}`} role="row" title={faded ? 'İspanya’da kullanılır; sorularda çıkmaz (Ayarlar → Sorular)' : weak[i] ? `Bu zamanda bu kişide ${weak[i]}` : undefined}>
            <span className="lab-subject" role="rowheader">
              {subjectLabel(language, tense, i)}
              {weak[i] && <span className="sr-only">, sık yanlış yaptığın biçim ({weak[i]})</span>}
            </span>
            {turkish?.[i] ? (
              <span className="lab-stack" role="cell">
                <span className="lab-cell">{content}</span>
                <span className="lab-tr" lang="tr">
                  {turkish[i]}
                </span>
              </span>
            ) : (
              <span className="lab-cell" role="cell">
                {content}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
