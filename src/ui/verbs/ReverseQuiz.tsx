import { useMemo, useRef, useState } from 'react'
import { normalize } from '../../engine/answerCheck'
import { createRng, pick, shuffle } from '../../engine/rng'
import { analyzeForm, conjugateTense, isImperative, subjectLabel, LAB_TENSES, type FormAnalysis, type Tense } from '../../engine/tenses'
import { AccentBar, accentChange, insertAt } from '../AccentBar'
import { sfx } from '../sounds'
import { tenseName, verbEntry, type LabLanguage } from './labShared'

const ROUND = 6
/** The tenses a single word can be: the compound ones are two words. */
// Not the imperative either: its forms are the present's (parle), so the form alone can't tell it.
const SIMPLE = (t: Tense) => !t.includes('perfect') && !t.includes('passe') && !t.includes('anterieur') && !t.includes('plus-que') && !isImperative(t)

interface Question {
  form: string
  /** Every way the form can be read (a form can belong to two verbs or tenses). */
  analyses: FormAnalysis[]
}

/** Forms of one word (no auxiliary), from common verbs, that the tables can read back. */
function buildQuestions(language: LabLanguage, pool: readonly string[], seed: number): Question[] {
  const rng = createRng(seed)
  const tenses = (LAB_TENSES[language] as Tense[]).filter(SIMPLE)
  const out: Question[] = []
  const verbs = pool.slice(0, 250)
  for (let i = 0; out.length < ROUND && i < 400 && verbs.length; i++) {
    const verb = pick(verbs, rng)
    const tense = pick(tenses, rng)
    const form = conjugateTense(verbEntry(language, verb), tense)?.[pick([0, 1, 2, 3, 4, 5], rng)]
    if (!form || form.includes(' ') || form === verb || out.some((q) => q.form === form)) continue
    const analyses = analyzeForm(language, form)
    // A form the learner could not name from its own verb alone (the same word in many verbs) makes a poor question.
    if (analyses.length && analyses.length <= 3 && analyses.some((a) => a.lemma === verb)) out.push({ form, analyses })
  }
  return out
}

/**
 * Which verb is this? A conjugated word, to be traced back: the verb it comes from, then its tense.
 * The reverse of conjugating, and what reading needs.
 */
export function ReverseQuiz({ language, byFrequency }: { language: LabLanguage; byFrequency: readonly string[] }) {
  const [round, setRound] = useState(0)
  const questions = useMemo(() => buildQuestions(language, byFrequency, Date.now() + round), [language, byFrequency, round])
  const [index, setIndex] = useState(0)
  const [typed, setTyped] = useState('')
  const [step, setStep] = useState<'verb' | 'tense' | 'done'>('verb')
  const [verbOk, setVerbOk] = useState(false)
  const [tenseOk, setTenseOk] = useState(false)
  const [right, setRight] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const q = questions[index]

  // The tense is chosen among the readings of the verb the form comes from, plus wrong ones.
  const lemmas = q ? [...new Set(q.analyses.map((a) => a.lemma))] : []
  const typedLemma = normalize(typed).toLocaleLowerCase(language)
  const options = useMemo(() => {
    if (!q) return []
    const rng = createRng(index + 11)
    const readings = q.analyses.filter((a) => a.lemma === (lemmas.includes(typedLemma) ? typedLemma : lemmas[0]))
    const right = readings.map((a) => a.tense)
    const rest = shuffle((LAB_TENSES[language] as Tense[]).filter((t) => !right.includes(t) && SIMPLE(t)), rng)
    return shuffle([...new Set([...right, ...rest])].slice(0, 4), rng)
  }, [index, language, q, step === 'verb']) // eslint-disable-line react-hooks/exhaustive-deps

  if (!questions.length) return <p className="muted">Soru hazırlanıyor…</p>
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
              setStep('verb')
              setTyped('')
            }}
          >
            Tekrar
          </button>
        </div>
      </section>
    )

  const checkVerb = () => {
    if (!typed.trim()) return
    const ok = lemmas.includes(typedLemma)
    setVerbOk(ok)
    ok ? sfx.correct() : sfx.wrong()
    setStep('tense')
  }
  const chooseTense = (t: Tense) => {
    const ok = q.analyses.some((a) => a.tense === t)
    setTenseOk(ok)
    ok ? sfx.correct() : sfx.wrong()
    if (ok && verbOk) setRight((n) => n + 1)
    setStep('done')
  }
  const next = () => {
    setIndex((i) => i + 1)
    setStep('verb')
    setTyped('')
    requestAnimationFrame(() => input.current?.focus())
  }
  return (
    <div className="stack lab-reverse">
      <p className="small muted">
        {index + 1} / {questions.length} · Bu çekim hangi fiilden, hangi zamandan?
      </p>
      <p className="prompt-text" lang={language}>
        {q.form}
      </p>
      {step === 'verb' && (
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault()
            checkVerb()
          }}
        >
          <input ref={input} className="input answer-input" lang={language} value={typed} onChange={accentChange(language, setTyped)} autoFocus autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false} aria-label="Fiilin mastar hali" placeholder="Fiilin mastar hali (örn. comer)" />
          <AccentBar language={language} onInsert={(ch) => input.current && setTyped(insertAt(input.current, ch))} />
          <div className="row">
            <button type="submit" className="btn" disabled={!typed.trim()}>
              Devam
            </button>
          </div>
        </form>
      )}
      {step !== 'verb' && (
        <>
          <p className={verbOk ? 'lab-ok' : 'lab-bad'} role="status">
            {verbOk ? 'Fiil doğru.' : `Fiil: ${lemmas.join(' / ')}.`}
          </p>
          <div className="lab-options" role="group" aria-label="Zamanlar" lang={language}>
            {options.map((t) => (
              <button key={t} type="button" className={`lab-option${step === 'done' ? (q.analyses.some((a) => a.tense === t) ? ' is-right' : '') : ''}`} disabled={step === 'done'} onClick={() => chooseTense(t)}>
                {tenseName(t)}
              </button>
            ))}
          </div>
        </>
      )}
      {step === 'done' && (
        <div className={`accent-result is-${verbOk && tenseOk ? 'correct' : 'wrong'}`}>
          <p className="small" role="status" lang={language}>
            {q.analyses.slice(0, 2).map((a) => (
              <span key={`${a.lemma}${a.tense}`}>
                <strong>{q.form}</strong> = {a.lemma} · {tenseName(a.tense)} · {[...new Set(a.persons.map((p) => subjectLabel(language, a.tense, p).split(' / ')[0]))].join(', ')}.{' '}
              </span>
            ))}
          </p>
          <div className="row">
            <button type="button" className="btn" autoFocus onClick={next}>
              {index + 1 >= questions.length ? 'Bitir' : 'Devam'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
