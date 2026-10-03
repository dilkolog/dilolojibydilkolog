import { useEffect, useMemo, useRef, useState } from 'react'
import { displayForm, pickDistractors } from '../../engine/exercises'
import { median, pickFluencyWords } from '../../engine/practice'
import { createRng, shuffle } from '../../engine/rng'
import type { VocabularyEntry } from '../../engine/types'
import { db } from '../../data/instance'
import { SAMPLE_WORDS } from '../../data/seed'
import { sfx } from '../sounds'
import { type Props, recordPractice, FLUENCY_ROUND, FLUENCY_MIN_ACCURACY, fmt } from './shared'

interface FluencyQ {
  entry: VocabularyEntry
  options: string[]
  answer: string
}

/**
 * Fluency round (Nation's fourth strand): only well-known words, Turkish → target, timed per
 * answer. The score is the median time of correct answers, so one slow question doesn't spoil
 * a round, and the trend shows retrieval becoming automatic.
 */
export function FluencyGame({
  language,
  vocabulary,
  states,
  best,
  last,
  recordKey,
  onExit,
  onChanged,
}: Props & { best?: number; last?: number; recordKey: string; onExit: () => void }) {
  const pool = useMemo(() => {
    const own = new Set(vocabulary.map((v) => v.id))
    return [...vocabulary, ...SAMPLE_WORDS[language].filter((w) => !own.has(w.id))]
  }, [vocabulary, language])
  const stateById = useMemo(() => new Map(states.map((s) => [s.entryId, s])), [states])
  const rng = useRef(createRng(Date.now()))
  const [round, setRound] = useState<FluencyQ[]>([])
  const [index, setIndex] = useState(0)
  const [times, setTimes] = useState<number[]>([])
  const [flash, setFlash] = useState<{ chosen: string; ok: boolean; ms: number } | null>(null)
  const [phase, setPhase] = useState<'ready' | 'play' | 'over'>('ready')
  const [result, setResult] = useState<{ median: number; accuracy: number; record: boolean; previous?: number } | null>(null)
  const shownAt = useRef(0)

  const begin = () => {
    const words = pickFluencyWords(vocabulary, states, rng.current)
    const qs = Array.from({ length: FLUENCY_ROUND }, (_, i) => {
      const entry = words[i % words.length]
      const answer = displayForm(entry)
      const options = shuffle([answer, ...pickDistractors(entry, pool, 3, rng.current).map(displayForm)], rng.current)
      return { entry, options, answer }
    })
    setRound(shuffle(qs, rng.current))
    setIndex(0)
    setTimes([])
    setFlash(null)
    setResult(null)
    setPhase('play')
    shownAt.current = performance.now()
  }

  const finish = async (allTimes: number[]) => {
    const med = median(allTimes)
    const accuracy = allTimes.length / FLUENCY_ROUND
    const record = allTimes.length > 0 && accuracy >= FLUENCY_MIN_ACCURACY && (!best || med < best)
    if (record) await db.saveRecord(recordKey, Math.round(med))
    if (allTimes.length) await db.saveRecord(`${recordKey}:last`, Math.round(med))
    setResult({ median: med, accuracy, record, previous: last })
    setPhase('over')
    sfx.levelUp()
    onChanged()
  }

  const answer = (label: string) => {
    if (phase !== 'play' || flash) return
    const q = round[index]
    const ms = performance.now() - shownAt.current
    const ok = label === q.answer
    void recordPractice(q.entry, stateById.get(q.entry.id), 'mc_meaning', ok, ms)
    const nextTimes = ok ? [...times, ms] : times
    if (ok) sfx.correct()
    else sfx.wrong()
    setTimes(nextTimes)
    setFlash({ chosen: label, ok, ms })
    setTimeout(
      () => {
        setFlash(null)
        if (index + 1 >= round.length) void finish(nextTimes)
        else {
          setIndex(index + 1)
          shownAt.current = performance.now()
        }
      },
      ok ? 220 : 900,
    )
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== 'play' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault()
        begin()
      }
      const i = Number(e.key) - 1
      const q = round[index]
      if (phase === 'play' && q && i >= 0 && i < q.options.length) answer(q.options[i])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const q = round[index]
  const slowest = Math.max(1, ...times)

  return (
    <div className="stack">
      <div className="game-top">
        <button className="link" onClick={onExit}>
          ← Oyunlar
        </button>
        {phase === 'play' && (
          <span className="game-timer">
            {index + 1} / {round.length}
          </span>
        )}
        <span className="small muted">{best ? `Rekor: ${fmt(best)}` : ''}</span>
      </div>

      {phase === 'ready' && (
        <div className="celebrate stack">
          <h1>Akıcılık turu</h1>
          <p className="muted">
            Türkçesini gör, kelimeyi 1–4 tuşlarıyla seç. Hepsi bildiğin kelimeler; puan, doğru cevaplarındaki ortanca süre. Rekor için en az %
            {Math.round(FLUENCY_MIN_ACCURACY * 100)} doğru gerekir.
          </p>
          <div className="row" style={{ justifyContent: 'center' }}>
            <button className="btn btn-lg" onClick={begin} autoFocus>
              Başla
            </button>
          </div>
        </div>
      )}

      {phase === 'play' && q && (
        <>
          <div className="progress">
            <div style={{ width: `${(index / round.length) * 100}%` }} />
          </div>
          <h2 className="prompt-text">{q.entry.senses[0].gloss}</h2>
          <div className="options">
            {q.options.map((o, i) => (
              <button
                key={i}
                className={`option${flash && o === q.answer ? ' is-correct' : ''}${flash && !flash.ok && o === flash.chosen ? ' is-wrong' : ''}`}
                onClick={() => answer(o)}
              >
                <span className="key">{i + 1}</span>
                <span className="option-serif" lang={language}>
                  {o}
                </span>
              </button>
            ))}
          </div>
          <p className="small muted fluency-live" aria-live="polite">
            {flash?.ok ? fmt(flash.ms) : times.length ? `Ortanca: ${fmt(median(times))}` : ' '}
          </p>
        </>
      )}

      {phase === 'over' && result && (
        <div className="celebrate stack">
          <h1>{result.record ? 'Yeni hız rekoru! 🏆' : 'Tur bitti'}</h1>
          <p className="xp-gain">{times.length ? `Soru başına ${fmt(result.median)}` : 'Doğru cevap yok'}</p>
          <p className="muted">
            {FLUENCY_ROUND} sorudan {times.length} doğru (%{Math.round(result.accuracy * 100)}).
            {result.previous && times.length
              ? result.median < result.previous
                ? ` Önceki turdan ${fmt(result.previous - result.median)} daha hızlı.`
                : ` Önceki tur: ${fmt(result.previous)}.`
              : ''}
            {result.accuracy < FLUENCY_MIN_ACCURACY && times.length ? ` Rekor için en az %${Math.round(FLUENCY_MIN_ACCURACY * 100)} doğru gerekiyor.` : ''}
          </p>
          {times.length > 1 && (
            <div className="fluency-bars" role="img" aria-label="Doğru cevapların süreleri, soru sırasıyla">
              {times.map((t, i) => (
                <span key={i} style={{ height: `${Math.max(8, (t / slowest) * 100)}%` }} title={fmt(t)} />
              ))}
            </div>
          )}
          <div className="row" style={{ justifyContent: 'center' }}>
            <button className="btn btn-lg" onClick={begin} autoFocus>
              Tekrar oyna
            </button>
            <button className="btn btn-lg btn-quiet" onClick={onExit}>
              Oyunlara dön
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
