import { useEffect, useMemo, useRef, useState } from 'react'
import { displayForm } from '../../engine/exercises'
import { createRng } from '../../engine/rng'
import { selectStudyWords } from '../../engine/studySet'
import { buildStatements, type Statement } from '../../engine/trueFalse'
import { scheduler } from '../../data/instance'
import { SAMPLE_WORDS } from '../../data/seed'
import { CheckIcon, CloseIcon } from '../icons'
import { sfx } from '../sounds'
import { StudyOptionsPanel } from '../StudyOptions'
import { useStudyOptions } from '../studyOptionsStore'
import { GameResult } from './GameResult'
import { type Props, recordPractice } from './shared'

/**
 * "maison = ev": true or false? One statement per word, half of them true; a false one carries
 * another word's meaning. Quick and one-handed (←/→ or Y/D on a keyboard); every statement says
 * what the word really means.
 */
export function TrueFalseGame({ language, vocabulary, states, onExit, onChanged }: Props & { onExit: () => void }) {
  const [options, setOptions] = useStudyOptions('truefalse', { scope: 'all' })
  const pool = useMemo(() => {
    const own = new Set(vocabulary.map((v) => v.id))
    return [...vocabulary, ...SAMPLE_WORDS[language].filter((w) => !own.has(w.id))]
  }, [vocabulary, language])
  const available = useMemo(() => selectStudyWords(vocabulary, states, scheduler, new Date(), { ...options, size: 0 }, createRng(1)).length, [vocabulary, states, options])
  const stateById = useMemo(() => new Map(states.map((s) => [s.entryId, s])), [states])
  const [round, setRound] = useState<Statement[] | null>(null)
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<boolean[]>([])
  const [shown, setShown] = useState<{ ok: boolean } | null>(null)
  const shownAt = useRef(0)

  const start = () => {
    const rng = createRng(Date.now())
    setRound(buildStatements(selectStudyWords(vocabulary, states, scheduler, new Date(), options, rng), pool, rng))
    setIndex(0)
    setAnswers([])
    setShown(null)
  }
  const st = round?.[index]
  useEffect(() => {
    shownAt.current = performance.now()
  }, [index, round])

  const answer = (said: boolean) => {
    if (!st || shown) return
    const ok = said === st.isTrue
    if (ok) sfx.correct()
    else sfx.wrong()
    // Judged right or wrong: a recognition answer that never moves the schedule (half of the statements give the answer away).
    void recordPractice(st.entry, stateById.get(st.entry.id), 'mc_meaning', ok, performance.now() - shownAt.current, undefined, { schedule: false })
    setAnswers((a) => [...a, ok])
    setShown({ ok })
  }
  const next = () => {
    setShown(null)
    setIndex((i) => i + 1)
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (shown) {
        if (e.key === 'Enter' || e.key === ' ') next()
        else return
      } else if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') answer(true)
      else if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'y') answer(false)
      else if (e.key === 'Escape') onExit()
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })
  const finished = !!round && index >= round.length
  useEffect(() => {
    if (finished) onChanged()
  }, [finished, onChanged])

  if (!round) {
    return (
      <div className="stack">
        <button className="link" onClick={onExit}>← Oyunlar</button>
        <h1 className="greeting">Doğru mu, yanlış mı?</h1>
        <p className="greeting-sub">Kelimenin yanında bir anlam görürsün; doğru mu, başka bir kelimenin anlamı mı? Yarısı doğrudur.</p>
        <StudyOptionsPanel value={options} onChange={setOptions} language={language} vocabulary={vocabulary} states={states} directions={false} />
        <button className="btn btn-lg" disabled={available < 2} onClick={start}>
          {available < 2 ? 'Bu grupta yeterli kelime yok' : `${options.size > 0 ? Math.min(options.size, available) : available} ifadeyle başla`}
        </button>
        <p className="small muted kbd"><kbd>→</kbd> ya da <kbd>D</kbd> doğru · <kbd>←</kbd> ya da <kbd>Y</kbd> yanlış</p>
      </div>
    )
  }

  if (finished) {
    const right = answers.filter(Boolean).length
    const missed = round.filter((_, i) => !answers[i]).map((s) => `${displayForm(s.entry)} — ${s.truth}`)
    return (
      <GameResult
        title="Tur bitti"
        headline={`${right} / ${round.length}`}
        accuracy={round.length ? right / round.length : 0}
        stats={[
          { label: 'doğru', value: right },
          { label: 'yanlış', value: round.length - right },
        ]}
        missed={missed}
        language={language}
        onAgain={start}
        onExit={onExit}
      />
    )
  }

  const verdict = shown ? (shown.ok ? 'right' : 'wrong') : null
  return (
    <div className="stack true-false game-stage">
      <div className="row justify-between">
        <button className="link" onClick={onExit}>← Bitir</button>
        <span className="small muted">{index + 1} / {round.length}</span>
      </div>
      <div className="bar-track tf-progress" role="progressbar" aria-label="Tur ilerlemesi" aria-valuemin={0} aria-valuemax={round.length} aria-valuenow={index}>
        <div className="bar-fill" style={{ width: `${(index / round.length) * 100}%` }} />
      </div>
      <div className={`card stack tf-card${verdict ? ` is-${verdict}` : ''}`}>
        <strong className="swipe-word" lang={language}>{displayForm(st!.entry)}</strong>
        <p className="tf-equals" aria-hidden>=</p>
        <p className={`swipe-gloss${shown && !st!.isTrue ? ' tf-wrong-claim' : ''}`}>{st!.shown}</p>
        {shown && (
          <div className="tf-verdict" role="status">
            <span className="tf-badge">
              {shown.ok ? <CheckIcon size={18} /> : <CloseIcon size={18} />}
              {shown.ok ? 'Doğru' : 'Yanlış'}
            </span>
            <p className="tf-truth">
              {st!.isTrue ? 'Bu anlam doğru: ' : 'Doğrusu: '}
              <strong lang={language}>{displayForm(st!.entry)}</strong> = <strong>{st!.truth}</strong>
            </p>
          </div>
        )}
      </div>
      <div className="swipe-actions tf-actions">
        {shown ? (
          <button className="btn btn-lg tf-next" onClick={next} autoFocus>
            {index + 1 < round.length ? 'Sonraki' : 'Sonucu gör'} <kbd className="kbd-key">↵</kbd>
          </button>
        ) : (
          <>
            <button className="btn btn-bad btn-lg" onClick={() => answer(false)}>
              <CloseIcon size={20} /> Yanlış <kbd className="kbd-key">←</kbd>
            </button>
            <button className="btn btn-ok btn-lg" onClick={() => answer(true)}>
              <CheckIcon size={20} /> Doğru <kbd className="kbd-key">→</kbd>
            </button>
          </>
        )}
      </div>
    </div>
  )
}
