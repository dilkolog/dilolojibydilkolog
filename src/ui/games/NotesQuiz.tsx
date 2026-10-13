import { useEffect, useState } from 'react'
import { AiError, notesQuiz, type QuizQuestion } from '../../ai'
import { createRng, shuffle } from '../../engine/rng'
import type { TargetLanguage } from '../../engine/types'
import { useAi } from '../aiContext'
import { SparkleIcon } from '../icons'
import { sfx } from '../sounds'
import { GameResult } from './GameResult'

const COUNTS = [5, 10, 15] as const

/** A question with its options in a shuffled order (the model tends to put the right one early). */
interface Shown {
  question: string
  options: string[]
  answer: number
  explanation: string
}
const shuffled = (q: QuizQuestion, rng: () => number): Shown => {
  const order = shuffle(q.options.map((_, i) => i), rng)
  return { question: q.question, explanation: q.explanation, options: order.map((i) => q.options[i]), answer: order.indexOf(q.answer) }
}

/**
 * A multiple-choice quiz made from the learner's own notes (a lesson, a grammar page, a list of
 * expressions): paste them, the AI writes questions about what they say, each answer comes with the
 * reason. Nothing is kept: it is a way to test a page of notes, not a new set of words.
 */
export function NotesQuiz({ language, onExit }: { language: TargetLanguage; onExit: () => void }) {
  const { apiKey } = useAi()
  const [notes, setNotes] = useState('')
  const [count, setCount] = useState<number>(10)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [quiz, setQuiz] = useState<Shown[] | null>(null)
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [right, setRight] = useState<number[]>([])

  const make = async () => {
    if (!apiKey || notes.trim().length < 40) return
    setBusy(true)
    setError('')
    try {
      const qs = await notesQuiz(apiKey, { language, notes, count })
      if (qs.length === 0) throw new Error('empty')
      const rng = createRng(Date.now())
      setQuiz(qs.map((q) => shuffled(q, rng)))
      setIndex(0)
      setPicked(null)
      setRight([])
    } catch (e) {
      setError(e instanceof AiError ? e.message : 'Sorular hazırlanamadı. Notu biraz uzatıp tekrar dene.')
    } finally {
      setBusy(false)
    }
  }

  const q = quiz?.[index]
  const answer = (i: number) => {
    if (!q || picked !== null) return
    setPicked(i)
    if (i === q.answer) {
      sfx.correct()
      setRight((r) => [...r, index])
    } else sfx.wrong()
  }
  const next = () => {
    setPicked(null)
    setIndex((n) => n + 1)
  }
  useEffect(() => {
    if (!q) return
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key)
      if (picked === null && n >= 1 && n <= q.options.length) answer(n - 1)
      else if (picked !== null && e.key === 'Enter') {
        e.preventDefault()
        next()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!quiz) {
    return (
      <div className="stack">
        <button className="link" onClick={onExit}>← Oyunlar</button>
        <h1 className="greeting">Notlarından sınav</h1>
        <p className="greeting-sub">Ders notunu, bir dilbilgisi sayfasını ya da ifade listeni yapıştır; YZ notlarında yazanlardan çoktan seçmeli sorular hazırlasın. Her cevapta nedenini görürsün. Notun yalnızca soruları üretmek için gönderilir.</p>
        {!apiKey && <p className="notice">Bunun için Ayarlar → YZ yardımcısı bölümünde Anthropic anahtarı gerekir.</p>}
        <textarea className="textarea bulk-import-textarea" lang={language} aria-label="Notların" placeholder="Notlarını buraya yapıştır (en az birkaç cümle)…" value={notes} maxLength={8000} onChange={(e) => setNotes(e.target.value)} />
        <div className="choice-row" role="group" aria-label="Soru sayısı">
          {COUNTS.map((n) => (
            <button key={n} type="button" className="chip" aria-pressed={count === n} onClick={() => setCount(n)}>
              {n} soru
            </button>
          ))}
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn btn-lg" disabled={!apiKey || busy || notes.trim().length < 40} onClick={make}>
          <SparkleIcon size={18} /> {busy ? 'Sorular hazırlanıyor…' : 'Sınavı hazırla'}
        </button>
      </div>
    )
  }

  if (!q) {
    const missed = quiz.filter((_, i) => !right.includes(i)).map((x) => `${x.question} — ${x.options[x.answer]}`)
    return (
      <GameResult
        title="Sınav bitti"
        headline={`${right.length} / ${quiz.length}`}
        accuracy={right.length / quiz.length}
        stats={[
          { label: 'doğru', value: right.length },
          { label: 'yanlış', value: quiz.length - right.length },
        ]}
        missed={missed}
        missedLabel="Notlarda tekrar bak"
        onAgain={() => setQuiz(null)}
        onExit={onExit}
      />
    )
  }

  return (
    <div className="stack">
      <div className="row justify-between">
        <button className="link" onClick={onExit}>← Bitir</button>
        <span className="small muted">{index + 1} / {quiz.length}</span>
      </div>
      <h2 className="prompt-text">{q.question}</h2>
      <div className="options">
        {q.options.map((o, i) => (
          <button key={i} className={`option${picked !== null ? (i === q.answer ? ' is-correct' : i === picked ? ' is-wrong' : ' is-dim') : ''}`} disabled={picked !== null} onClick={() => answer(i)}>
            <span className="key">{i + 1}</span>
            <span>{o}</span>
          </button>
        ))}
      </div>
      {picked !== null && (
        <div className="stack gap-2">
          <p className={picked === q.answer ? 'notice' : 'error'} role="status">
            {picked === q.answer ? 'Doğru. ' : 'Yanlış. '}
            {q.explanation}
          </p>
          <button className="btn" onClick={next} autoFocus>{index + 1 < quiz.length ? 'Sonraki' : 'Sonucu gör'}</button>
        </div>
      )}
    </div>
  )
}
