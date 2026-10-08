import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { prefs } from '../prefs'
import { createRng, shuffle } from '../../engine/rng'
import { TENSE_GUIDE } from '../../engine/tenseGuide'
import { conjugateTense, personsOf, subjectLabel, withSubject, labTensesOf, type Tense } from '../../engine/tenses'
import { AccentBar, accentChange, insertAt } from '../AccentBar'
import { BoltIcon, MicIcon, ReadIcon, ScaleIcon, HeadphonesIcon, HeartIcon, MessageIcon, SearchIcon, PenIcon, PuzzleIcon, SpeakerIcon, TargetIcon } from '../icons'
import { sfx } from '../sounds'
import { canSpeak, speak } from '../speech'
import { Diagnosis } from './Diagnosis'
import { ReverseQuiz } from './ReverseQuiz'
import { MoodQuiz } from './MoodQuiz'
import { SpeakQuiz } from './SpeakQuiz'
import { canListen } from '../speechInput'
import { TenseQuiz } from './TenseQuiz'
import { judge, tenseName, verbEntry, type LabLanguage } from './labShared'

export type PracticeMode = 'type' | 'choose' | 'listen' | 'speak' | 'match' | 'sentence' | 'tense' | 'mood' | 'reverse' | 'timed'
type Mode = PracticeMode
const HEARTS = 3
/** Modes with their own questions and counting: no lives and no tense tip. */
const QUIZ: Mode[] = ['speak', 'sentence', 'tense', 'mood', 'reverse', 'timed']

/** Two kinds of practice: the six forms of the tense, and the verb in use (sentences, choices, the clock). */
const MODE_GROUPS: { label: string; modes: { id: Mode; label: string; icon: typeof PenIcon }[] }[] = [
  {
    label: 'Biçim',
    modes: [
      { id: 'type', label: 'Yaz', icon: PenIcon },
      { id: 'choose', label: 'Seç', icon: TargetIcon },
      { id: 'listen', label: 'Dinle', icon: HeadphonesIcon },
      { id: 'speak', label: 'Söyle', icon: MicIcon },
      { id: 'match', label: 'Eşleştir', icon: PuzzleIcon },
    ],
  },
  {
    label: 'Kullanım',
    modes: [
      { id: 'sentence', label: 'Cümlede', icon: ReadIcon },
      { id: 'tense', label: 'Zamanı bul', icon: MessageIcon },
      { id: 'mood', label: 'Kip seç', icon: ScaleIcon },
      { id: 'reverse', label: 'Hangi fiil?', icon: SearchIcon },
      { id: 'timed', label: 'Zamana karşı', icon: BoltIcon },
    ],
  },
]

/** The people the round asks: all six, without vosotros for a learner of Latin American Spanish. */
const peopleFor = (language: LabLanguage) => [0, 1, 2, 3, 4, 5].filter((p) => !(language === 'es' && prefs.hideVosotros && p === 4))

export interface RoundResult {
  correct: number
  total: number
}

function Hearts({ left }: { left: number }) {
  return (
    <span className="lab-hearts" role="img" aria-label={`${left} can kaldı`}>
      {Array.from({ length: HEARTS }, (_, i) => (
        <HeartIcon key={i} size={20} className={i < left ? 'lab-heart' : 'lab-heart is-lost'} />
      ))}
    </span>
  )
}

/**
 * Practice: the six forms of a tense, in four ways: write them (all at once or one by one),
 * choose among forms, hear them and write them, or match persons to forms. Three lives; a round
 * is done when every form is answered or the lives are gone.
 */
