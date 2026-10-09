import { useRef, useState } from 'react'
import { conjugateTense, subjectLabel, withSubject, type Tense } from '../../engine/tenses'
import type { PlanItem } from '../../engine/dailyPlan'
import { AccentBar } from '../AccentBar'
import { accentChange, insertAt } from '../accentCaret'
import { sfx } from '../sounds'
import { Diagnosis } from '../verbs/Diagnosis'
import { judge, tenseName, verbEntry } from '../verbs/labShared'

type Form = NonNullable<PlanItem['form']>

/**
 * A conjugated form from the verb lab, mixed into the day's session: the person and the verb, the
 * tense, the form typed. What went wrong is named; the answer goes to the lab's own review.
 */
export function FormQuestion({ form, onAnswered, onContinue }: { form: Form; onAnswered: (ok: boolean, given: string) => void; onContinue: () => void }) {
  const { language, verb, person } = form
  const tense = form.tense as Tense
  const [typed, setTyped] = useState('')
  const [shown, setShown] = useState<boolean | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const expected = conjugateTense(verbEntry(language, verb), tense)?.[person] ?? ''

  const check = () => {
    if (!typed.trim() || shown !== null) return
    const ok = judge(language, verb, tense, person, typed)
    setShown(ok)
    if (ok) sfx.correct()
    else sfx.wrong()
    onAnswered(ok, typed.trim())
  }

  return (
    <div className="stack lab-review-run session-form">
      <p className="prompt-label">
        Fiil çekimi · <span lang={language}>{tenseName(tense)}</span>
      </p>
      <p className="prompt-text" lang={language}>
        {subjectLabel(language, tense, person)} · {verb}
      </p>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault()
          if (shown !== null) onContinue()
          else check()
        }}
      >
        <input
          ref={input}
          className={`input answer-input${shown === null ? '' : shown ? ' is-correct' : ' is-wrong'}`}
          lang={language}
          value={typed}
          onChange={accentChange(language, setTyped)}
          autoFocus
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          disabled={shown !== null}
          aria-label="Cevap"
          placeholder="Çekimi yaz"
        />
        <AccentBar language={language} disabled={shown !== null} onInsert={(ch) => input.current && setTyped(insertAt(input.current, ch))} />
        {shown === null ? (
          <div className="row">
            <button type="submit" className="btn" disabled={!typed.trim()}>
              Kontrol et
            </button>
          </div>
        ) : (
          <div className={`accent-result is-${shown ? 'correct' : 'wrong'}`}>
            <p className="small" role="status">
              {shown ? 'Doğru!' : 'Doğrusu: '}
              {!shown && <strong lang={language}>{withSubject(language, tense, person, expected)}</strong>}
            </p>
            {!shown && <Diagnosis language={language} verb={verb} tense={tense} person={person} typed={typed} />}
            <div className="row">
              <button type="button" className="btn" onClick={onContinue} autoFocus>
                Devam
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
