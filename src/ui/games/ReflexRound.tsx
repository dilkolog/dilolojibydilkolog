import { useEffect, useMemo, useRef, useState } from 'react'
import { GameResult } from './GameResult'
import type { GrammarLog } from '../../engine/grammar'
import { REFLEX_ROUND, REFLEX_SECONDS, reflexRound, type ReflexQuestion } from '../../engine/reflex'
import { createRng } from '../../engine/rng'
import type { TargetLanguage } from '../../engine/types'
import { db } from '../../data/instance'
import { noteIn } from './logNote'
import { reflexPhrases } from '../../data/reflex'
import { SpeakerIcon } from '../icons'
import { LANGUAGE_NAME } from '../labels'
import { sfx } from '../sounds'
import { haptics } from '../haptics'
import { canSpeak, speak } from '../speech'

const note = noteIn(() => db.getReflexLog(), (log) => db.saveReflexLog(log))

type Answer = { given: string | null; ms: number }

/**
 * The 3-second rule: the Turkish of an everyday phrase appears and the phrase must be picked within
 * three seconds. What trains fluency is how fast a phrase comes, not whether it can be worked out,
 * so a slow answer counts as a miss (the untimed switch is there for a first run-through). Phrases
 * missed come back more often.
 */
export function ReflexRound({ language, onExit }: { language: TargetLanguage; onExit: () => void }) {
  const [log, setLog] = useState<GrammarLog | null>(null)
  const [timed, setTimed] = useState(true)
  const [phase, setPhase] = useState<'intro' | 'play' | 'over'>('intro')
  const [round, setRound] = useState<ReflexQuestion[]>([])
  const [index, setIndex] = useState(0)
  const [answer, setAnswer] = useState<Answer | null>(null)
  const [results, setResults] = useState<{ q: ReflexQuestion; ok: boolean; ms: number }[]>([])
  const shownAt = useRef(0)

  useEffect(() => {
    let live = true
    void db.getReflexLog().then((l) => live && setLog(l))
    return () => {
      live = false
    }
  }, [phase])

  const q = round[index]
  const known = useMemo(() => Object.keys(log ?? {}).filter((id) => reflexPhrases.some((p) => p.id === id)).length, [log])

  const start = () => {
    setRound(reflexRound(reflexPhrases, log ?? {}, language, createRng(Date.now())))
    setIndex(0)
    setResults([])
    setAnswer(null)
    shownAt.current = performance.now()
    setPhase('play')
  }

  const grade = (given: string | null) => {
    if (!q || answer) return
    const ms = Math.round(performance.now() - shownAt.current)
    const inTime = !timed || ms <= REFLEX_SECONDS * 1000
    const ok = given === q.answer && inTime
    if (ok) {
      sfx.correct()
      haptics.success()
    } else {
      sfx.wrong()
      haptics.error()
    }
    setAnswer({ given, ms })
    setResults((r) => [...r, { q, ok, ms }])
    void note(q.id, ok)
  }

  const next = () => {
    if (index + 1 < round.length) {
      setIndex(index + 1)
      setAnswer(null)
      shownAt.current = performance.now()
      return
    }
    sfx.levelUp()
    haptics.victory()
    setPhase('over')
  }

  // The latest handlers, so the timers and the key listener below depend only on what they watch.
  const actions = useRef({ grade, next })
  useEffect(() => {
    actions.current = { grade, next }
  })

  // The time is up: a miss, and the answer shows. A new question restarts the clock.
  const answered = answer !== null
  useEffect(() => {
    if (phase !== 'play' || !timed || answered) return
    const t = window.setTimeout(() => actions.current.grade(null), REFLEX_SECONDS * 1000)
    return () => window.clearTimeout(t)
  }, [phase, timed, answered, index])

  // A right answer moves on by itself; a miss waits to be read.
  const advances = !!answer && answer.given === q?.answer && !(timed && answer.ms > REFLEX_SECONDS * 1000)
  useEffect(() => {
    if (!advances) return
    const t = window.setTimeout(() => actions.current.next(), 700)
    return () => window.clearTimeout(t)
  }, [advances, index])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== 'play' || !q) return
      const n = Number(e.key)
      if (!answered && n >= 1 && n <= q.options.length) actions.current.grade(q.options[n - 1])
      else if (answered && e.key === 'Enter') {
        e.preventDefault()
        actions.current.next()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, q, answered])

  const missed = results.filter((r) => !r.ok)
  const rightMs = results.filter((r) => r.ok).map((r) => r.ms)
  const avg = rightMs.length ? (rightMs.reduce((a, b) => a + b, 0) / rightMs.length / 1000).toFixed(1).replace('.', ',') : '–'
  const slow = answer && answer.given === q?.answer && timed && answer.ms > REFLEX_SECONDS * 1000

  return (
    <div className="stack reflex-game">
      <div className="game-top">
        <button className="link" onClick={onExit}>
          ← Oyunlar
        </button>
        {phase === 'play' && (
          <span className="game-timer">
            {index + 1} / {round.length}
          </span>
        )}
        <span className="small muted" />
      </div>

      {phase === 'intro' && (
        <div className="stack">
          <h1 className="greeting">Refleks turu</h1>
          <p className="muted">
            Günlük hayatın en sık kalıpları: Türkçesi çıkar, {LANGUAGE_NAME[language]} karşılığını {REFLEX_SECONDS} saniyede seç. Konuşurken kalıbın çabuk gelmesi, onu bilmekten ayrı bir beceri; burada hızı çalışırsın. Geç kalanlar ve yanlışlar daha sık gelir.
          </p>
          <div className="choice-row" role="group" aria-label="Süre">
            <button type="button" className="chip" aria-pressed={timed} onClick={() => setTimed(true)}>
              {REFLEX_SECONDS} saniye
            </button>
            <button type="button" className="chip" aria-pressed={!timed} onClick={() => setTimed(false)}>
              Süre yok (ilk deneme)
            </button>
          </div>
          {known > 0 && <p className="small muted">{known} / {reflexPhrases.length} kalıbı denedin.</p>}
          <div className="row">
            <button className="btn btn-lg" onClick={start} autoFocus disabled={!log}>
              {REFLEX_ROUND} soruluk tura başla
            </button>
          </div>
        </div>
      )}

      {phase === 'play' && q && (
        <div className="stack">
          {timed && (
            <div className="progress reflex-bar" aria-hidden>
              <div key={index} className={answer ? 'is-stopped' : undefined} style={{ ['--reflex-s' as string]: `${REFLEX_SECONDS}s` }} />
            </div>
          )}
          <p className="prompt-label">{LANGUAGE_NAME[language]} nasıl dersin?</p>
          <h1 className="word" lang="tr">
            {q.turkish}
          </h1>
          <div className="options" role="group" aria-label="Seçenekler">
            {q.options.map((o, i) => (
              <button
                key={o}
                type="button"
                className={`option${answer ? (o === q.answer ? ' is-correct' : answer.given === o ? ' is-wrong' : ' is-dim') : ''}`}
                disabled={!!answer}
                onClick={() => grade(o)}
              >
                <span className="key">{i + 1}</span>
                <span className="option-serif" lang={language}>
                  {o}
                </span>
              </button>
            ))}
          </div>
          {answer && !(answer.given === q.answer && !slow) && (
            <div className="stack" role="status">
              <p className="cross-warn">
                {answer.given === null ? 'Süre doldu.' : slow ? `Doğru, ama ${REFLEX_SECONDS} saniyeyi geçti (${(answer.ms / 1000).toFixed(1).replace('.', ',')} sn).` : 'Olmadı.'}{' '}
                <strong lang={language}>{q.answer}</strong>
                {canSpeak() && (
                  <button type="button" className="icon-btn icon-btn-sm" aria-label="Dinle" onClick={() => speak(q.answer, language)}>
                    <SpeakerIcon size={15} />
                  </button>
                )}
              </p>
              <div className="row">
                <button type="button" className="btn" onClick={next} autoFocus>
                  Devam
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {phase === 'over' && (
        <GameResult
          title="Tur bitti"
          headline={`${round.length - missed.length} / ${round.length} zamanında doğru`}
          accuracy={round.length ? (round.length - missed.length) / round.length : 0}
          stats={[{ label: 'Doğruların ortalaması', value: avg === '–' ? avg : `${avg} sn` }]}
          missed={missed.map((m) => m.q.answer)}
          missedLabel="Daha hızlı gelmesi gerekenler"
          language={language}
          onAgain={start}
          onExit={onExit}
        />
      )}
    </div>
  )
}
