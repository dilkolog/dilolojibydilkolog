import { useEffect, useMemo, useRef, useState } from 'react'
import { createRng, shuffle } from '../../engine/rng'
import { conjugateTense, personsOf, subjectLabel, withSubject, type Tense } from '../../engine/tenses'
import { MicIcon, SpeakerIcon } from '../icons'
import { prefs } from '../prefs'
import { sfx } from '../sounds'
import { canSpeak, speak } from '../speech'
import { listen } from '../speechInput'
import { saidForm } from './spokenForm'
import { CORE_TENSES, tenseName, verbEntry, type LabLanguage } from './labShared'

const ROUND = 6

interface Ask {
  tense: Tense
  person: number
  form: string
}

function buildRound(language: LabLanguage, verb: string, available: readonly Tense[], seed: number): Ask[] {
  const rng = createRng(seed)
  const tenses = CORE_TENSES[language].filter((t) => available.includes(t))
  const asks: Ask[] = []
  for (const tense of shuffle(tenses.length ? tenses : available, rng)) {
    const forms = conjugateTense(verbEntry(language, verb), tense)
    if (!forms) continue
    const persons = personsOf(language, tense).filter((p) => !(language === 'es' && prefs.hideVosotros && p === 4) && forms[p])
    for (const person of shuffle(persons, rng).slice(0, 2)) asks.push({ tense, person, form: forms[person] })
  }
  return shuffle(asks, rng).slice(0, ROUND)
}

/**
 * Say it: the verb, a tense and a person; the form is said aloud and recognised. Saying a form
 * makes it easier to produce in speech than only typing it (production effect; MacLeod 2010).
 */
export function SpeakQuiz({ language, verb, available, onAnswer }: { language: LabLanguage; verb: string; available: readonly Tense[]; onAnswer?: (verb: string, tense: Tense, ok: boolean, given: string, expected: string, person: number) => void }) {
  const [round, setRound] = useState(0)
  const asks = useMemo(() => buildRound(language, verb, available, Date.now() + round), [language, verb, available, round])
  const [index, setIndex] = useState(0)
  const [heard, setHeard] = useState('')
  const [state, setState] = useState<'idle' | 'listening' | 'right' | 'wrong'>('idle')
  const [error, setError] = useState('')
  const [right, setRight] = useState(0)
  const stop = useRef<() => void>(() => {})
  useEffect(() => () => stop.current(), [])
  const q = asks[index]

  if (!asks.length) return <p className="muted">Bu fiil için sorulacak çekim yok.</p>
  if (!q)
    return (
      <section className="stack lab-result" role="status">
        <h3>
          {right} / {asks.length} doğru
        </h3>
        <div className="row">
          <button type="button" className="btn" autoFocus onClick={() => (setRound((r) => r + 1), setIndex(0), setRight(0), setState('idle'), setHeard(''))}>
            Tekrar
          </button>
        </div>
      </section>
    )

  const full = withSubject(language, q.tense, q.person, q.form)
  const start = () => {
    setError('')
    setHeard('')
    setState('listening')
    stop.current = listen(language, {
      onInterim: setHeard,
      onFinal: (alts) => {
        const ok = saidForm(alts, q.form, language)
        setHeard(alts[0] ?? '')
        setState(ok ? 'right' : 'wrong')
        if (ok) {
          setRight((n) => n + 1)
          sfx.correct()
        } else sfx.wrong()
        onAnswer?.(verb, q.tense, ok, alts[0] ?? '', q.form, q.person)
      },
      onError: (message) => {
        setError(message)
        setState('idle')
      },
      onEnd: () => setState((s) => (s === 'listening' ? 'idle' : s)),
    })
  }
  const next = () => {
    setState('idle')
    setHeard('')
    setIndex((i) => i + 1)
  }

  return (
    <div className="stack lab-speakquiz">
      <p className="small muted">
        {index + 1} / {asks.length} · Çekimi sesli söyle
      </p>
      <p className="prompt-label" lang={language}>
        {tenseName(q.tense)}
      </p>
      <p className="prompt-text" lang={language}>
        {subjectLabel(language, q.tense, q.person).split(' / ')[0]} · {verb}
      </p>
      {state === 'idle' || state === 'listening' ? (
        <div className="row">
          <button type="button" className="btn" onClick={start} disabled={state === 'listening'} aria-live="polite">
            <MicIcon size={18} /> {state === 'listening' ? 'Dinliyorum…' : 'Söyle'}
          </button>
          {heard && (
            <span className="small muted" lang={language}>
              {heard}
            </span>
          )}
        </div>
      ) : (
        <div className={`accent-result is-${state === 'right' ? 'correct' : 'wrong'}`}>
          <p className="small" role="status">
            {state === 'right' ? 'Doğru! ' : 'Duyulan: '}
            {state === 'wrong' && <em lang={language}>{heard || '—'}</em>}
            {state === 'wrong' ? ' · Doğrusu: ' : ''}
            <strong lang={language}>{full}</strong>
            {canSpeak() && (
              <button type="button" className="icon-btn icon-btn-sm" aria-label="Doğrusunu dinle" onClick={() => speak(full, language)}>
                <SpeakerIcon size={15} />
              </button>
            )}
          </p>
          <div className="row">
            {state === 'wrong' && (
              <button type="button" className="btn btn-quiet" onClick={start}>
                Bir daha söyle
              </button>
            )}
            <button type="button" className="btn" onClick={next} autoFocus>
              {index + 1 >= asks.length ? 'Bitir' : 'Devam'}
            </button>
          </div>
        </div>
      )}
      {error && (
        <p className="error small" role="status">
          {error}
        </p>
      )}
    </div>
  )
}
