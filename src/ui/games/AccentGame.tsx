import { useEffect, useMemo, useRef, useState } from 'react'
import { GameResult } from './GameResult'
import { accentRound, gradeAccents, hasAccent, type AccentAnswer } from '../../engine/accents'
import { displayForm } from '../../engine/exercises'
import { createRng } from '../../engine/rng'
import type { VocabularyEntry } from '../../engine/types'
import { db } from '../../data/instance'
import { AccentBar, accentChange, insertAt } from '../AccentBar'
import { LANGUAGE_NAME } from '../labels'
import { sfx } from '../sounds'
import { recordPractice, type Props } from './shared'

const ROUND = 10
/** Enough accented words for a round to be worth playing. */
export const ACCENT_MIN_WORDS = 4

export const accentedWords = (vocabulary: readonly VocabularyEntry[]) => vocabulary.filter((v) => hasAccent(displayForm(v)))

/**
 * Accent drill: only words that carry an accent. The meaning and the bare letters are shown
 * ("decision"), the learner writes the word with its accents ("décision"); the feedback marks
 * the exact letter. Words with past accent mistakes come up first. Practice: XP, no schedule.
 */
export function AccentGame({ language, vocabulary, states, mistakes = [], best, recordKey, onExit }: Props & { best?: number; recordKey: string; onExit: () => void }) {
  const trouble = useMemo(() => new Set(mistakes.filter((m) => m.errorType === 'accent').map((m) => m.entryId)), [mistakes])
  const pool = useMemo(() => vocabulary.map((v) => ({ id: v.id, word: displayForm(v), entry: v })), [vocabulary])
  const [phase, setPhase] = useState<'intro' | 'play' | 'over'>('intro')
  const [round, setRound] = useState<typeof pool>([])
  const [index, setIndex] = useState(0)
  const [typed, setTyped] = useState('')
  const [graded, setGraded] = useState<AccentAnswer | null>(null)
  const [results, setResults] = useState<{ word: string; ok: boolean }[]>([])
  const [record, setRecord] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const started = useRef(0)
  const q = round[index]
  const available = pool.filter((w) => hasAccent(w.word)).length

  const start = () => {
    setRound(accentRound(pool, trouble, ROUND, createRng(Date.now())))
    setIndex(0)
    setResults([])
    setTyped('')
    setGraded(null)
    setRecord(false)
    setPhase('play')
    started.current = performance.now()
  }

  const check = () => {
    if (!q || graded || !typed.trim()) return
    const g = gradeAccents(typed, q.word)
    const ok = g.verdict === 'correct'
    if (ok) sfx.correct()
    else sfx.wrong()
    setGraded(g)
    setResults((r) => [...r, { word: q.word, ok }])
    void recordPractice(q.entry, states.find((s) => s.entryId === q.id), 'typed_translation', ok, performance.now() - started.current)
  }

  const next = () => {
    setGraded(null)
    setTyped('')
    started.current = performance.now()
    if (index + 1 < round.length) {
      setIndex(index + 1)
      requestAnimationFrame(() => input.current?.focus())
      return
    }
    // The round ends at once, so nothing can be answered again while the record is saved.
    setPhase('over')
    sfx.levelUp()
    const pct = Math.round((results.filter((r) => r.ok).length / round.length) * 100)
    if (pct > (best ?? 0)) void db.saveRecord(recordKey, pct).then(() => setRecord(true))
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase === 'play' && graded && e.key === 'Enter') {
        e.preventDefault()
        next()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const missed = results.filter((r) => !r.ok)

  return (
    <div className="stack accent-game">
      <div className="game-top">
        <button className="link" onClick={onExit}>
          ← Oyunlar
        </button>
        {phase === 'play' && (
          <span className="game-timer">
            {index + 1} / {round.length}
          </span>
        )}
        <span className="small muted">{best ? `Rekor: %${best}` : ''}</span>
      </div>

      {phase === 'intro' && (
        <div className="stack">
          <h1 className="greeting">Aksan antrenmanı</h1>
          <p className="muted">
            Sadece aksanlı kelimelerin: anlamını ve aksansız harflerini görürsün, kelimeyi aksanlarıyla yazarsın. Aksan hatası yaptığın kelimeler önce gelir.
            Harf çubuğu ya da kısa yollar (e' → é) işini kolaylaştırır.
          </p>
          {trouble.size > 0 && <p className="notice">{trouble.size} kelimede aksan hatan var; bu turda öne alınacaklar.</p>}
          <div className="row">
            <button className="btn btn-lg" onClick={start} autoFocus disabled={available < ACCENT_MIN_WORDS}>
              {Math.min(ROUND, available)} soruluk tura başla
            </button>
          </div>
          {available < ACCENT_MIN_WORDS && <p className="small muted">Listende en az {ACCENT_MIN_WORDS} aksanlı {LANGUAGE_NAME[language]} kelime olunca açılır.</p>}
        </div>
      )}

      {phase === 'play' && q && (
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault()
            check()
          }}
        >
          <p className="prompt-label">Aksanlarıyla yaz</p>
          <p className="prompt-text">{q.entry.senses[0].gloss}</p>
          <p className="accent-bare" lang={language}>
            {[...q.word.normalize('NFD').replace(/\p{M}/gu, '').normalize('NFC')].join('')}
          </p>
          <input
            ref={input}
            className={`input answer-input${graded ? (graded.verdict === 'correct' ? ' is-correct' : ' is-wrong') : ''}`}
            value={typed}
            onChange={accentChange(language, setTyped)}
            lang={language}
            autoFocus
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            disabled={!!graded}
            aria-label="Cevap"
            placeholder="Kelimeyi aksanlarıyla yaz"
          />
          <AccentBar language={language} disabled={!!graded} onInsert={(ch) => input.current && setTyped(insertAt(input.current, ch))} />
          {graded ? (
            <div className={`accent-result is-${graded.verdict}`}>
              <p className="accent-answer" lang={language}>
                {graded.letters.map((l, i) => (
                  <span key={i} className={l.accent ? (l.missed ? 'accent-letter is-missed' : 'accent-letter') : undefined}>
                    {l.ch}
                  </span>
                ))}
              </p>
              <p className="small">
                {graded.verdict === 'correct' ? 'Doğru!' : graded.verdict === 'accent' ? 'Harfler doğru, aksan yanlış ya da eksik: işaretli harfe bak.' : `Doğrusu yukarıda; sen “${typed.trim()}” yazdın.`}
              </p>
              <div className="row">
                <button type="button" className="btn" onClick={() => next()} autoFocus>
                  Devam
                </button>
              </div>
            </div>
          ) : (
            <div className="row">
              <button type="submit" className="btn" disabled={!typed.trim()}>
                Kontrol et
              </button>
            </div>
          )}
        </form>
      )}

      {phase === 'over' && (
        <GameResult
          record={record}
          title={record ? 'Yeni rekor!' : 'Tur bitti'}
          headline={`${round.length - missed.length} / ${round.length} doğru`}
          accuracy={round.length ? (round.length - missed.length) / round.length : 0}
          missed={missed.map((m) => m.word)}
          language={language}
          onAgain={start}
          onExit={onExit}
        />
      )}
    </div>
  )
}
