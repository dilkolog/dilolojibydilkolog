import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { buildExercise, displayForm, evaluateChoice, type ChoiceExercise } from '../../engine/exercises'
import { comboMultiplier } from '../../engine/gamification'
import { pickGameWords } from '../../engine/practice'
import { createRng, pick } from '../../engine/rng'
import type { VocabularyEntry } from '../../engine/types'
import { db } from '../../data/instance'
import { SAMPLE_WORDS } from '../../data/seed'
import { FlameIcon } from '../icons'
import { sfx } from '../sounds'
import { type Props, recordPractice } from './shared'

const BLITZ_MS = 60_000

/** Against the clock: as many right answers as possible in 60 seconds; a streak multiplies points. */
export function BlitzGame({ language, vocabulary, states, best, recordKey, onExit, onChanged }: Props & { best?: number; recordKey: string; onExit: () => void }) {
  const pool = useMemo(() => {
    const own = new Set(vocabulary.map((v) => v.id))
    return [...vocabulary, ...SAMPLE_WORDS[language].filter((w) => !own.has(w.id))]
  }, [vocabulary, language])
  const words = useMemo(() => pickGameWords(vocabulary, states, 40, createRng(Date.now())), [vocabulary, states])
  const stateById = useMemo(() => new Map(states.map((s) => [s.entryId, s])), [states])
  const rng = useRef(createRng(Date.now()))
  const [phase, setPhase] = useState<'ready' | 'play' | 'over'>('ready')
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [right, setRight] = useState(0)
  const [total, setTotal] = useState(0)
  const [ends, setEnds] = useState(0)
  const [now, setNow] = useState(0)
  const [flash, setFlash] = useState<{ id: string; ok: boolean; correctId: string } | null>(null)
  const [record, setRecord] = useState(false)
  const shownAt = useRef(0)

  const nextQuestion = useCallback((): { entry: VocabularyEntry; ex: ChoiceExercise } => {
    const entry = pick(words, rng.current)
    return { entry, ex: buildExercise('mc_meaning', entry, pool, rng.current) as ChoiceExercise }
  }, [words, pool])
  const [q, setQ] = useState<{ entry: VocabularyEntry; ex: ChoiceExercise } | null>(null)

  const finished = useRef(false)
  const finish = useCallback(async () => {
    // The timer may tick again before React re-renders; end the round only once.
    if (finished.current) return
    finished.current = true
    setPhase('over')
    const isRecord = score > (best ?? 0)
    if (isRecord) await db.saveRecord(recordKey, score)
    setRecord(isRecord)
    sfx.levelUp()
    onChanged()
  }, [score, best, recordKey, onChanged])

  useEffect(() => {
    if (phase !== 'play') return
    const t = setInterval(() => {
      const n = performance.now()
      setNow(n)
      if (n >= ends) void finish()
    }, 100)
    return () => clearInterval(t)
  }, [phase, ends, finish])

  const answer = (optionId: string) => {
    if (phase !== 'play' || flash || !q) return
    const ev = evaluateChoice(q.ex, optionId)
    const ok = ev.verdict === 'correct'
    void recordPractice(q.entry, stateById.get(q.entry.id), 'mc_meaning', ok, performance.now() - shownAt.current)
    setTotal((t) => t + 1)
    if (ok) {
      sfx.correct()
      setRight((r) => r + 1)
      setScore((s) => s + Math.round(10 * comboMultiplier(combo)))
      setCombo((c) => c + 1)
    } else {
      sfx.wrong()
      setCombo(0)
    }
    setFlash({ id: optionId, ok, correctId: q.ex.correctOptionId })
    setTimeout(
      () => {
        setFlash(null)
        setQ(nextQuestion())
        shownAt.current = performance.now()
      },
      ok ? 250 : 700,
    )
  }

  const begin = () => {
    setScore(0)
    setCombo(0)
    setRight(0)
    setTotal(0)
    setQ(nextQuestion())
    const n = performance.now()
    shownAt.current = n
    setNow(n)
    setEnds(n + BLITZ_MS)
    finished.current = false
    setPhase('play')
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase === 'ready' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault()
        begin()
      }
      const i = Number(e.key) - 1
      if (phase === 'play' && q && i >= 0 && i < q.ex.options.length) answer(q.ex.options[i].id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const left = Math.max(0, ends - now)

  return (
    <div className="stack">
      <div className="game-top">
        <button className="link" onClick={onExit}>
          ← Oyunlar
        </button>
        {phase === 'play' && <span className={`game-timer${left < 10_000 ? ' is-low' : ''}`}>{Math.ceil(left / 1000)} sn</span>}
        <span className="small muted">{best ? `Rekor: ${best} puan` : ''}</span>
      </div>

      {phase === 'ready' && (
        <div className="celebrate stack">
          <h1>60 saniye hazır mısın?</h1>
          <p className="muted">Kelimenin anlamını seç. 1–4 tuşları en hızlısı. Üst üste doğrular puanı katlar.</p>
          <div className="row justify-center">
            <button className="btn btn-lg" onClick={begin} autoFocus>
              Başla
            </button>
          </div>
        </div>
      )}

      {phase === 'play' && q && (
        <>
          <div className="progress">
            <div style={{ width: `${(left / BLITZ_MS) * 100}%`, transition: 'width 0.1s linear' }} />
          </div>
          <div className="row justify-between">
            <span className="game-score">{score} puan</span>
            {combo >= 3 && (
              <span className="combo" key={combo}>
                <FlameIcon size={18} /> {combo}
              </span>
            )}
          </div>
          <h2 className="word" lang={language}>
            {displayForm(q.entry)}
          </h2>
          <div className="options">
            {q.ex.options.map((o, i) => (
              <button
                key={o.id}
                className={`option${flash && o.id === flash.correctId ? ' is-correct' : ''}${flash && !flash.ok && o.id === flash.id ? ' is-wrong' : ''}`}
                onClick={() => answer(o.id)}
              >
                <span className="key">{i + 1}</span>
                <span>{o.label}</span>
              </button>
            ))}
          </div>
        </>
      )}

      {phase === 'over' && (
        <div className="celebrate stack">
          <h1>{record ? 'Yeni rekor! 🏆' : 'Süre doldu!'}</h1>
          <p className="xp-gain">{score} puan</p>
          <p className="muted">
            {total} sorudan {right} doğru{total ? ` (%${Math.round((right / total) * 100)})` : ''}.
          </p>
          <div className="row justify-center">
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