export function PracticeTab({
  language,
  verb,
  tense,
  available,
  onTense,
  onRound,
  onAnswer,
  timed,
  sentences,
  initialMode = 'type',
  byFrequency,
}: {
  language: LabLanguage
  verb: string
  tense: Tense
  available: readonly Tense[]
  onTense: (t: Tense) => void
  /** A finished round: how many of the forms were right. */
  onRound: (verb: string, tense: Tense, result: RoundResult) => void
  /** Each single answer, for the word's own history. */
  onAnswer?: (verb: string, tense: Tense, ok: boolean, given: string, expected: string, person: number) => void
  /** The race against the clock (many verbs and tenses), shown as the last mode. */
  timed: ReactNode
  /** Real sentences with the verb's form to write back. */
  sentences: ReactNode
  initialMode?: Mode
  /** Verbs of the tables, most common first (for the "which verb?" questions). */
  byFrequency: readonly string[]
}) {
  const [mode, setMode] = useState<Mode>(initialMode)
  const moodVerbs = useMemo(() => [verb, ...byFrequency.slice(0, 80)], [verb, byFrequency])
  const [list, setList] = useState(true)
  const [round, setRound] = useState(0)
  const [hearts, setHearts] = useState(HEARTS)
  const [outcome, setOutcome] = useState<Record<number, boolean>>({})
  const [finished, setFinished] = useState(false)
  const people = useMemo(() => peopleFor(language).filter((p) => personsOf(language, tense).includes(p)), [language, tense])
  const entry = verbEntry(language, verb)
  const forms = conjugateTense(entry, tense)
  const answered = Object.keys(outcome).length
  const wrong = Object.values(outcome).filter((o) => !o).length

  const reset = () => {
    setRound((r) => r + 1)
    setHearts(HEARTS)
    setOutcome({})
    setFinished(false)
  }
  // A new verb, tense or way of practising starts a new round. Done while rendering, not in an
  // effect: an effect runs after the new inputs are on screen, and would wipe what was typed there.
  const roundOf = `${verb}|${tense}|${mode}|${list}`
  const [shownRound, setShownRound] = useState(roundOf)
  if (shownRound !== roundOf) {
    setShownRound(roundOf)
    reset()
  }

  const finish = (final: Record<number, boolean>) => {
    setFinished(true)
    onRound(verb, tense, { correct: Object.values(final).filter(Boolean).length, total: people.length })
    sfx.levelUp()
  }
  /** One answered form: lives, the outcome, and the end of the round. */
  const settle = (person: number, ok: boolean, given: string, defer = false) => {
    const next = { ...outcome, [person]: ok }
    const lives = ok ? hearts : hearts - 1
    setOutcome(next)
    setHearts(lives)
    if (ok) sfx.correct()
    else sfx.wrong()
    onAnswer?.(verb, tense, ok, given, forms?.[person] ?? '', person)
    if (!defer && (lives <= 0 || Object.keys(next).length === people.length)) finish(next)
  }
  /** The round of one-by-one questions ends when the learner moves on from the last answer. */
  const complete = () => finish(outcome)

  /** A whole list checked at once: every form settled together. */
  const settleMany = (marks: Record<number, boolean>, given: Record<number, string>) => {
    const next = { ...outcome, ...marks }
    const lost = Object.values(marks).filter((o) => !o).length
    setOutcome(next)
    setHearts(Math.max(0, hearts - lost))
    if (lost) sfx.wrong()
    else sfx.correct()
    for (const [p, ok] of Object.entries(marks)) onAnswer?.(verb, tense, ok, given[Number(p)] ?? '', forms?.[Number(p)] ?? '', Number(p))
    finish(next)
  }

  if (!forms) return null
  const nextTense = available[(available.indexOf(tense) + 1) % available.length]
  const props = { language, verb, tense, forms, people, outcome, finished, round, hearts, settle, settleMany, complete }

  return (
    <div className="stack lab-practice">
      {!QUIZ.includes(mode) && (
        <>
          <div className="lab-practice-top">
            <span className="small muted">
              {answered} / {people.length} çekim
            </span>
            <Hearts left={hearts} />
          </div>
          <div className="lab-bar lab-practice-bar" aria-hidden>
            <span style={{ width: `${(answered / people.length) * 100}%` }} />
          </div>
        </>
      )}

      <div className="lab-practice-head">
        <h2 className="lab-verb" lang={language}>
          {verb[0].toLocaleUpperCase(language) + verb.slice(1)}
        </h2>
        <div className="lab-mode-groups">
          {MODE_GROUPS.map((g) => (
            <div key={g.label} className="lab-mode-group">
              <span className="small muted">{g.label}</span>
              <div className="lab-modes" role="group" aria-label={`${g.label} alıştırmaları`}>
                {g.modes.map((m) => (
                  <button key={m.id} type="button" className="lab-mode" aria-pressed={mode === m.id} onClick={() => setMode(m.id)} disabled={(m.id === 'listen' && !canSpeak()) || (m.id === 'speak' && !canListen())} title={m.label}>
                    <m.icon size={18} />
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        {mode === 'type' && (
          <div className="segmented lab-layout" role="group" aria-label="Düzen">
            <button type="button" className="segmented-btn" aria-pressed={list} onClick={() => setList(true)}>
              Liste
            </button>
            <button type="button" className="segmented-btn" aria-pressed={!list} onClick={() => setList(false)}>
              Tek tek
            </button>
          </div>
        )}
      </div>

      {mode === 'type' && list && <TypeList key={round} {...props} />}
      {!finished && mode === 'type' && !list && <OneByOne key={round} kind="type" {...props} />}
      {!finished && mode === 'listen' && <OneByOne key={round} kind="listen" {...props} />}
      {!finished && mode === 'choose' && <OneByOne key={round} kind="choose" {...props} />}
      {!finished && mode === 'match' && <MatchRound key={round} {...props} />}
      {mode === 'tense' && <TenseQuiz key={verb} language={language} verb={verb} available={available} />}
      {mode === 'speak' && <SpeakQuiz key={`${verb}${available.join()}`} language={language} verb={verb} available={available} onAnswer={onAnswer} />}
      {mode === 'mood' && <MoodQuiz key={verb} language={language} verbs={moodVerbs} />}
      {mode === 'reverse' && <ReverseQuiz key={language} language={language} byFrequency={byFrequency} />}
      {mode === 'sentence' && sentences}
      {mode === 'timed' && timed}

      {finished && !QUIZ.includes(mode) && (
        <section className="lab-result" role="status">
          <h3>{wrong === 0 ? 'Hepsi doğru!' : hearts <= 0 ? 'Canların bitti' : `${answered - wrong} / ${people.length} doğru`}</h3>
          {wrong > 0 && (
            <ul className="lab-missed" lang={language}>
              {people
                .filter((p) => outcome[p] === false)
                .map((p) => (
                  <li key={p}>
                    {withSubject(language, tense, p, forms[p])}
                  </li>
                ))}
            </ul>
          )}
          <div className="row gap-2">
            <button type="button" className="btn" onClick={reset} autoFocus>
              Tekrar
            </button>
            {nextTense !== tense && (
              <button type="button" className="btn btn-quiet" onClick={() => onTense(nextTense)}>
                Sıradaki: <span lang={language}>{tenseName(nextTense)}</span>
              </button>
            )}
            <button type="button" className="btn btn-quiet" onClick={() => setMode('timed')}>
              Zamana karşı
            </button>
          </div>
        </section>
      )}
      {!QUIZ.includes(mode) && <p className="small muted lab-tip">{TENSE_GUIDE[tense].short}</p>}
    </div>
  )
}

interface RoundProps {
  language: LabLanguage
  verb: string
  tense: Tense
  forms: string[]
  people: number[]
  outcome: Record<number, boolean>
  finished: boolean
  round: number
  hearts: number
  settle: (person: number, ok: boolean, given: string, defer?: boolean) => void
  complete: () => void
  settleMany: (marks: Record<number, boolean>, given: Record<number, string>) => void
}

/** Whether what was typed is a right answer for the person: the form alone or with its subject. */

/** All six forms at once, each in its own row; "Kontrol et" marks them together. */
function TypeList({ language, verb, tense, forms, people, settleMany }: RoundProps) {
  const [typed, setTyped] = useState<Record<number, string>>({})
  const [hints, setHints] = useState<ReadonlySet<number>>(new Set())
  const [checked, setChecked] = useState<Record<number, boolean> | null>(null)
  const inputs = useRef<Record<number, HTMLInputElement | null>>({})
  const [focused, setFocused] = useState(people[0])
  const check = () => {
    const marks = Object.fromEntries(people.map((p) => [p, judge(language, verb, tense, p, typed[p] ?? '')]))
    setChecked(marks)
    settleMany(marks, Object.fromEntries(people.map((p) => [p, typed[p] ?? ''])))
  }
  const filled = people.every((p) => (typed[p] ?? '').trim())
  return (
    <form
      className="stack lab-typelist"
      onSubmit={(e) => {
        e.preventDefault()
        if (!checked) check()
      }}
    >
      {people.map((p, n) => (
        <div key={p} className={`lab-answer-row${checked ? (checked[p] ? ' is-ok' : ' is-bad') : ''}`}>
          <label htmlFor={`lab-in-${p}`} className="lab-subject">
            {subjectLabel(language, tense, p)}
          </label>
          <input
            id={`lab-in-${p}`}
            ref={(el) => {
              inputs.current[p] = el
            }}
            className="input"
            lang={language}
            value={typed[p] ?? ''}
            placeholder={hints.has(p) ? `${forms[p].slice(0, 2)}…` : '…'}
            disabled={!!checked}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            autoFocus={n === 0}
            onFocus={() => setFocused(p)}
            onChange={accentChange(language, (v) => setTyped((t) => ({ ...t, [p]: v })))}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && n < people.length - 1) {
                e.preventDefault()
                inputs.current[people[n + 1]]?.focus()
              }
            }}
          />
          <button type="button" className="icon-btn icon-btn-sm" aria-label="İpucu: ilk harfler" disabled={!!checked} onClick={() => setHints((h) => new Set(h).add(p))}>
            ?
          </button>
          {canSpeak() && checked && (
            <button type="button" className="icon-btn icon-btn-sm" aria-label={`Dinle: ${withSubject(language, tense, p, forms[p])}`} onClick={() => speak(withSubject(language, tense, p, forms[p]), language)}>
              <SpeakerIcon size={15} />
            </button>
          )}
          {checked && !checked[p] && (
            <span className="lab-right" lang={language}>
              {forms[p]}
            </span>
          )}
        </div>
      ))}
      <AccentBar language={language} disabled={!!checked} onInsert={(ch) => inputs.current[focused] && setTyped((t) => ({ ...t, [focused]: insertAt(inputs.current[focused]!, ch) }))} />
      <div className="row">
        <button type="submit" className="btn" disabled={!filled || !!checked}>
          Kontrol et
        </button>
        <button type="button" className="btn btn-quiet" disabled={!!checked} onClick={() => setTyped({})}>
          Sıfırla
        </button>
      </div>
    </form>
  )
}

const DISTRACTORS = 3

/** One person at a time: typed, chosen from four, or heard first. */
function OneByOne({ kind, language, verb, tense, forms, people, hearts, settle, complete }: RoundProps & { kind: 'type' | 'choose' | 'listen' }) {
  const order = useMemo(() => shuffle(people, createRng(Date.now())), [people])
  const [index, setIndex] = useState(0)
  const [typed, setTyped] = useState('')
  const [shown, setShown] = useState<{ ok: boolean; picked?: string } | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const person = order[index]
  const entry = verbEntry(language, verb)
  const options = useMemo(() => {
    if (kind !== 'choose') return []
    // Wrong options a learner might really pick: this person in other tenses, other persons in this one.
    const pool = new Set<string>()
    for (const t of labTensesOf(entry)) if (t !== tense) pool.add(conjugateTense(entry, t)?.[person] ?? '')
    forms.forEach((f, i) => i !== person && pool.add(f))
    pool.delete('')
    pool.delete(forms[person])
    return shuffle([forms[person], ...shuffle([...pool], createRng(person + index)).slice(0, DISTRACTORS)], createRng(index + 7))
  }, [kind, tense, person, index]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (kind === 'listen' && !shown) speak(withSubject(language, tense, person, forms[person]), language)
  }, [kind, person]) // eslint-disable-line react-hooks/exhaustive-deps

  const answer = (ok: boolean, given: string) => {
    setShown({ ok, picked: given })
    settle(person, ok, given, true)
  }
  const next = () => {
    if (index + 1 >= order.length || (hearts <= 0 && !shown?.ok)) return complete()
    setShown(null)
    setTyped('')
    setIndex((i) => i + 1)
    requestAnimationFrame(() => input.current?.focus())
  }
  if (person === undefined) return null
  return (
    <div className="stack lab-single">
      {kind === 'listen' ? (
        <div className="lab-listen">
          <button type="button" className="btn btn-lg" onClick={() => speak(withSubject(language, tense, person, forms[person]), language)}>
            <SpeakerIcon size={20} /> Tekrar dinle
          </button>
          <p className="small muted">Duyduğun çekimi yaz.</p>
        </div>
      ) : (
        <p className="prompt-text" lang={language}>
          {subjectLabel(language, tense, person)} · {verb}
        </p>
      )}
      {kind === 'choose' ? (
        <div className="lab-options" role="group" aria-label="Seçenekler" lang={language}>
          {options.map((o) => (
            <button
              key={o}
              type="button"
              className={`lab-option${shown ? (o === forms[person] ? ' is-right' : o === shown.picked ? ' is-wrong' : '') : ''}`}
              disabled={!!shown}
              onClick={() => answer(o === forms[person], o)}
            >
              {o}
            </button>
          ))}
        </div>
      ) : (
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault()
            if (shown) next()
            else if (typed.trim()) answer(judge(language, verb, tense, person, typed), typed.trim())
          }}
        >
          <input
            ref={input}
            className={`input answer-input${shown ? (shown.ok ? ' is-correct' : ' is-wrong') : ''}`}
            lang={language}
            value={typed}
            onChange={accentChange(language, setTyped)}
            autoFocus
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            disabled={!!shown}
            aria-label="Cevap"
            placeholder="Çekimi yaz"
          />
          <AccentBar language={language} disabled={!!shown} onInsert={(ch) => input.current && setTyped(insertAt(input.current, ch))} />
          {!shown && (
            <div className="row">
              <button type="submit" className="btn" disabled={!typed.trim()}>
                Kontrol et
              </button>
            </div>
          )}
        </form>
      )}
      {shown && (
        <div className={`accent-result is-${shown.ok ? 'correct' : 'wrong'}`}>
          <p className="small" role="status">
            {shown.ok ? 'Doğru!' : 'Doğrusu: '}
            {!shown.ok && <strong lang={language}>{withSubject(language, tense, person, forms[person])}</strong>}
          </p>
          {!shown.ok && kind !== 'choose' && <Diagnosis language={language} verb={verb} tense={tense} person={person} typed={shown.picked ?? ''} />}
          <div className="row">
            <button type="button" className="btn" onClick={next} autoFocus>
              Devam
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/** Match each person with its form: tap a person, then a form. A wrong pair costs a life. */
function MatchRound({ language, tense, forms, people, settle }: RoundProps) {
  const right = useMemo(() => shuffle(people, createRng(Date.now() + 3)), [people])
  const [pick, setPick] = useState<number | null>(null)
  const [done, setDone] = useState<ReadonlySet<number>>(new Set())
  const [miss, setMiss] = useState<number | null>(null)
  const choose = (formOf: number) => {
    if (pick === null) return
    if (pick === formOf) {
      setDone(new Set(done).add(pick))
      settle(pick, true, forms[formOf])
    } else {
      setMiss(formOf)
      settle(pick, false, forms[formOf])
      setTimeout(() => setMiss(null), 500)
    }
    setPick(null)
  }
  return (
    <div className="lab-match" lang={language}>
      <div className="stack gap-2">
        {people.map((p) => (
          <button key={p} type="button" className={`lab-match-btn${done.has(p) ? ' is-done' : ''}${pick === p ? ' is-picked' : ''}`} disabled={done.has(p)} aria-pressed={pick === p} onClick={() => setPick(p)}>
            {subjectLabel(language, tense, p)}
          </button>
        ))}
      </div>
      <div className="stack gap-2">
        {right.map((p) => (
          <button key={p} type="button" className={`lab-match-btn${done.has(p) ? ' is-done' : ''}${miss === p ? ' is-miss' : ''}`} disabled={done.has(p) || pick === null} onClick={() => choose(p)}>
            {forms[p]}
          </button>
        ))}
      </div>
    </div>
  )
}
