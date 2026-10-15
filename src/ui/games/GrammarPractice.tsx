import { useEffect, useMemo, useRef, useState } from 'react'
import { GameResult } from './GameResult'
import { checkGrammar, filled, GRAMMAR_ROUND, pickGrammarRound, sentenceTokens, topicName, topicStats, type GrammarExercise, type GrammarLog, type GrammarVerdict } from '../../engine/grammar'
import { createRng } from '../../engine/rng'
import type { TargetLanguage } from '../../engine/types'
import { db } from '../../data/instance'
import { noteIn } from './logNote'
import { grammarExercises } from '../../data/grammar'
import { AccentBar } from '../AccentBar'
import { accentChange, insertAt } from '../accentCaret'
import { LANGUAGE_NAME } from '../labels'
import { sfx } from '../sounds'
import { LessonLink } from '../LessonLink'

const TYPE_LABEL = { cloze: 'Boşluğu doldur', choice: 'Doğru seçeneği seç', error: 'Hatalı kelimeye dokun' } as const

const note = noteIn(() => db.getGrammarLog(), (log) => db.saveGrammarLog(log))

/**
 * Grammar questions on the hard points of B1–C1: fill a gap, pick the right option, or find the
 * wrong word. Every answer shows the rule in Turkish. Questions never tried, or more often wrong
 * than right, come first; a topic can be picked.
 */
