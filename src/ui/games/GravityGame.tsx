import { useEffect, useMemo, useRef, useState } from 'react'
import { displayForm } from '../../engine/exercises'
import { isOver, newGravity, START_LIVES, stepGravity, submitGravity, type GravityState } from '../../engine/gravity'
import { createRng } from '../../engine/rng'
import { selectStudyWords } from '../../engine/studySet'
import { scheduler } from '../../data/instance'
import { AccentBar } from '../AccentBar'
import { accentChange, insertAt } from '../accentCaret'
import { sfx } from '../sounds'
import { StudyOptionsPanel } from '../StudyOptions'
import { useStudyOptions } from '../studyOptionsStore'
import { GameResult } from './GameResult'
import { type Props, recordPractice } from './shared'

/**
 * Gravity: meanings fall from the top, type the word before it lands (accents and the article don't
 * matter here: it is a speed game). Three lives; it gets faster. Words solved are practice answers,
 * words that landed are wrong ones; neither moves the review schedule.
 */
export function GravityGame({ language, vocabulary, states, onExit, onChanged }: Props & { onExit: () => void }) {
  const [options, setOptions] = useStudyOptions('gravity', { scope: 'all', size: 20 })
  const available = useMemo(() => selectStudyWords(vocabulary, states, scheduler, new Date(), { ...options, size: 0 }, createRng(1)).length, [vocabulary, states, options])
  const stateById = useMemo(() => new Map(states.map((s) => [s.entryId, s])), [states])
  const game = useRef<GravityState | null>(null)
  const [, frame] = useState(0)
  const [text, setText] = useState('')
  const [over, setOver] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const rng = useRef(createRng(Date.now()))
  const recorded = useRef({ solved: 0, missed: 0 })

  const start = () => {
    rng.current = createRng(Date.now())
    game.current = newGravity(selectStudyWords(vocabulary, states, scheduler, new Date(), options, rng.current))
    recorded.current = { solved: 0, missed: 0 }
    setText('')
    setOver(false)
    frame((n) => n + 1)
  }

  // The clock: a frame at a time, never more than a tenth of a second at once (a hidden tab does not drop everything on return).
  const playing = !!game.current && !over
  useEffect(() => {
    if (!playing) return
    let last = performance.now()
    let id = 0
    const tick = (now: number) => {
      const s = game.current!
      const next = stepGravity(s, Math.min(0.1, (now - last) / 1000), rng.current)
      last = now
      game.current = next
      if (next.lives < s.lives) sfx.wrong()
      // Answers are kept as they happen, so leaving half-way keeps what was played.
      for (const e of next.missed.slice(recorded.current.missed)) void recordPractice(e, stateById.get(e.id), 'typed_translation', false, 0, undefined, { schedule: false })
      recorded.current.missed = next.missed.length
      if (isOver(next)) {
        setOver(true)
        onChanged()
        return
      }
      frame((n) => n + 1)
      id = requestAnimationFrame(tick)
    }
    id = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(id)
  }, [playing, stateById, onChanged])

  useEffect(() => {
    if (playing) input.current?.focus()
  }, [playing])

  const onType = (value: string) => {
    const s = game.current
    if (!s) return
    const r = submitGravity(s, value)
    if (r.hit) {
      game.current = r.state
      setText('')
      sfx.correct()
      void recordPractice(r.hit.entry, stateById.get(r.hit.entry.id), 'typed_translation', true, r.hit.y * 1000, undefined, { schedule: false })
      recorded.current.solved++
    } else setText(value)
  }
  const s = game.current

  if (!s) {
    return (
      <div className="stack">
        <button className="link" onClick={onExit}>← Oyunlar</button>
        <h1 className="greeting">Yerçekimi</h1>
        <p className="greeting-sub">Anlamlar yukarıdan düşer; yere değmeden kelimeyi yaz. {START_LIVES} canın var, düştükçe hızlanır. Aksan ve artikel aramaz.</p>
        <StudyOptionsPanel value={options} onChange={setOptions} language={language} vocabulary={vocabulary} states={states} directions={false} />
        <button className="btn btn-lg" disabled={available < 1} onClick={start}>
          {available < 1 ? 'Bu grupta kelime yok' : `${options.size > 0 ? Math.min(options.size, available) : available} kelimeyle başla`}
        </button>
      </div>
    )
  }

  if (over) {
    const total = s.solved.length + s.missed.length
    return (
      <GameResult
        title={s.lives > 0 ? 'Hepsini yakaladın!' : 'Oyun bitti'}
        headline={`${s.score} puan`}
        accuracy={total ? s.solved.length / total : undefined}
        stats={[
          { label: 'yakalanan', value: s.solved.length },
          { label: 'düşen', value: s.missed.length },
          { label: 'süre', value: `${Math.round(s.time)} sn` },
        ]}
        missed={s.missed.map((e) => `${displayForm(e)} — ${e.senses[0].gloss}`)}
        language={language}
        onAgain={start}
        onExit={onExit}
      />
    )
  }

  return (
    <div className="stack gravity">
      <div className="row justify-between">
        <button className="link" onClick={onExit}>← Bitir</button>
        <span className="small muted" aria-live="polite">
          {'❤'.repeat(Math.max(0, s.lives))}
          {'·'.repeat(Math.max(0, START_LIVES - s.lives))} · {s.score} puan
        </span>
      </div>
      <div className="gravity-field" aria-hidden>
        {s.drops.map((d) => (
          <span key={d.id} className="gravity-drop" style={{ left: `${d.x * 100}%`, top: `${d.y * 100}%` }}>
            {d.prompt}
          </span>
        ))}
        <span className="gravity-ground" />
      </div>
      <p className="sr-only" role="status">{s.drops.map((d) => d.prompt).join(', ')}</p>
      <input
        ref={input}
        className="answer-input"
        value={text}
        onChange={accentChange(language, (v) => onType(v))}
        autoFocus
        lang={language}
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="done"
        placeholder="Kelimeyi yaz"
        aria-label="Düşen anlamın kelimesi"
      />
      <AccentBar language={language} onInsert={(ch) => input.current && onType(insertAt(input.current, ch))} />
    </div>
  )
}
