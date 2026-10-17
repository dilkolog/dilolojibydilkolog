import { useEffect, useRef, useState } from 'react'
import { GameResult } from './GameResult'
import {
  isRewriteAnswerCorrect,
  REWRITE_ROUND_SIZE,
  SENTENCE_REWRITES,
  sentenceRewriteRound,
  type SentenceRewriteItem,
} from '../../data/sentenceRewrites'
import type { TargetLanguage } from '../../engine/types'
import type { GrammarLog } from '../../engine/grammar'
import { createRng } from '../../engine/rng'
import { db } from '../../data/instance'
import { noteIn } from './logNote'
import { sfx } from '../sounds'
import { isPctRecord } from './shared'
import { CheckIcon } from '../icons'

const noteRewrite = noteIn(
  () => db.getSentenceRewriteLog(),
  (log) => db.saveSentenceRewriteLog(log),
)

export function SentenceRewriteGame({
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
  const [round, setRound] = useState<SentenceRewriteItem[]>([])
  const [index, setIndex] = useState(0)
  const [input, setInput] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [hintLevel, setHintLevel] = useState(0)
  const [results, setResults] = useState<{ q: SentenceRewriteItem; ok: boolean; given: string }[]>([])
  const [record, setRecord] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let live = true
    void db
      .getSentenceRewriteLog()
      .catch(() => ({} as GrammarLog))
      .then((l) => live && setLog(l))
    return () => {
      live = false
    }
  }, [phase])

  const total = SENTENCE_REWRITES.filter((s) => s.language === language).length

  const start = () => {
    const questions = sentenceRewriteRound(language, REWRITE_ROUND_SIZE, createRng(Date.now()), log ?? undefined)
    setRound(questions)
    setIndex(0)
    setResults([])
    setInput('')
    setSubmitted(false)
    setHintLevel(0)
    setRecord(false)
    setPhase('play')
  }

  const q = round[index] as SentenceRewriteItem | undefined

  const submit = () => {
    if (!q || submitted) return
    const trimmed = input.trim()
    if (!trimmed) return
    const ok = isRewriteAnswerCorrect(trimmed, q.acceptedAnswers)
    if (ok) sfx.correct()
    else sfx.wrong()
    setSubmitted(true)
    setResults((prev) => [...prev, { q, ok, given: trimmed }])
    void noteRewrite(q.id, ok)
  }

  const next = async () => {
    if (index + 1 < round.length) {
      setIndex((i) => i + 1)
      setInput('')
      setSubmitted(false)
      setHintLevel(0)
      setTimeout(() => inputRef.current?.focus(), 50)
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

  const revealHint = () => {
    if (!q || submitted) return
    setHintLevel((h) => h + 1)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== 'play' || !q) return
      if (submitted && e.key === 'Enter') {
        e.preventDefault()
        void next()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const missed = results.filter((r) => !r.ok)

  return (
    <div className="stack rewrite-game">
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
            <div className="game-intro-icon">🔄</div>
            <h2 className="game-intro-title">Cümle Dönüşümü</h2>
            <p className="game-intro-desc">
              C1 sınav formatı (Cambridge, DALF, DELE): İlk cümlenin anlamını bozmadan, verilen zorunlu
              anahtar kelimeyi kullanarak ikinci cümlenin boşluğunu doldur.
            </p>
            <div className="game-intro-meta small muted">
              <span>{total} sınav sorusu</span>
              <span>·</span>
              <span>Her turda {REWRITE_ROUND_SIZE} soru</span>
            </div>
            <button type="button" className="btn btn-primary" onClick={start} autoFocus>
              Dönüşüme Başla
            </button>
          </div>
        </div>
      )}

      {phase === 'play' && q && (
        <div className="stack rewrite-play-area">
          <div className="card rewrite-source-box">
            <span className="small muted">Orijinal Cümle:</span>
            <p className="rewrite-source-sentence">{q.sourceSentence}</p>
            <p className="small muted rewrite-source-tr">“{q.sourceTr}”</p>
          </div>

          <div className="rewrite-keyword-box">
            <span className="small muted">Zorunlu Anahtar Kelime:</span>
            <span className="rewrite-keyword-badge">{q.keyword}</span>
          </div>

          <form
            className="card rewrite-target-box"
            onSubmit={(e) => {
              e.preventDefault()
              if (!submitted) submit()
              else void next()
            }}
          >
            <span className="small muted">Aynı anlamı koruyarak tamamla:</span>
            <div className="rewrite-sentence-flow">
              {q.targetPrefix && <span className="rewrite-prefix">{q.targetPrefix}</span>}
              <input
                ref={inputRef}
                type="text"
                className={`input rewrite-input ${submitted ? (results[index]?.ok ? 'is-correct' : 'is-wrong') : ''}`}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Boşluğu doldur…"
                aria-label="Boşluğu doldur"
                disabled={submitted}
                autoFocus
                autoCapitalize="none"
                autoComplete="off"
                spellCheck="false"
              />
              {q.targetSuffix && <span className="rewrite-suffix">{q.targetSuffix}</span>}
            </div>

            {!submitted && (
              <div className="rewrite-controls">
                <button
                  type="button"
                  className="btn btn-quiet btn-sm"
                  onClick={revealHint}
                  title="İpucu harfi göster"
                >
                  💡 İpucu {hintLevel > 0 && `(${q.acceptedAnswers[0]?.slice(0, hintLevel * 2)}…)`}
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!input.trim()}
                >
                  Kontrol Et
                </button>
              </div>
            )}
          </form>

          {submitted && (
            <div
              className={`card rewrite-explanation-box ${
                results[index]?.ok ? 'is-correct' : 'is-wrong'
              }`}
            >
              <div className="rewrite-status-row">
                <span className="rewrite-status-pill">
                  {results[index]?.ok ? (
                    <>
                      <CheckIcon size={16} /> Harika! Tam dönüşüm
                    </>
                  ) : (
                    <>⚠️ Kabul edilen doğru kalıp: “{q.acceptedAnswers[0]}”</>
                  )}
                </span>
              </div>
              {q.acceptedAnswers.length > 1 && (
                <div className="small muted rewrite-alts">
                  Diğer geçerli alternatifler: {q.acceptedAnswers.slice(1).map((a) => `“${a}”`).join(', ')}
                </div>
              )}
              <p className="rewrite-explanation-text small">{q.explanation}</p>
              <div className="rewrite-action-row">
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
          title="Cümle Dönüşümü Tamamlandı"
          headline={`${results.length - missed.length} / ${results.length} dönüşüm başarılı`}
          accuracy={results.length ? (results.length - missed.length) / results.length : 0}
          missed={missed.map((m) => `${m.q.keyword} ➔ ${m.q.acceptedAnswers[0]}`)}
          missedLabel="Tekrar edilecek kalıplar"
          record={record}
          language={language}
          onAgain={start}
          onExit={onExit}
        />
      )}
    </div>
  )
}