export function GrammarPractice({ language, onExit, initialTopic, onLesson }: { language: TargetLanguage; onExit: () => void; initialTopic?: string; onLesson?: (topic: string) => void }) {
  const all = useMemo(() => grammarExercises(language), [language])
  const [log, setLog] = useState<GrammarLog | null>(null)
  const [topic, setTopic] = useState<string | undefined>(initialTopic)
  const [phase, setPhase] = useState<'intro' | 'play' | 'over'>('intro')
  const [round, setRound] = useState<GrammarExercise[]>([])
  const [index, setIndex] = useState(0)
  const [typed, setTyped] = useState('')
  const [graded, setGraded] = useState<{ verdict: GrammarVerdict; given: string } | null>(null)
  const [results, setResults] = useState<{ ex: GrammarExercise; ok: boolean }[]>([])
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let live = true
    void db.getGrammarLog().then((l) => live && setLog(l))
    return () => {
      live = false
    }
  }, [phase])

  const stats = useMemo(() => (log ? topicStats(log, all) : []), [log, all])
  const q = round[index]

  const start = () => {
    const picked = pickGrammarRound(all, log ?? {}, createRng(Date.now()), { topic })
    if (!picked.length) return
    setRound(picked)
    setIndex(0)
    setResults([])
    setTyped('')
    setGraded(null)
    setPhase('play')
  }

  const grade = (given: string, verdict: GrammarVerdict) => {
    if (!q || graded) return
    const ok = verdict !== 'wrong'
    if (ok) sfx.correct()
    else sfx.wrong()
    setGraded({ verdict, given })
    setResults((r) => [...r, { ex: q, ok }])
    void note(q.id, ok)
  }

  const next = () => {
    if (index + 1 < round.length) {
      setIndex(index + 1)
      setTyped('')
      setGraded(null)
      if (round[index + 1].type === 'cloze') requestAnimationFrame(() => input.current?.focus())
      return
    }
    sfx.levelUp()
    setPhase('over')
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
  const size = Math.min(GRAMMAR_ROUND, topic ? all.filter((e) => e.topic === topic).length : all.length)

  return (
    <div className="stack grammar-game">
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
          <h1 className="greeting">Dilbilgisi soruları</h1>
          <p className="muted">
            {LANGUAGE_NAME[language]} için B1–C1 zor noktalar: boşluk doldur, seçeneği seç ya da hatalı kelimeyi bul. Her cevaptan sonra kuralı Türkçe görürsün. Henüz sormadıkların ve yanlış yaptıkların önce gelir.
          </p>
          <div className="choice-row" role="group" aria-label="Konu">
            <button type="button" className="chip" aria-pressed={!topic} onClick={() => setTopic(undefined)}>
              Hepsi
            </button>
            {stats.map((s) => (
              <button key={s.topic} type="button" className="chip" aria-pressed={topic === s.topic} onClick={() => setTopic(s.topic)}>
                {topicName(s.topic)}
                {s.answered > 0 && <span className="small muted"> · %{Math.round(s.accuracy * 100)}</span>}
              </button>
            ))}
          </div>
          <div className="row">
            <button className="btn btn-lg" onClick={start} autoFocus disabled={!log || size === 0}>
              {size} soruluk tura başla
            </button>
          </div>
        </div>
      )}

      {phase === 'play' && q && (
        <div className="stack">
          <p className="prompt-label">
            {topicName(q.topic)} · {q.level}
          </p>
          <p className="prompt-text">{TYPE_LABEL[q.type]}</p>

          {q.type === 'error' ? (
            <p className="grammar-sentence" lang={language}>
              {sentenceTokens(q).map((t, i) =>
                t.word ? (
                  <button
                    key={i}
                    type="button"
                    className={`grammar-word${graded ? (t.wrong ? ' is-correct' : graded.given === String(i) ? ' is-wrong' : '') : ''}`}
                    disabled={!!graded}
                    onClick={() => grade(String(i), t.wrong ? 'correct' : 'wrong')}
                  >
                    {t.text}
                  </button>
                ) : (
                  <span key={i}>{t.text}</span>
                ),
              )}
            </p>
          ) : (
            <p className="grammar-sentence" lang={language}>
              {q.prompt.split('___').map((part, i, parts) => (
                <span key={i}>
                  {part}
                  {i < parts.length - 1 && <span className="blank">____</span>}
                </span>
              ))}
            </p>
          )}

          {q.hint && !graded && <p className="small muted">İpucu: {q.hint}</p>}

          {q.type === 'choice' && (
            <div className="options">
              {q.options!.map((o, i) => (
                <button
                  key={o}
                  type="button"
                  className={`option${graded ? (checkGrammar(q, o) !== 'wrong' ? ' is-correct' : graded.given === o ? ' is-wrong' : ' is-dim') : ''}`}
                  disabled={!!graded}
                  onClick={() => grade(o, checkGrammar(q, o))}
                >
                  <span className="key">{i + 1}</span>
                  <span className="option-serif" lang={language}>
                    {o}
                  </span>
                </button>
              ))}
            </div>
          )}

          {q.type === 'cloze' && (
            <form
              className="stack"
              onSubmit={(e) => {
                e.preventDefault()
                if (typed.trim()) grade(typed, checkGrammar(q, typed))
              }}
            >
              <input
                ref={input}
                className={`input answer-input${graded ? (graded.verdict !== 'wrong' ? ' is-correct' : ' is-wrong') : ''}`}
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
                placeholder="Kelimeyi yaz"
              />
              {language !== 'en' && <AccentBar language={language} disabled={!!graded} onInsert={(ch) => input.current && setTyped(insertAt(input.current, ch))} />}
              {!graded && (
                <div className="row">
                  <button type="submit" className="btn" disabled={!typed.trim()}>
                    Kontrol et
                  </button>
                </div>
              )}
            </form>
          )}

          {graded && (
            <div className="stack grammar-feedback" role="status">
              <p className={graded.verdict === 'wrong' ? 'cross-warn' : 'small'}>
                <strong>{graded.verdict === 'wrong' ? 'Olmadı.' : graded.verdict === 'near' ? 'Doğru, ama aksana dikkat.' : 'Doğru!'}</strong>{' '}
                {q.type === 'error' ? (
                  <>
                    Hatalı kelime <strong lang={language}>{q.answer}</strong> idi; doğrusu <strong lang={language}>{q.fix}</strong>.
                  </>
                ) : (
                  <span lang={language}>{filled(q, q.answer)}</span>
                )}
              </p>
              <p className="small">{q.explanation}</p>
              {graded.verdict === 'wrong' && onLesson && <LessonLink language={language} topic={q.topic} onOpen={onLesson} />}
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
          headline={`${round.length - missed.length} / ${round.length} doğru`}
          accuracy={round.length ? (round.length - missed.length) / round.length : 0}
          missed={missed.map((m) => (m.ex.type === 'error' ? `${m.ex.answer} → ${m.ex.fix}` : filled(m.ex, m.ex.answer)))}
          missedLabel="Tekrar bakmaya değer"
          language={language}
          onAgain={start}
          onExit={onExit}
        />
      )}
    </div>
  )
}
