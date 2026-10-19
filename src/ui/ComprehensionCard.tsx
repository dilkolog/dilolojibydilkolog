import { useState } from 'react'
import { AiError, comprehensionQuestions, type QuizQuestion } from '../ai'
import { createRng, shuffle } from '../engine/rng'
import type { TargetLanguage } from '../engine/types'
import { useAi } from './aiContext'
import { HelpIcon } from './icons'
import { sfx } from './sounds'

/** The options in a shuffled order (the model tends to put the right one early). */
function shown(q: QuizQuestion, rng: () => number): QuizQuestion {
  const order = shuffle(q.options.map((_, i) => i), rng)
  return { ...q, options: order.map((i) => q.options[i]), answer: order.indexOf(q.answer) }
}

/** Fewer words than this and there is not enough text to ask about. */
const MIN_WORDS = 40

/**
 * After a text is finished: three questions about what it said, not about its words. Answers are
 * checked here (the one request only writes the questions), each with the reason and where the text
 * says it. Needs the AI key; nothing is kept.
 */
export function ComprehensionCard({ text, language }: { text: string; language: TargetLanguage }) {
  const { apiKey } = useAi()
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null)
  const [picked, setPicked] = useState<(number | null)[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  if (!apiKey || text.split(/\s+/).length < MIN_WORDS) return null

  const ask = async () => {
    setBusy(true)
    setError('')
    try {
      const qs = await comprehensionQuestions(apiKey, language, text)
      if (qs.length === 0) throw new Error('empty')
      const rng = createRng(Date.now())
      setQuestions(qs.map((q) => shown(q, rng)))
      setPicked(qs.map(() => null))
    } catch (e) {
      setError(e instanceof AiError ? e.message : 'Sorular hazırlanamadı; biraz sonra tekrar dene.')
    } finally {
      setBusy(false)
    }
  }

  if (!questions) {
    return (
      <div className="row">
        <button type="button" className="btn btn-sm btn-quiet" onClick={() => void ask()} disabled={busy}>
          {busy ? 'Hazırlanıyor…' : <><HelpIcon size={16} className="inline-icon" />Okuduğunu sına (3 soru)</>}
        </button>
        <span className="small muted">Kelimeleri değil, metnin ne anlattığını sorar.</span>
        {error && <span className="error small" role="alert">{error}</span>}
      </div>
    )
  }

  const answered = picked.filter((p) => p !== null).length
  const right = questions.filter((q, i) => picked[i] === q.answer).length
  const pick = (qi: number, oi: number) => {
    if (picked[qi] !== null) return
    setPicked((p) => p.map((x, i) => (i === qi ? oi : x)))
    if (oi === questions[qi].answer) sfx.correct()
    else sfx.wrong()
  }

  return (
    <section className="card stack comprehension" aria-label="Okuduğunu anlama soruları">
      <strong>Okuduğunu sına</strong>
      {questions.map((q, qi) => {
        const choice = picked[qi]
        return (
          <fieldset key={q.question} className="comprehension-q">
            <legend>{q.question}</legend>
            <div className="stack">
              {q.options.map((o, oi) => {
                const state = choice === null ? '' : oi === q.answer ? ' comprehension-right' : oi === choice ? ' comprehension-wrong' : ''
                return (
                  <button key={o} type="button" className={`btn btn-quiet comprehension-option${state}`} aria-pressed={choice === oi} disabled={choice !== null} onClick={() => pick(qi, oi)}>
                    {o}
                  </button>
                )
              })}
            </div>
            {choice !== null && (
              <p className="small notice" role="status">
                {choice === q.answer ? 'Doğru. ' : 'Doğrusu başka. '}
                {q.explanation}
              </p>
            )}
          </fieldset>
        )
      })}
      {answered === questions.length && (
        <p className="small" role="status">
          {right === questions.length ? 'Metni tam anladın.' : right === 0 ? 'Bu metin zor geldi; bilmediğin kelimeleri işaretleyip bir daha oku.' : `${questions.length} sorudan ${right}'ini bildin; yanlışların açıklamasına bir daha göz at.`}
        </p>
      )}
    </section>
  )
}
