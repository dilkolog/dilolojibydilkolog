import { useEffect, useState } from 'react'
import type { CheckItem } from '../data/guide/lessonOf'
import type { GuideLevel } from '../data/guide/lessonTypes'
import type { TargetLanguage } from '../engine/types'
import { CheckCircleIcon, ChevronLeftIcon } from './icons'
import { NEW_ART } from './drawnArt'
import { sfx } from './sounds'

export interface LevelQuizQuestion extends CheckItem {
  topic: string
  lessonTitle: string
}

export function LevelQuizView({
  level,
  levelName,
  language,
  questions,
  onDone,
  onBack,
}: {
  level: GuideLevel
  levelName: string
  language: TargetLanguage
  questions: LevelQuizQuestion[]
  onDone: (results: { score: number; total: number; passedTopics: string[] }) => void
  onBack: () => void
}) {
  const [index, setIndex] = useState(0)
  const [given, setGiven] = useState<number | null>(null)
  const [right, setRight] = useState(0)
  const [topicResults, setTopicResults] = useState<Record<string, { right: number; total: number }>>({})
  const [done, setDone] = useState(false)

  const current = questions[index]
  const inSentence = current?.prompt.includes('___')

  const choose = (i: number) => {
    if (given !== null || !current) return
    setGiven(i)
    const isCorrect = i === current.answer
    if (isCorrect) {
      setRight((n) => n + 1)
      sfx.correct()
    } else {
      sfx.wrong()
    }
    setTopicResults((prev) => {
      const cur = prev[current.topic] ?? { right: 0, total: 0 }
      return {
        ...prev,
        [current.topic]: {
          right: cur.right + (isCorrect ? 1 : 0),
          total: cur.total + 1,
        },
      }
    })
  }

  const next = () => {
    if (index + 1 < questions.length) {
      setIndex(index + 1)
      setGiven(null)
      return
    }
    setDone(true)
    const passed = Object.entries(topicResults)
      .filter(([, res]) => res.right >= Math.min(res.total, 1))
      .map(([t]) => t)
    onDone({ score: right, total: questions.length, passedTopics: passed })
  }

  useEffect(() => {
    if (done || !current) return
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const target = e.target as HTMLElement | null
      if (target?.closest?.('input, textarea, select')) return
      const n = Number(e.key)
      if (given === null && n >= 1 && n <= current.options.length) {
        e.preventDefault()
        choose(n - 1)
      } else if (given !== null && e.key === 'Enter' && !target?.closest?.('button, a')) {
        e.preventDefault()
        next()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!questions.length) {
    return (
      <article className="stack guide-level-quiz">
        <button type="button" className="link guide-back-btn" onClick={onBack}>
          <ChevronLeftIcon size={16} className="inline-icon" /> Rehber
        </button>
        <div className="card stack gap-2 text-center p-4">
          <p className="muted">Bu seviyede henüz test sorusu bulunamadı.</p>
        </div>
      </article>
    )
  }

  if (done) {
    const passed = right >= Math.ceil(questions.length * 0.7)
    return (
      <article className="stack guide-level-quiz">
        <button type="button" className="link guide-back-btn" onClick={onBack}>
          <ChevronLeftIcon size={16} className="inline-icon" /> Rehber
        </button>
        <section className="card stack gap-2 lesson-check lesson-check-done" aria-label="Seviye sınavı sonucu">
          <img
            className="lesson-check-art"
            src={passed ? NEW_ART.guideLearned : NEW_ART.guideReview}
            alt=""
            height={112}
            draggable={false}
          />
          <h2 className="section-title">
            {passed ? `${level} Seviyesi Başarıyla Sınandı!` : `${level} Seviyesi Tekrarı`}
          </h2>
          <p className={passed ? 'lesson-check-score' : 'lesson-check-score muted'}>
            {passed && <CheckCircleIcon size={18} className="inline-icon" />} {questions.length} sorudan {right} tanesi doğru.
          </p>
          <p className="small muted">
            {passed
              ? `${level} (${levelName}) seviyesindeki gramer konularını başarıyla pekiştirdin. Doğru çözülen konuların ilerlemesi güncellendi.`
              : 'Bazı konularda takıldın. Kuralları Rehber üzerinden tekrar gözden geçirip istediğin zaman yeniden deneyebilirsin.'}
          </p>
          <div className="row justify-center gap-2">
            <button
              type="button"
              className="btn btn-quiet"
              onClick={() => {
                setIndex(0)
                setGiven(null)
                setRight(0)
                setTopicResults({})
                setDone(false)
              }}
            >
              Yeniden çöz
            </button>
            <button type="button" className="btn" onClick={onBack} autoFocus>
              Rehber’e dön
            </button>
          </div>
        </section>
      </article>
    )
  }

  return (
    <article className="stack guide-level-quiz">
      <button type="button" className="link guide-back-btn" onClick={onBack}>
        <ChevronLeftIcon size={16} className="inline-icon" /> Rehber
      </button>
      <header className="stack gap-1 guide-lesson-header">
        <div className="row items-center gap-2">
          <span className="guide-level-badge">{level}</span>
          <span className="small muted">{levelName} Karma Sınavı</span>
        </div>
        <h1 className="greeting">{level} Karma Seviye Sınavı</h1>
        <p className="greeting-sub">Farklı konulardan derlenen 10 soruyla seviyeni pekiştir.</p>
      </header>

      <section className="card stack gap-2 lesson-check" aria-label="Karma soru">
        <div className="row justify-between items-center">
          <span className="guide-tag guide-tag-learned">Konu: {current.lessonTitle}</span>
          <span className="small muted">
            {index + 1} / {questions.length}
          </span>
        </div>
        <p className="lesson-check-prompt" lang={inSentence ? language : undefined}>
          {current.prompt}
        </p>
        <div className="options">
          {current.options.map((o, i) => (
            <button
              key={o}
              type="button"
              className={`option${given === null ? '' : i === current.answer ? ' is-correct' : given === i ? ' is-wrong' : ' is-dim'}`}
              disabled={given !== null}
              onClick={() => choose(i)}
            >
              <span className="key">{i + 1}</span>
              <span lang={inSentence ? language : undefined}>{o}</span>
            </button>
          ))}
        </div>
        {given !== null && (
          <div className="stack gap-2" role="status">
            <p className={given === current.answer ? 'small' : 'cross-warn'}>
              <strong>{given === current.answer ? 'Doğru!' : 'Olmadı.'}</strong> {current.why}
            </p>
            <div className="row">
              <button type="button" className="btn" onClick={next} autoFocus>
                {index + 1 < questions.length ? 'Sonraki soru' : 'Sınavı bitir'}
              </button>
            </div>
          </div>
        )}
      </section>
    </article>
  )
}
