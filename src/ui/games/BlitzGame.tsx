import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GameResult } from './GameResult'
import { checkTyped } from '../../engine/answerCheck'
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
/** Points for a right answer before the streak multiplier: writing the word is worth more than choosing it. */
const POINTS = { choose: 10, type: 25 } as const
type Mode = keyof typeof POINTS

/**
 * Against the clock: as many right answers as possible in 60 seconds; a streak multiplies points.
 * Choose the meaning (recognition), or write the word from its meaning (recall: what comes to mind
 * when speaking). Each way keeps its own record.
 */
export function BlitzGame({ language, vocabulary, states, best: bestChoose, bestTyped, recordKey: chooseKey, onExit, onChanged }: Props & { best?: number; bestTyped?: number; recordKey: string; onExit: () => void }) {
  const [mode, setMode] = useState<Mode>('choose')
  const best = mode === 'type' ? bestTyped : bestChoose
  const recordKey = mode === 'type' ? `${chooseKey}:typed` : chooseKey
  const [typed, setTyped] = useState('')
  const [shownAnswer, setShownAnswer] = useState<string | null>(null)
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

  /** One answer, either way: counted, scored, and the next question after a moment. */
  const settle = (ok: boolean, given?: string) => {
    if (!q) return
    const expected = displayForm(q.entry)
    void recordPractice(q.entry, stateById.get(q.entry.id), mode === 'type' ? 'typed_translation' : 'mc_meaning', ok, performance.now() - shownAt.current, given === undefined ? undefined : { given, expected })
    setTotal((t) => t + 1)
    if (ok) {
      sfx.correct()
      setRight((r) => r + 1)
      setScore((s) => s + Math.round(POINTS[mode] * comboMultiplier(combo)))
      setCombo((c) => c + 1)
    } else {
      sfx.wrong()
      setCombo(0)
    }
    setTimeout(
      () => {
        setFlash(null)
        setShownAnswer(null)
        setTyped('')
        setQ(nextQuestion())
        shownAt.current = performance.now()
      },
      ok ? 250 : mode === 'type' ? 1200 : 700,
    )
  }

  const answer = (optionId: string) => {
    if (phase !== 'play' || flash || !q) return
    const ok = evaluateChoice(q.ex, optionId).verdict === 'correct'
    setFlash({ id: optionId, ok, correctId: q.ex.correctOptionId })
    settle(ok)
  }

  const submitTyped = () => {
    if (phase !== 'play' || flash || shownAnswer !== null || !q || !typed.trim()) return
    const accepted = [displayForm(q.entry), q.entry.lemma, ...(q.entry.alternativeForms ?? [])]
    // An accent slip is close enough under the clock: the near verdict counts, the right form is shown.
    const verdict = checkTyped(typed, accepted, { language, gender: q.entry.gender }).verdict
    const ok = verdict !== 'wrong'
    setFlash({ id: '', ok, correctId: '' })
    if (verdict !== 'correct') setShownAnswer(displayForm(q.entry))
    settle(ok, typed)
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
      if (phase === 'play' && mode === 'choose' && q && i >= 0 && i < q.ex.options.length) answer(q.ex.options[i].id)
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
          <div className="segmented" role="group" aria-label="Nasıl">
            {(
              [
                ['choose', 'Anlamı seç'],
                ['type', 'Kelimeyi yaz'],
              ] as const
            ).map(([id, label]) => (
              <button key={id} type="button" className="segmented-btn" aria-pressed={mode === id} onClick={() => setMode(id)}>
                {label}
              </button>
            ))}
          </div>
          <p className="muted">
            {mode === 'type'
              ? `Türkçesini gör, kelimeyi yaz, Enter. Hatırlamak tanımaktan zordur: her doğru ${POINTS.type} puan.`
              : 'Kelimenin anlamını seç. 1–4 tuşları en hızlısı.'}{' '}
            Üst üste doğrular puanı katlar.
          </p>
          <div className="row justify-center">
            <button className="btn btn-lg" onClick={begin} autoFocus>
              Başla
            </button>
          </div>
        </div>
      )}

      {phase === 'play' && q && (
        <>
          <div className="progress progress-timer">
            <div style={{ transform: `scaleX(${Math.max(0, Math.min(1, left / BLITZ_MS))})` }} />
          </div>
          <div className="row justify-between">
            <span className="game-score">{score} puan</span>
            {combo >= 3 && (
              <span className="combo" key={combo}>
                <FlameIcon size={18} /> {combo}
              </span>
            )}
          </div>
          {mode === 'type' ? (
            <form
              className="stack blitz-typed"
              onSubmit={(e) => {
                e.preventDefault()
                submitTyped()
              }}
            >
              <h2 className="blitz-meaning">{q.entry.senses[0].gloss}</h2>
              <input
                className={`input answer-input${flash ? (flash.ok ? ' is-correct' : ' is-wrong') : ''}`}
                lang={language}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                aria-label="Kelimeyi yaz"
                autoFocus
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                readOnly={!!flash}
              />
              {shownAnswer && (
                <p className="small" role="status">
                  Doğrusu: <strong lang={language}>{shownAnswer}</strong>
                </p>
              )}
            </form>
          ) : (
            <h2 className="word" lang={language}>
              {displayForm(q.entry)}
            </h2>
          )}
          {mode === 'choose' && <div className="options">
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
          </div>}
        </>
      )}

      {phase === 'over' && (
        <GameResult
          record={record}
          title={record ? 'Yeni rekor!' : 'Süre doldu!'}
          headline={`${score} puan`}
          accuracy={total ? right / total : 0}
          stats={[
            { label: 'soru', value: total },
            { label: 'doğru', value: right },
            { label: 'puan', value: score },
          ]}
          onAgain={begin}
          onExit={onExit}
        />
      )}
    </div>
  )
}
