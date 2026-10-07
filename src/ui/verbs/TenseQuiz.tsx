import { useMemo, useState } from 'react'
import { createRng, shuffle } from '../../engine/rng'
import { TENSE_BRIDGE, TENSE_GUIDE } from '../../engine/tenseGuide'
import { tenseSentence, type Tense } from '../../engine/tenses'
import { sfx } from '../sounds'
import { tenseName, verbEntry, type LabLanguage } from './labShared'

const ROUND = 6
const OPTIONS = 4

interface Question {
  tense: Tense
  /** The Turkish sentence to read. */
  turkish: string
  /** The sentence in the language, shown after the answer. */
  target: string
  options: Tense[]
}

/** Which tense does this Turkish sentence call for? Built from the tense guide's own examples (and the verb's own checked sentence when it has a translation). */
function buildQuestions(language: LabLanguage, verb: string, available: readonly Tense[], seed: number): Question[] {
  const rng = createRng(seed)
  const entry = verbEntry(language, verb)
  // Nor the passé simple: Turkish says "açtı" for it and for the passé composé alike (the difference is register, not time).
  const askable = available.filter((t) => t !== 'passe-simple')
  // The simple tenses only: a Turkish sentence cannot tell the subjunctive from the indicative by itself.
  const pool = shuffle(
    askable.filter((t) => TENSE_GUIDE[t].examples.length),
    rng,
  ).slice(0, ROUND)
  return pool.map((tense) => {
    const own = tenseSentence(entry, tense)
    const [target, turkish] = own?.translation ? [own.text.replace('___', own.form), own.translation] : shuffle([...TENSE_GUIDE[tense].examples], rng)[0]
    const others = shuffle(askable.filter((t) => t !== tense), rng).slice(0, OPTIONS - 1)
    return { tense, turkish, target, options: shuffle([tense, ...others], rng) }
  })
}

/**
 * Think in Turkish: a Turkish sentence, and the tense it needs in the language. After the answer
 * the sentence in the language and the bridge between the two tenses show.
 */
export function TenseQuiz({ language, verb, available }: { language: LabLanguage; verb: string; available: readonly Tense[] }) {
  const [round, setRound] = useState(0)
  const questions = useMemo(() => buildQuestions(language, verb, available, Date.now() + round), [language, verb, available, round])
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<Tense | null>(null)
  const [right, setRight] = useState(0)
  const q = questions[index]
  if (available.length < 2) return <p className="muted">Bu fiil için karşılaştırılacak yeterli zaman yok.</p>
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
  const answer = (t: Tense) => {
    if (picked) return
    setPicked(t)
    if (t === q.tense) {
      setRight((n) => n + 1)
      sfx.correct()
    } else sfx.wrong()
  }
  return (
    <div className="stack lab-tensequiz">
      <p className="small muted">
        {index + 1} / {questions.length} · Türkçe cümleye uyan zamanı seç
      </p>
      <p className="prompt-text">{q.turkish}</p>
      <div className="lab-options" role="group" aria-label="Zamanlar" lang={language}>
        {q.options.map((t) => (
          <button key={t} type="button" className={`lab-option${picked ? (t === q.tense ? ' is-right' : t === picked ? ' is-wrong' : '') : ''}`} disabled={!!picked} onClick={() => answer(t)}>
            {tenseName(t)}
          </button>
        ))}
      </div>
      {picked && (
        <div className={`accent-result is-${picked === q.tense ? 'correct' : 'wrong'}`}>
          <p lang={language} className="lab-target">
            {q.target}
          </p>
          <p className="small" role="status">
            {picked === q.tense ? 'Doğru! ' : `Bu cümle ${tenseName(q.tense)} ister. `}
            <span className="muted">Türkçede: {TENSE_BRIDGE[q.tense].suffix}.</span>
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
