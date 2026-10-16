import { useEffect, useMemo, useState } from 'react'
import { GameResult } from './GameResult'
import {
  SPOT_ERRORS,
  SPOT_ROUND_SIZE,
  spotErrorRound,
  type SpotErrorItem,
} from '../../data/spotErrors'
import type { TargetLanguage } from '../../engine/types'
import type { GrammarLog } from '../../engine/grammar'
import { createRng } from '../../engine/rng'
import { db } from '../../data/instance'
import { noteIn } from './logNote'
import { sfx } from '../sounds'
import { isPctRecord } from './shared'
import { CheckIcon } from '../icons'

const noteSpot = noteIn(
  () => db.getSpotErrorLog(),
  (log) => db.saveSpotErrorLog(log),
)

export function SpotErrorGame({
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
  const [round, setRound] = useState<SpotErrorItem[]>([])
  const [index, setIndex] = useState(0)
  const [selectedToken, setSelectedToken] = useState<number | null>(null)
  const [shakingToken, setShakingToken] = useState<number | null>(null)
  const [innocentHint, setInnocentHint] = useState(false)
  const [chosenOption, setChosenOption] = useState<string | null>(null)
  const [results, setResults] = useState<{ q: SpotErrorItem; ok: boolean }[]>([])
  const [record, setRecord] = useState(false)

  useEffect(() => {
    let live = true
    void db
      .getSpotErrorLog()
      .catch(() => ({} as GrammarLog))
      .then((l) => live && setLog(l))
    return () => {
      live = false
    }
  }, [phase])

  const total = SPOT_ERRORS.filter((s) => s.language === language).length

  const start = () => {
    const questions = spotErrorRound(language, SPOT_ROUND_SIZE, createRng(Date.now()), log ?? undefined)
    setRound(questions)
    setIndex(0)
    setResults([])
    setSelectedToken(null)
    setShakingToken(null)
    setInnocentHint(false)
    setChosenOption(null)
    setRecord(false)
    setPhase('play')
  }

  const q = round[index] as SpotErrorItem | undefined
  const tokens = useMemo(() => (q ? q.sentence.split(' ') : []), [q])

  // Shuffled options for the multiple choice correction
  const options = useMemo(() => {
    if (!q) return []
    const all = [q.correct, ...q.distractors]
    // Simple deterministic shuffle using seed from question id
    const seed = q.id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
    const rng = createRng(seed)
    return [...all].sort(() => rng() - 0.5)
  }, [q])

  const onTokenClick = (i: number) => {
    if (!q || chosenOption !== null) return
    if (i !== q.errorIndex) {
      setShakingToken(i)
      setInnocentHint(true)
      setTimeout(() => {
        setShakingToken(null)
      }, 500)
      return
    }
    setInnocentHint(false)
    setSelectedToken(i)
  }

  const chooseOption = (opt: string) => {
    if (!q || chosenOption !== null) return
    const ok = opt === q.correct
    if (ok) sfx.correct()
    else sfx.wrong()
    setChosenOption(opt)
    setResults((prev) => [...prev, { q, ok }])
    void noteSpot(q.id, ok)
  }

  const next = async () => {
    if (index + 1 < round.length) {
      setIndex((i) => i + 1)
      setSelectedToken(null)
      setShakingToken(null)
      setInnocentHint(false)
      setChosenOption(null)
      return
    }
    const correctCount = results.filter((r) => r.ok).length
    const pct = Math.round((correctCount / round.length) * 100)
    if (isPctRecord(pct, best)) {
      await db.saveRecord(recordKey, pct)
      setRecord(best !== undefined)
    }
    sfx.levelUp()
    setPhase('over')
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== 'play' || !q) return
      if (selectedToken === q.errorIndex && chosenOption === null) {
        const num = Number(e.key)
        if (num >= 1 && num <= options.length) {
          chooseOption(options[num - 1])
        }
      } else if (chosenOption !== null && e.key === 'Enter') {
        e.preventDefault()
        void next()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const missed = results.filter((r) => !r.ok)

  return (
    <div className="stack spot-game">
      <div className="game-top">
        <button type="button" className="link" onClick={onExit}>
          ← Oyunlar
        </button>
        {phase === 'play' && (
          <span className="game-timer">
            {index + 1} / {round.length}
          </span>
        )}
        <span className="small muted">
          {phase === 'play' && q && <span className="pill pill-sm">{q.level}</span>}
        </span>
      </div>

      {phase === 'intro' && (
        <div className="stack">
          <div className="game-intro-card card">
            <div className="game-intro-icon">🎯</div>
            <h2 className="game-intro-title">Hata Avcısı</h2>
            <p className="game-intro-desc">
              B2/C1 seviyesinde en çok düşülen gramer, uyum ve sözdizimi tuzaklarını fark et. Cümledeki
              tek hatalı kelimeye dokun ve doğrusunu seç.
            </p>
            <div className="game-intro-meta small muted">
              <span>{total} uzmanlık sorusu</span>
              <span>·</span>
              <span>Her turda {SPOT_ROUND_SIZE} soru</span>
            </div>
            <button type="button" className="btn btn-primary" onClick={start} autoFocus>
              Avı Başlat
            </button>
          </div>
        </div>
      )}

      {phase === 'play' && q && (
        <div className="stack spot-play-area">
          <div className="spot-prompt">
            <span className="spot-instruction small muted">
              {selectedToken === null
                ? 'Cümledeki hatalı kelimeye dokun:'
                : chosenOption === null
                  ? 'Doğru şekli seç:'
                  : 'Kural incelemesi:'}
            </span>
          </div>

          <div className="card spot-sentence-box">
            <div className="spot-tokens-flow">
              {tokens.map((tok, i) => {
                const isTarget = i === q.errorIndex
                const isSelected = selectedToken === i
                const isShaking = shakingToken === i
                const isAnswered = chosenOption !== null

                let tokenClass = 'spot-token'
                if (isShaking) tokenClass += ' is-shaking'
                if (isAnswered && isTarget) {
                  tokenClass += chosenOption === q.correct ? ' is-corrected' : ' is-wrong'
                } else if (isSelected) {
                  tokenClass += ' is-selected'
                }

                // If answered, show corrected word in place
                const displayWord =
                  isAnswered && isTarget && chosenOption === q.correct
                    ? tok.replace(q.faulty, q.correct)
                    : tok

                return (
                  <button
                    key={`${tok}-${i}`}
                    type="button"
                    className={tokenClass}
                    onClick={() => onTokenClick(i)}
                    disabled={isAnswered}
                  >
                    {displayWord}
                  </button>
                )
              })}
            </div>

            {innocentHint && selectedToken === null && (
              <p className="small muted spot-hint-toast">
                💡 Bu kelimede hata yok. Dikkatini çekim veya edat uyumuna ver.
              </p>
            )}
          </div>

          {selectedToken === q.errorIndex && chosenOption === null && (
            <div className="spot-options-pane stack">
              <span className="small muted">Hatalı kelime: <strong>{q.faulty}</strong></span>
              <div className="spot-options-list">
                {options.map((opt, idx) => (
                  <button
                    key={opt}
                    type="button"
                    className="option spot-option-btn"
                    onClick={() => chooseOption(opt)}
                  >
                    <span className="small muted">{idx + 1}.</span>
                    <strong>{opt}</strong>
                  </button>
                ))}
              </div>
            </div>
          )}

          {chosenOption !== null && (
            <div
              className={`card spot-explanation-box ${
                chosenOption === q.correct ? 'is-correct' : 'is-wrong'
              }`}
            >
              <div className="spot-status-row">
                <span className="spot-status-pill">
                  {chosenOption === q.correct ? (
                    <>
                      <CheckIcon size={16} /> Harika! Doğru tespit
                    </>
                  ) : (
                    <>⚠️ Dikkat: Doğrusu “{q.correct}” olmalıydı</>
                  )}
                </span>
                <span className="pill pill-sm">{q.rule}</span>
              </div>
              <p className="spot-explanation-text small">{q.explanation}</p>
              <div className="spot-action-row">
                <button type="button" className="btn btn-primary" onClick={next} autoFocus>
                  {index + 1 < round.length ? 'Sonraki Soru' : 'Sonucu Gör'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {phase === 'over' && (
        <GameResult
          title="Hata Avı Tamamlandı"
          headline={`${results.length - missed.length} / ${results.length} hata doğru yakalandı`}
          accuracy={results.length ? (results.length - missed.length) / results.length : 0}
          missed={missed.map((m) => `${m.q.faulty} ➔ ${m.q.correct} (${m.q.rule})`)}
          missedLabel="Gözünden kaçan kurallar"
          record={record}
          language={language}
          onAgain={start}
          onExit={onExit}
        />
      )}
    </div>
  )
}
