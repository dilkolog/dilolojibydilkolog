import { useMemo, useState } from 'react'
import { sfx } from '../sounds'
import { moodRound } from './moodRound'
import type { LabLanguage } from './labShared'

/**
 * Which form the sentence needs: the subjunctive after il faut que / ojalá / no creo que, the
 * indicative after je pense que / creo que; and in French, être or avoir in the passé composé.
 * Two real forms of the verb to choose from, and why, after the answer.
 */
export function MoodQuiz({ language, verbs }: { language: LabLanguage; verbs: readonly string[] }) {
  const [round, setRound] = useState(0)
  const questions = useMemo(() => moodRound(language, verbs, Date.now() + round), [language, verbs, round])
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [right, setRight] = useState(0)
  const q = questions[index]
  if (!questions.length) return <p className="muted">Bu fiillerle soru kurulamadı.</p>
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
              setPicked(null)
            }}
          >
            Tekrar
          </button>
        </div>
      </section>
    )
  const answer = (form: string) => {
    if (picked) return
    setPicked(form)
    if (form === q.answer) {
      setRight((n) => n + 1)
      sfx.correct()
    } else sfx.wrong()
  }
  return (
    <div className="stack lab-moodquiz">
      <p className="small muted">
        {index + 1} / {questions.length} · {q.kind === 'aux' ? 'Yardımcı fiili seç' : 'Cümleye uyan biçimi seç'}
      </p>
      <p className="prompt-label" lang={language}>
        {q.verb}
      </p>
      <p className="prompt-text" lang={language}>
        {q.before} <span className="lab-blank">{picked ? q.answer : '_____'}</span>
        {q.after}
      </p>
      <div className="lab-options" role="group" aria-label="Seçenekler" lang={language}>
        {q.options.map((o) => (
          <button key={o} type="button" className={`lab-option${picked ? (o === q.answer ? ' is-right' : o === picked ? ' is-wrong' : '') : ''}`} disabled={!!picked} onClick={() => answer(o)}>
            {o}
          </button>
        ))}
      </div>
      {picked && (
        <div className={`accent-result is-${picked === q.answer ? 'correct' : 'wrong'}`}>
          <p className="small" role="status">
            {picked === q.answer ? 'Doğru! ' : ''}
            {q.why}
          </p>
          <div className="row">
            <button type="button" className="btn" autoFocus onClick={() => (setPicked(null), setIndex((i) => i + 1))}>
              {index + 1 >= questions.length ? 'Bitir' : 'Devam'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
