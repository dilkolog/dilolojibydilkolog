import { useMemo, useRef, useState } from 'react'
import { conjugateTense, subjectLabel, withSubject, type Tense } from '../../engine/tenses'
import { TENSE_BRIEF } from '../../engine/tenseBrief'
import { AccentBar } from '../AccentBar'
import { accentChange, insertAt } from '../accentCaret'
import { sfx } from '../sounds'
import { canSpeak, speak } from '../speech'
import { SpeakerIcon } from '../icons'
import { judge, tenseName, verbEntry, type LabLanguage } from './labShared'
import { transformRound, type Transform } from './tenseTransform'

/**
 * Change the tense: a real sentence with its verb in one tense, the same person to be written in
 * another. Knowing a table is one thing; moving a form from one table to the other is what
 * speaking asks for ("I said it in the present, now tell it as yesterday").
 */
export function TransformQuiz({
  language,
  verbs,
  onAnswer,
}: {
  language: LabLanguage
  /** The verb chosen in the lab first, then the learner's own and the most common ones. */
  verbs: readonly string[]
  onAnswer?: (verb: string, tense: Tense, ok: boolean, given: string, expected: string, person: number) => void
}) {
  const [round, setRound] = useState(0)
  const key = verbs.slice(0, 1).join()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const questions = useMemo(() => transformRound(language, verbs, Date.now() + round), [language, key, round])
  const [index, setIndex] = useState(0)
  const [right, setRight] = useState(0)
  if (!questions.length) return <p className="muted">Bu fiillerle zaman değiştirilecek cümle bulunamadı.</p>
  const q = questions[index]
  if (!q)
    return (
      <section className="stack lab-result" role="status">
        <h3>
          {right} / {questions.length} doğru
        </h3>
        <div className="row">
          <button
            type="button"
            className="btn"
            autoFocus
            onClick={() => {
              setRound((r) => r + 1)
              setIndex(0)
              setRight(0)
            }}
          >
            Yeni cümleler
          </button>
        </div>
      </section>
    )
  return (
    <div className="stack lab-transform">
      <p className="small muted">
        {index + 1} / {questions.length} · Fiili başka zamana çevir, kişi aynı kalsın
      </p>
      <TransformQuestion
        key={`${round}-${index}`}
        language={language}
        q={q}
        last={index + 1 >= questions.length}
        onAnswered={(ok, given, person, expected) => {
          if (ok) setRight((n) => n + 1)
          onAnswer?.(q.verb, q.to, ok, given, expected, person)
        }}
        onContinue={() => setIndex((i) => i + 1)}
      />
      <p className="small muted">
        Cümleler: <a href="https://tatoeba.org" target="_blank" rel="noreferrer">Tatoeba</a> (CC BY 2.0 FR) ve Diloloji
      </p>
    </div>
  )
}

function TransformQuestion({
  language,
  q,
  last,
  onAnswered,
  onContinue,
}: {
  language: LabLanguage
  q: Transform
  last: boolean
  onAnswered: (ok: boolean, given: string, person: number, expected: string) => void
  onContinue: () => void
}) {
  const [typed, setTyped] = useState('')
  const [shown, setShown] = useState<boolean | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const target = conjugateTense(verbEntry(language, q.verb), q.to) ?? []
  const [before, after] = q.text.split('___')
  // The person the answer is recorded under: the one typed when several fit.
  const [person, setPerson] = useState(q.persons[0])
  const check = () => {
    if (!typed.trim() || shown !== null) return
    const hit = q.persons.find((p) => judge(language, q.verb, q.to, p, typed))
    const ok = hit !== undefined
    const p = hit ?? q.persons[0]
    setPerson(p)
    setShown(ok)
    if (ok) sfx.correct()
    else sfx.wrong()
    onAnswered(ok, typed.trim(), p, target[p] ?? '')
  }
  const subjects = q.persons.map((p) => subjectLabel(language, q.to, p).split(' / ')[0]).join(' / ')
  return (
    <div className="stack">
      <p className="prompt-label" lang={language}>
        <span className="chip chip-sm">{tenseName(q.from)}</span> → <span className="chip chip-sm lab-transform-to">{tenseName(q.to)}</span>
      </p>
      <p className="prompt-text" lang={language}>
        {before}
        <mark className="lab-transform-form">{q.form}</mark>
        {after}
      </p>
      {q.translation && <p className="small muted">{q.translation}</p>}
      <p className="small">
        <span lang={language}>
          <strong>{q.verb}</strong> · {subjects}
        </span>{' '}
        <span className="muted">· {TENSE_BRIEF[q.to].tr}</span>
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
          aria-label={`${tenseName(q.to)} biçimi`}
          placeholder={`${tenseName(q.to)} biçimini yaz`}
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
              {shown ? 'Doğru: ' : 'Doğrusu: '}
              <strong lang={language}>{withSubject(language, q.to, person, target[person] ?? '')}</strong>
              {!shown && q.persons.length > 1 && (
                <span className="muted">
                  {' '}
                  (ya da <span lang={language}>{q.persons.filter((p) => p !== person).map((p) => withSubject(language, q.to, p, target[p] ?? '')).join(', ')}</span>)
                </span>
              )}
              {canSpeak() && (
                <button type="button" className="icon-btn icon-btn-sm" aria-label="Cümleyi dinle" onClick={() => speak(`${before}${q.form}${after}`, language)}>
                  <SpeakerIcon size={15} />
                </button>
              )}
            </p>
            <p className="small muted">
              <span lang={language}>{tenseName(q.to)}</span>: {TENSE_BRIEF[q.to].short}
            </p>
            <div className="row">
              <button type="button" className="btn" onClick={onContinue} autoFocus>
                {last ? 'Bitir' : 'Devam'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
