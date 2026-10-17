import { GameIcon } from '../GameIcon'
import { useEffect, useMemo, useState } from 'react'
import { GameResult } from './GameResult'
import {
  COLLOCATION_DRILLS,
  collocationDrillRound,
  type CollocationDrillItem,
} from '../../data/collocationDrill'
import type { TargetLanguage } from '../../engine/types'
import type { GrammarLog } from '../../engine/grammar'
import { createRng } from '../../engine/rng'
import { db } from '../../data/instance'
import { noteIn } from './logNote'
import { sfx } from '../sounds'
import { isPctRecord } from './shared'
import { CheckIcon, SpeakerIcon } from '../icons'
import { canSpeak, speakAsync } from '../speech'

const ROUND_SIZE = 10

const noteCollocation = noteIn(
  () => db.getCollocationLog(),
  (log) => db.saveCollocationLog(log),
)

export function CollocationsGame({
  language,
  best,
  recordKey,
  onExit,
}: {
  language: TargetLanguage
  best?: number
  recordKey: string
  onExit: () => void
}) {
  const [log, setLog] = useState<GrammarLog | null>(null)
  const [phase, setPhase] = useState<'intro' | 'play' | 'over'>('intro')
  const [round, setRound] = useState<CollocationDrillItem[]>([])
  const [index, setIndex] = useState(0)
  const [chosenOption, setChosenOption] = useState<string | null>(null)
  const [results, setResults] = useState<{ q: CollocationDrillItem; ok: boolean }[]>([])
  const [record, setRecord] = useState(false)

  useEffect(() => {
    let live = true
    void db
      .getCollocationLog()
      .catch(() => ({} as GrammarLog))
      .then((l) => live && setLog(l))
    return () => {
      live = false
    }
  }, [phase])

  const total = COLLOCATION_DRILLS.filter((c) => c.language === language).length

  const start = () => {
    const questions = collocationDrillRound(language, log ?? undefined, ROUND_SIZE, createRng(Date.now()))
    setRound(questions)
    setIndex(0)
    setResults([])
    setChosenOption(null)
    setRecord(false)
    setPhase('play')
  }

  const q = round[index] as CollocationDrillItem | undefined

  // Shuffled options for the 4 choices
  const options = useMemo(() => {
    if (!q) return []
    // Deterministic shuffle based on question id
    const seed = q.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
    const rng = createRng(seed)
    return [...q.options].sort(() => rng() - 0.5)
  }, [q])

  const chooseOption = (opt: string) => {
    if (!q || chosenOption !== null) return
    const ok = opt.trim().toLowerCase() === q.target.trim().toLowerCase()
    if (ok) sfx.correct()
    else sfx.wrong()
    setChosenOption(opt)
    setResults((prev) => [...prev, { q, ok }])
    void noteCollocation(q.id, ok)
  }

  const next = async () => {
    if (index + 1 < round.length) {
      setIndex((i) => i + 1)
      setChosenOption(null)
      return
    }
    const correctCount = results.filter((r) => r.ok).length
    const pct = Math.round((correctCount / round.length) * 100)
    if (isPctRecord(pct, best)) {
      await db.saveRecord(recordKey, pct)
      setRecord(true)
    }
    setPhase('over')
  }

  // Keyboard navigation: 1-4 for options, Enter for next
  useEffect(() => {
    if (phase !== 'play') return
    const handleKey = (e: KeyboardEvent) => {
      if (chosenOption === null) {
        const num = parseInt(e.key, 10)
        if (num >= 1 && num <= options.length) {
          e.preventDefault()
          chooseOption(options[num - 1])
        }
      } else if (e.key === 'Enter') {
        e.preventDefault()
        void next()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  })

  if (phase === 'intro') {
    return (
      <div className="colloc-game stack">
        <div className="game-top">
          <button type="button" className="link" onClick={onExit}>
            ← Oyunlar
          </button>
        </div>
        <div className="game-intro-card card">
          <div className="game-intro-icon">
            <GameIcon id="collocations" emoji="🔗" size={64} />
          </div>
          <h2 className="game-intro-title">Edat ve Kalıplar</h2>
          <p className="game-intro-desc">
            Kelimeler tek tek değil, birlikte yaşadıkları fiil ve edatlarla öğrenilir.
            Cümledeki boşluğu doğru edatla tamamla veya doğal eşdizimi eşleştir.
          </p>
          <div className="game-intro-meta small muted">
            <span>{total} kalıp</span>
            <span>·</span>
            <span>Her turda {ROUND_SIZE} soru</span>
            {best !== undefined && (
              <>
                <span>·</span>
                <span>Rekorun: %{best}</span>
              </>
            )}
          </div>
          <button type="button" className="btn" onClick={start} autoFocus>
            Başla
          </button>
        </div>
      </div>
    )
  }

  if (phase === 'over') {
    const missed = results.filter((r) => !r.ok)
    return (
      <GameResult
        title="Edat ve Kalıplar Tamamlandı"
        headline={`${results.length - missed.length} / ${results.length} doğru`}
        accuracy={results.length ? (results.length - missed.length) / results.length : 0}
        missed={missed.map((m) => `${m.q.pattern} (${m.q.tr})`)}
        missedLabel="Tekrar edilmesi gereken kalıplar"
        record={record}
        language={language}
        onAgain={start}
        onExit={onExit}
      />
    )
  }

  if (!q) return null

  // Reconstructed sentence with blank or chosen answer
  const isAnswered = chosenOption !== null
  const isCorrect = isAnswered && chosenOption.trim().toLowerCase() === q.target.trim().toLowerCase()

  const parts = q.clozeSentence.split('___')

  return (
    <div className="colloc-game stack">
      <div className="game-top">
        <button type="button" className="link" onClick={onExit}>
          ← Oyunlar
        </button>
        <span className="small muted">
          {index + 1} / {round.length}
        </span>
      </div>
      <div className="bar-track tf-progress" role="progressbar" aria-label="Tur ilerlemesi" aria-valuemin={0} aria-valuemax={round.length} aria-valuenow={index}>
        <div className="bar-fill" style={{ width: `${(index / round.length) * 100}%` }} />
      </div>

      <main className="colloc-card card stack">
        <div className="colloc-header-badges">
          <span className="colloc-type-badge">
            {q.type === 'preposition' ? '🔗 Fiil-Edat' : '🔗 Eşdizim'}
          </span>
          <span className="badge-chip">{q.level}</span>
          {canSpeak() && (
            <button
              className="speak-btn icon-btn"
              onClick={() => speakAsync(q.fullSentence, language)}
              aria-label="Cümleyi dinle"
              title="Cümleyi dinle"
            >
              <SpeakerIcon size={18} />
            </button>
          )}
        </div>

        <div className="colloc-sentence-box" lang={language}>
          <span className="colloc-sentence-text">
            {parts[0]}
            <span
              className={`colloc-blank-slot ${
                isAnswered ? (isCorrect ? 'is-correct' : 'is-wrong') : 'is-pending'
              }`}
            >
              {isAnswered ? chosenOption : '___'}
            </span>
            {parts[1]}
          </span>
        </div>

        <p className="colloc-tr-hint small muted">
          <span className="tr-quote">“{q.tr}”</span>
        </p>

        {/* 4 Options Grid */}
        <div className="colloc-options-grid" role="group" aria-label="Seçenekler">
          {options.map((opt, i) => {
            const isChosen = chosenOption === opt
            const isTarget = isAnswered && opt.trim().toLowerCase() === q.target.trim().toLowerCase()
            const optClass = isAnswered
              ? isTarget
                ? 'opt-correct'
                : isChosen
                ? 'opt-wrong'
                : 'opt-faded'
              : ''
            return (
              <button
                key={opt}
                className={`btn btn-quiet colloc-option-btn ${optClass}`}
                onClick={() => chooseOption(opt)}
                disabled={isAnswered}
              >
                <span className="kbd-shortcut-chip">{i + 1}</span>
                <span className="opt-text" lang={language}>
                  {opt}
                </span>
                {isAnswered && isTarget && (
                  <CheckIcon size={16} className="opt-check-icon" />
                )}
              </button>
            )
          })}
        </div>

        {/* Feedback & Pedagogical Explanation */}
        {isAnswered && (
          <div
            className={`colloc-feedback-box ${
              isCorrect ? 'feedback-correct' : 'feedback-wrong'
            } stack`}
          >
            <div className="feedback-headline">
              <span className="feedback-status-badge">
                {isCorrect ? '✓ Harika!' : `✕ Doğrusu: ${q.target}`}
              </span>
              <span className="colloc-pattern-pill" lang={language}>
                {q.pattern}
              </span>
            </div>
            <p className="feedback-explanation">{q.explanation}</p>
            <button className="btn btn-primary btn-block next-btn" onClick={next}>
              Sonraki soru → (Enter)
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
