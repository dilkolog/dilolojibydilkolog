import { useEffect, useMemo, useRef, useState } from 'react'
import { buildConfusableQuestions, type ConfusableQuestion } from '../../data/confusableRules'
import { db } from '../../data/instance'
import { createRng, shuffle } from '../../engine/rng'
import type { TargetLanguage } from '../../engine/types'
import { BulbIcon, ChevronRightIcon } from '../icons'
import { LANGUAGE_NAME } from '../labels'
import { sfx } from '../sounds'
import { GameResult } from './GameResult'

interface Props {
  language: TargetLanguage
  best?: number
  recordKey: string
  onExit: () => void
}

const ROUND_SIZE = 10

export function ConfusablesGame({ language, best, recordKey, onExit }: Props) {
  const pool = useMemo(() => buildConfusableQuestions(language), [language])
  const [phase, setPhase] = useState<'intro' | 'play' | 'over'>('intro')
  const [round, setRound] = useState<ConfusableQuestion[]>([])
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [results, setResults] = useState<{ q: ConfusableQuestion; ok: boolean }[]>([])
  const [record, setRecord] = useState(false)
  const continueRef = useRef<HTMLButtonElement>(null)

  const start = () => {
    const rng = createRng(Date.now())
    const shuffled = shuffle(pool, rng)
    setRound(shuffled.slice(0, ROUND_SIZE))
    setIndex(0)
    setSelected(null)
    setResults([])
    setRecord(false)
    setPhase('play')
  }

  const q = round[index]
  const options = useMemo(() => {
    if (!q) return []
    // Deterministic random order for the two choices based on question id
    const flip = (q.id.charCodeAt(q.id.length - 1) % 2) === 1
    return flip ? [q.wrong, q.correct] : [q.correct, q.wrong]
  }, [q])

  const choose = (word: string) => {
    if (selected !== null || !q) return
    setSelected(word)
    const ok = word === q.correct
    if (ok) sfx.correct()
    else sfx.wrong()
    setResults((prev) => [...prev, { q, ok }])
  }

  const next = () => {
    if (index + 1 < round.length) {
      setIndex((i) => i + 1)
      setSelected(null)
    } else {
      const okCount = results.filter((r) => r.ok).length
      const pct = Math.round((okCount / Math.max(1, results.length)) * 100)
      if (pct > (best ?? 0)) {
        setRecord(best !== undefined)
        void db.saveRecord(recordKey, pct)
      }
      setPhase('over')
    }
  }

  useEffect(() => {
    if (selected !== null) {
      continueRef.current?.focus()
    }
  }, [selected])

  if (phase === 'intro') {
    return (
      <div className="game-stage stack">
        <button type="button" className="link small" onClick={onExit}>
          ← Oyunlara dön
        </button>
        <div className="card stack">
          <h1 className="greeting">👯 İkizler Arenası: {LANGUAGE_NAME[language]}</h1>
          <p>
            Birbirine benzeyen veya aynı Türkçe anlama gelen ikiz kelimeleri ayırt et:
            doğru kelimeyi cümleye veya anlama yerleştir, aralarındaki farkı kuralıyla pekiştir.
          </p>
          {best !== undefined && (
            <p className="small muted">
              En iyi başarın: <strong>%{best}</strong>
            </p>
          )}
          <div>
            <button type="button" className="btn" onClick={start}>
              {ROUND_SIZE} soruluk tura başla
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'over') {
    const okCount = results.filter((r) => r.ok).length
    const pct = Math.round((okCount / Math.max(1, results.length)) * 100)
    return (
      <GameResult
        title="İkizler Arenası tamamlandı!"
        headline={`%${pct} başarı`}
        accuracy={pct / 100}
        record={record}
        note={`10 sorudan ${okCount} tanesini doğru bildin. Karışan kelimeler konuştukça netleşir.`}
        language={language}
        onAgain={start}
        onExit={onExit}
      />
    )
  }

  if (!q) return null

  const isAnswered = selected !== null
  const isCorrect = selected === q.correct

  return (
    <div className="game-stage stack">
      <div className="row between">
        <button type="button" className="link small" onClick={onExit}>
          Çıkış
        </button>
        <span className="small muted">
          {index + 1} / {round.length}
        </span>
      </div>

      <div className="card stack center">
        <span className="small muted" style={{ letterSpacing: '0.05em' }}>
          İKİZ KELİMELER: {q.rule.words.join(' ↔ ')}
        </span>

        <h2 className="section-title" style={{ fontSize: 'var(--t-xl)', marginTop: '0.5rem', marginBottom: '1rem' }} lang={language}>
          {q.prompt}
        </h2>

        {q.context && (
          <p className="small muted" style={{ marginTop: '-0.5rem', marginBottom: '1rem' }}>
            İpucu: <strong>{q.context}</strong>
          </p>
        )}

        <div className="options" style={{ width: '100%', maxWidth: '28rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          {options.map((opt) => {
            const chosen = selected === opt
            const isRightOption = opt === q.correct
            let btnClass = 'btn btn-quiet'
            if (isAnswered) {
              if (isRightOption) btnClass = 'btn'
              else if (chosen) btnClass = 'btn btn-danger'
            }

            return (
              <button
                key={opt}
                type="button"
                className={btnClass}
                style={{ fontSize: 'var(--t-lg)', padding: '0.875rem' }}
                disabled={isAnswered}
                onClick={() => choose(opt)}
                lang={language}
              >
                {opt}
              </button>
            )
          })}
        </div>

        {isAnswered && (
          <div className="stack" style={{ width: '100%', maxWidth: '28rem', marginTop: '1rem' }}>
            <div className={`formative-tip ${isCorrect ? '' : 'formative-warning'}`} style={{ textAlign: 'left' }}>
              <div className="formative-tip-head">
                <BulbIcon size={14} /> <strong>{isCorrect ? 'Harika! Ayrım Kuralı' : 'Dikkat! Ayrım Kuralı'}</strong>
              </div>
              <p className="small">{q.distinction}</p>
            </div>

            <button
              ref={continueRef}
              type="button"
              className="btn"
              onClick={next}
              style={{ marginTop: '0.5rem', alignSelf: 'center' }}
            >
              Devam et <ChevronRightIcon size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
