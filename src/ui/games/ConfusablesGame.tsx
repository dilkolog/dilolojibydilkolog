import { useEffect, useMemo, useState } from 'react'
import { buildConfusableQuestions, CONFUSABLE_RULES, confusableRound, CONFUSABLE_ROUND as ROUND_SIZE, type ConfusableQuestion } from '../../data/confusableRules'
import { db } from '../../data/instance'
import { createRng } from '../../engine/rng'
import type { TargetLanguage } from '../../engine/types'
import { BulbIcon, SpeakerIcon } from '../icons'
import { LANGUAGE_NAME } from '../labels'
import { sfx } from '../sounds'
import { canSpeak, speak } from '../speech'
import { GameResult } from './GameResult'

interface Props {
  language: TargetLanguage
  best?: number
  recordKey: string
  onExit: () => void
}

/** The sentences missed and not yet put right, by language (on the device; goes with the account as a device preference). */
const missedKey = (language: TargetLanguage) => `diloloji:twins:${language}`
function loadMissed(language: TargetLanguage): Set<string> {
  try {
    const raw = JSON.parse(localStorage.getItem(missedKey(language)) ?? '[]') as unknown
    return new Set(Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string') : [])
  } catch {
    return new Set()
  }
}
function saveMissed(language: TargetLanguage, missed: Set<string>) {
  try {
    if (missed.size) localStorage.setItem(missedKey(language), JSON.stringify([...missed].slice(-60)))
    else localStorage.removeItem(missedKey(language))
  } catch {
    // Not kept.
  }
}

/** The gap of a drill as it reads once answered: the right word in place. */
const filled = (q: ConfusableQuestion) => q.prompt.replace(/_{3,}/, q.correct)

/**
 * Twins: two words a Turkish speaker mixes up (savoir/connaître, por/para, say/tell). Each question is a sentence only
 * one of them fits; the answer gives the rule and the sentence in Turkish. A single pair can be practised alone.
 */
export function ConfusablesGame({ language, best, recordKey, onExit }: Props) {
  const rules = useMemo(() => CONFUSABLE_RULES.filter((r) => r.language === language), [language])
  const [only, setOnly] = useState<string>('')
  const pool = useMemo(() => buildConfusableQuestions(language).filter((q) => !only || q.rule.id === only), [language, only])
  const [phase, setPhase] = useState<'intro' | 'play' | 'over'>('intro')
  const [round, setRound] = useState<ConfusableQuestion[]>([])
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<string | null>(null)
  const [results, setResults] = useState<{ q: ConfusableQuestion; ok: boolean }[]>([])
  const [record, setRecord] = useState(false)
  const [missedBefore, setMissedBefore] = useState(() => loadMissed(language))

  const start = () => {
    setRound(confusableRound(pool, createRng(Date.now()), undefined, missedBefore))
    setIndex(0)
    setSelected(null)
    setResults([])
    setRecord(false)
    setPhase('play')
  }

  const q = round[index]
  // The two choices in a fixed order per question (so a replay is not a memory game of positions).
  const options = useMemo(() => {
    if (!q) return []
    const flip = q.id.charCodeAt(q.id.length - 1) % 2 === 1
    return flip ? [q.wrong, q.correct] : [q.correct, q.wrong]
  }, [q])

  const choose = (word: string) => {
    if (selected !== null || !q) return
    setSelected(word)
    const ok = word === q.correct
    if (ok) sfx.correct()
    else sfx.wrong()
    setResults((prev) => [...prev, { q, ok }])
    if (q.tr) {
      const nextMissed = new Set(missedBefore)
      if (ok) nextMissed.delete(q.id)
      else nextMissed.add(q.id)
      setMissedBefore(nextMissed)
      saveMissed(language, nextMissed)
    }
  }

  const next = () => {
    if (index + 1 < round.length) {
      setIndex((i) => i + 1)
      setSelected(null)
      return
    }
    const okCount = results.filter((r) => r.ok).length
    const pct = Math.round((okCount / Math.max(1, results.length)) * 100)
    if (pct > (best ?? 0)) {
      setRecord(best !== undefined)
      void db.saveRecord(recordKey, pct)
    }
    setPhase('over')
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== 'play' || !q) return
      const n = Number(e.key)
      if (selected === null && (n === 1 || n === 2)) choose(options[n - 1]!)
      else if (selected !== null && e.key === 'Enter') {
        e.preventDefault()
        next()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const missed = results.filter((r) => !r.ok)

  return (
    <div className="stack twins-game">
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
          <h1 className="greeting">İkizler Arenası</h1>
          <p className="muted">
            {LANGUAGE_NAME[language]}da birbirine benzeyen ya da Türkçede aynı kelimeyle karşılanan ikizler. Her soruda bir cümle var; boşluğa ikisinden yalnızca biri uyar. Cevaptan sonra aradaki farkın kuralını ve cümlenin Türkçesini görürsün.
          </p>
          <div className="choice-row" role="group" aria-label="Hangi ikizler">
            <button type="button" className="chip" aria-pressed={only === ''} onClick={() => setOnly('')}>
              Hepsi
            </button>
            {rules.map((r) => (
              <button key={r.id} type="button" className="chip" aria-pressed={only === r.id} onClick={() => setOnly(r.id)} lang={language}>
                {r.words.join(' / ')}
              </button>
            ))}
          </div>
          {missedBefore.size > 0 && <p className="small muted">Geçen sefer karıştırdığın {missedBefore.size} cümle turun başına gelir.</p>}
          {best !== undefined && <p className="small muted">Rekorun: %{best}</p>}
          <div className="row">
            <button className="btn btn-lg" onClick={start} autoFocus disabled={pool.length === 0}>
              {Math.min(ROUND_SIZE, pool.length)} soruluk tura başla
            </button>
          </div>
        </div>
      )}

      {phase === 'play' && q && (
        <div className="stack">
          <p className="prompt-label">
            <span lang={language}>{q.rule.words.join(' / ')}</span>: hangisi?
          </p>
          <p className="grammar-sentence" lang={q.tr ? language : undefined}>
            {q.prompt}
          </p>
          {q.context && <p className="small muted">İpucu: {q.context}</p>}
          <div className="options" role="group" aria-label="Seçenekler">
            {options.map((o, i) => (
              <button
                key={o}
                type="button"
                className={`option${selected !== null ? (o === q.correct ? ' is-correct' : selected === o ? ' is-wrong' : ' is-dim') : ''}`}
                disabled={selected !== null}
                onClick={() => choose(o)}
              >
                <span className="key">{i + 1}</span>
                <span className="option-serif" lang={language}>
                  {o}
                </span>
              </button>
            ))}
          </div>
          {selected !== null && (
            <div className="stack" role="status">
              <div className={`formative-tip${selected === q.correct ? '' : ' formative-warning'}`}>
                <div className="formative-tip-head">
                  <BulbIcon size={14} /> <strong>{selected === q.correct ? 'Doğru' : `Doğrusu: ${q.correct}`}</strong>
                </div>
                <p className="small">{q.rule.distinction}</p>
              </div>
              {q.tr && (
                <p className="small muted">
                  <span lang={language}>{filled(q)}</span> · {q.tr}
                  {canSpeak() && (
                    <button type="button" className="icon-btn icon-btn-sm" aria-label="Dinle" onClick={() => speak(filled(q), language)}>
                      <SpeakerIcon size={15} />
                    </button>
                  )}
                </p>
              )}
              <div className="row">
                <button type="button" className="btn" onClick={next} autoFocus>
                  {index + 1 < round.length ? 'Devam' : 'Sonucu gör'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {phase === 'over' && (
        <GameResult
          record={record}
          title="Tur bitti"
          headline={`${round.length - missed.length} / ${round.length} doğru`}
          accuracy={round.length ? (round.length - missed.length) / round.length : 0}
          missed={missed.map((m) => (m.q.tr ? filled(m.q) : `${m.q.correct} ≠ ${m.q.wrong}`))}
          missedLabel="Karıştırdıkların"
          language={language}
          onAgain={start}
          onExit={onExit}
        />
      )}
    </div>
  )
}
