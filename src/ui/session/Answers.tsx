import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { ChoiceExercise, Evaluation, TypedExercise } from '../../engine/exercises'
import type { VocabularyEntry } from '../../engine/types'
import { AccentBar } from '../AccentBar'
import { accentChange, insertAt } from '../accentCaret'
import { prefs } from '../prefs'
import { canListen, listen } from '../speechInput'
import { modalOpen } from './keys'
import { CheckIcon, CloseIcon, MicIcon } from '../icons'


/** Multiple-choice options. */
export function Choices({
  exercise,
  chosen,
  answered,
  onChoose,
  lang,
}: {
  exercise: ChoiceExercise
  chosen?: string
  answered: boolean
  onChoose: (id: string, shift: boolean) => void
  /** Language of options written in the target language (read aloud in it by screen readers). */
  lang?: string
}) {
  // Number keys pick an option, so a whole session can run from the keyboard. Shift+number
  // (e.code: Shift changes e.key to a symbol) answers as "not sure".
  useEffect(() => {
    if (answered) return
    const onKey = (e: KeyboardEvent) => {
      if (modalOpen()) return
      const m = /^(?:Digit|Numpad)([1-9])$/.exec(e.code)
      const i = m ? Number(m[1]) - 1 : -1
      if (i >= 0 && i < exercise.options.length) onChoose(exercise.options[i].id, e.shiftKey)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [answered, exercise, onChoose])

  const targetText = exercise.type !== 'mc_meaning' && exercise.type !== 'listen_choose'
  // "gün (gün boyu)" beside "gün": the part in brackets is what tells them apart, so it gets its
  // own line, stronger when another option has the same main word.
  const split = (label: string) => (targetText ? null : /^(.+?)\s*\((.+)\)$/.exec(label))
  const mains = exercise.options.map((o) => (split(o.label)?.[1] ?? o.label).trim())
  return (
    <div className="options">
      {exercise.options.map((o, i) => {
        const state = answered
          ? o.id === exercise.correctOptionId
            ? 'is-correct'
            : o.id === chosen
              ? 'is-wrong'
              : 'is-dim'
          : ''
        return (
          <button key={o.id} className={`option ${state}`} disabled={answered} onClick={(e) => onChoose(o.id, e.shiftKey)}>
            {/* Once answered, the number gives way to the verdict on the option itself. */}
            <span className="key">{state === 'is-correct' ? <CheckIcon size={14} /> : state === 'is-wrong' ? <CloseIcon size={14} /> : i + 1}</span>
            {(() => {
              const m = split(o.label)
              if (!m) return <span className={targetText ? 'option-serif' : ''} lang={targetText ? lang : undefined}>{o.label}</span>
              const twin = mains.filter((x) => x === m[1].trim()).length > 1
              return (
                <span className="option-split">
                  {m[1]}
                  <span className={`option-note${twin ? ' is-twin' : ''}`}>{m[2]}</span>
                </span>
              )
            })()}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Hints are released on a delay (desirable difficulty): the learner first has to try
 * retrieving the word unaided, and each hint costs grade.
 */
export function TypedAnswer({
  exercise,
  language,
  answered,
  pending,
  verdict,
  onSubmit,
}: {
  exercise: TypedExercise
  language: VocabularyEntry['language']
  answered: boolean
  pending?: boolean
  verdict?: Evaluation['verdict']
  onSubmit: (text: string, hintsUsed: number, shift: boolean) => void
}) {
  const [text, setText] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const [hearing, setHearing] = useState(false)
  const stopListening = useRef<() => void>(() => {})
  useEffect(() => () => stopListening.current(), [])
  const dictate = () => {
    if (hearing) return stopListening.current()
    setHearing(true)
    stopListening.current = listen(language, {
      onInterim: (t) => setText(t),
      onFinal: (alts) => setText(alts[0] ?? ''),
      onError: () => setHearing(false),
      onEnd: () => setHearing(false),
    })
  }
  const [shown, setShown] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const start = useRef(performance.now())

  useEffect(() => {
    if (answered) return
    const t = setInterval(() => setElapsed(performance.now() - start.current), 500)
    return () => clearInterval(t)
  }, [answered])

  // Each next hint unlocks one more delay later (desirable difficulty).
  const nextDelay = shown < exercise.hints.length ? prefs.hintDelayMs * (shown + 1) : Infinity
  const waitSec = Math.max(0, Math.ceil((nextDelay - elapsed) / 1000))
  const canHint = shown < exercise.hints.length && waitSec === 0 && !answered

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (modalOpen()) return
      // e.code, not e.key: on macOS Alt+H types a special character instead of "h".
      if (e.altKey && e.code === 'KeyH') {
        e.preventDefault()
        if (canHint) setShown((n) => n + 1)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [canHint])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!answered && text.trim()) onSubmit(text, shown, false)
  }

  return (
    <form onSubmit={submit}>
      <label className="sr-only" htmlFor="answer">
        Cevabın
      </label>
      <div className="answer-wrap">
      <input
        id="answer"
        ref={input}
        className={`answer-input${verdict ? ` is-${verdict}` : ''}`}
        value={text}
        onChange={accentChange(language, setText)}
        onKeyDown={(e) => {
          // Shift+Enter: answer, marked as not sure.
          if (e.key === 'Enter' && e.shiftKey) {
            e.preventDefault()
            if (!answered && text.trim()) onSubmit(text, shown, true)
          }
        }}
        disabled={answered}
        autoFocus
        placeholder="Cevabını yaz"
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="done"
        lang={exercise.entryId.slice(0, 2)}
      />
      {/* Listening exercises test spelling what you hear, so no speaking shortcut there. */}
      {canListen() && !answered && exercise.skill !== 'listening' && (
        <button type="button" className={`mic-btn${hearing ? ' is-on' : ''}`} onClick={dictate} aria-label={hearing ? 'Dinlemeyi durdur' : 'Sesle cevap ver'}>
          <MicIcon size={20} />
        </button>
      )}
      </div>
      {!answered && <AccentBar language={language} onInsert={(ch) => input.current && setText(insertAt(input.current, ch))} />}
      {shown > 0 && (
        <div className="hints">
          {exercise.hints.slice(0, shown).map((h, i) => (
            <p key={i} className="hint">
              {h}
            </p>
          ))}
        </div>
      )}
      {(!answered || pending) && (
        <div className="session-actions">
          <button className="btn" type="submit" disabled={!text.trim() || pending}>
            {pending ? 'Değerlendiriliyor…' : 'Kontrol et'}
          </button>
          {shown < exercise.hints.length && (
            <button type="button" className="btn btn-quiet" disabled={!canHint} onClick={() => setShown((n) => n + 1)}>
              {waitSec > 0 ? `İpucu (${waitSec})` : 'İpucu'}
            </button>
          )}
        </div>
      )}
    </form>
  )
}


/** Answer by saying the word aloud. */
export function SpeakAnswer({
  language,
  answered,
  onHeard,
  onTypeInstead,
}: {
  language: VocabularyEntry['language']
  answered: boolean
  onHeard: (alternatives: string[]) => void
  onTypeInstead: () => void
}) {
  const [state, setState] = useState<'idle' | 'listening' | 'done'>('idle')
  const [heard, setHeard] = useState('')
  const [error, setError] = useState('')
  const stop = useRef<() => void>(() => {})
  useEffect(() => () => stop.current(), [])

  const start = () => {
    setError('')
    setHeard('')
    setState('listening')
    stop.current = listen(language, {
      onInterim: setHeard,
      onFinal: (alts) => {
        setHeard(alts[0] ?? '')
        setState('done')
        onHeard(alts)
      },
      onError: (m) => {
        setError(m)
        setState('idle')
      },
      onEnd: () => setState((s) => (s === 'listening' ? 'idle' : s)),
    })
  }

  return (
    <div className="speak-answer">
      <button className={`mic-big${state === 'listening' ? ' is-on' : ''}`} onClick={start} disabled={answered || state === 'listening'} aria-label="Konuş">
        <MicIcon size={22} />
      </button>
      <p className="heard">{heard ? `“${heard}”` : state === 'listening' ? 'Dinliyorum…' : 'Mikrofona dokun ve kelimeyi söyle'}</p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {!answered && (
        <button className="link small" onClick={onTypeInstead}>
          Yazarak cevapla
        </button>
      )}
    </div>
  )
}
