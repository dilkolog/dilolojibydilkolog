import { useEffect, useState } from 'react'
import type { CheckItem } from '../data/guide/lessonOf'
import { PASS_RIGHT } from '../engine/guideReview'
import type { TargetLanguage } from '../engine/types'
import { CheckCircleIcon } from './icons'
import { sfx } from './sounds'
import { NEW_ART } from './drawnArt'
import { ReportIssue } from './ReportIssue'

/**
 * A lesson's short check, one question at a time: the options, then why the right one is right. At
 * the end the score, and `onDone` with how many were right (the guide marks the lesson learned, or
 * brings it back sooner).
 */
export function LessonCheck({ items, language, topic, review, earned = 0, onDone }: { items: CheckItem[]; language: TargetLanguage; topic?: string; review?: boolean; earned?: number; onDone: (right: number, answers: { prompt: string; right: boolean }[]) => void }) {
  const [index, setIndex] = useState(0)
  const [given, setGiven] = useState<number | null>(null)
  const [right, setRight] = useState(0)
  const [done, setDone] = useState(false)
  const [answers, setAnswers] = useState<{ prompt: string; right: boolean }[]>([])
  const item = items[index]
  const passNeeded = Math.min(PASS_RIGHT, items.length)

  const choose = (i: number) => {
    if (given !== null || !item) return
    setGiven(i)
    setAnswers((a) => [...a, { prompt: item.prompt, right: i === item.answer }])
    if (i === item.answer) {
      setRight((n) => n + 1)
      sfx.correct()
    } else sfx.wrong()
  }
  const next = () => {
    if (index + 1 < items.length) {
      setIndex(index + 1)
      setGiven(null)
      return
    }
    setDone(true)
    onDone(right, answers)
  }

  useEffect(() => {
    if (done || !item) return
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const target = e.target as HTMLElement | null
      if (target?.closest?.('input, textarea, select')) return
      const n = Number(e.key)
      if (given === null && n >= 1 && n <= item.options.length) {
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

  if (done) {
    const passed = right >= passNeeded
    return (
      <section className="card stack gap-2 lesson-check lesson-check-done" aria-label="Kendini dene">
        <img className="lesson-check-art" src={passed ? NEW_ART.guideLearned : NEW_ART.guideReview} alt="" height={112} draggable={false} />
        <h2 className="section-title">{passed ? 'Ders oturdu' : 'Bir daha bakalım'}</h2>
        <p className={passed ? 'lesson-check-score' : 'lesson-check-score muted'}>
          {passed && <CheckCircleIcon size={18} className="inline-icon" />} {items.length} sorunun {right} tanesi doğru.
          {earned > 0 && <strong className="lesson-check-xp"> +{earned} XP</strong>}
        </p>
        <p className="small muted">
          {passed
            ? review
              ? 'Kural yerinde duruyor; bir sonraki tekrarı daha ileri bir güne bıraktık.'
              : 'Ders öğrenildi olarak işaretlendi. Birkaç gün sonra Bugün ekranında kısa bir tekrar gelecek.'
            : 'Kuralları bir kez daha oku; üç gün sonra Bugün ekranında yeniden soracağız.'}
        </p>
      </section>
    )
  }
  if (!item) return null
  const inSentence = item.prompt.includes('___')
  return (
    <section className="card stack gap-2 lesson-check" aria-label="Kendini dene">
      <div className="row justify-between">
        <h2 className="section-title">{review ? 'Hatırlıyor musun?' : 'Kendini dene'}</h2>
        <span className="small muted">
          {index + 1} / {items.length}
        </span>
      </div>
      <p className="lesson-check-prompt" lang={inSentence ? language : undefined}>
        {item.prompt}
      </p>
      <div className="options">
        {item.options.map((o, i) => (
          <button
            key={o}
            type="button"
            className={`option${given === null ? '' : i === item.answer ? ' is-correct' : given === i ? ' is-wrong' : ' is-dim'}`}
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
          <p className={given === item.answer ? 'small' : 'cross-warn'}>
            <strong>{given === item.answer ? 'Doğru!' : 'Olmadı.'}</strong> {item.why}
          </p>
          <div className="row items-center gap-2">
            <button type="button" className="btn" onClick={next} autoFocus>
              {index + 1 < items.length ? 'Sonraki' : 'Bitir'}
            </button>
            {topic && <ReportIssue language={language} topic={topic} kind="question" prompt={item.prompt} label="Soruda hata var" />}
          </div>
        </div>
      )}
    </section>
  )
}
