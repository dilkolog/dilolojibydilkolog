import { useEffect, useRef, useState } from 'react'
import { loadPack, packRecord } from '../../data/wordpack'
import { createRng, shuffle } from '../../engine/rng'
import { labTensesOf, type Tense } from '../../engine/tenses'
import { AccentBar } from '../AccentBar'
import { accentChange, insertAt } from '../accentCaret'
import { LinesSkeleton } from '../Skeleton'
import { sfx } from '../sounds'
import { canSpeak, speak } from '../speech'
import { SpeakerIcon } from '../icons'
import { clozeRight, clozesFor, type Cloze } from './sentenceCloze'
import { CORE_TENSES, tenseName, verbEntry, type LabLanguage } from './labShared'

const ROUND = 8

/** Clozes for a round: the chosen verb's sentences first, then the other verbs', one sentence per verb. */
async function buildRound(language: LabLanguage, verbs: readonly string[], seed: number): Promise<Cloze[]> {
  const pack = await loadPack(language)
  if (!pack) return []
  const rng = createRng(seed)
  const [first, ...rest] = verbs
  const out: Cloze[] = []
  for (const verb of [first, ...shuffle(rest, rng)]) {
    const sentences = packRecord(pack, verb, language)?.c
    if (!sentences?.length) continue
    // The core tenses win when a form belongs to several; the rest of the verb's tenses after them.
    const tenses: Tense[] = [...CORE_TENSES[language], ...labTensesOf(verbEntry(language, verb)).filter((t) => !CORE_TENSES[language].includes(t))]
    const found = clozesFor(language, verb, sentences, tenses)
    out.push(...(verb === first ? found : shuffle(found, rng).slice(0, 1)))
    if (out.length >= ROUND) break
  }
  return out.slice(0, ROUND)
}

/**
 * In a sentence: real sentences (Tatoeba, from the word pack) with the verb's form taken out, the
 * verb and the tense given, and the form to write. The step from the table to use.
 */
export function SentenceQuiz({
  language,
  verbs,
  onAnswer,
}: {
  language: LabLanguage
  /** The verb chosen in the lab first, then the learner's own and the most common ones. */
  verbs: readonly string[]
  onAnswer?: (verb: string, tense: Tense, ok: boolean, given: string, expected: string) => void
}) {
  const [round, setRound] = useState(0)
  const [questions, setQuestions] = useState<Cloze[] | null>(null)
  const [index, setIndex] = useState(0)
  const [right, setRight] = useState(0)
  const key = verbs.slice(0, 1).join()

  useEffect(() => {
    let live = true
    setQuestions(null)
    void buildRound(language, verbs, Date.now() + round).then((q) => live && setQuestions(q))
    return () => {
      live = false
    }
  }, [language, key, round]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!questions) return <LinesSkeleton lines={3} label="Cümleler hazırlanıyor" />
  if (!questions.length) return <p className="muted">Bu dilin paketinde bu fiiller için cümle bulunamadı.</p>
  const q = questions[index]
  if (!q)
    return (
      <section className="stack lab-result" role="status">
        <h3>
          {right} / {questions.length} doğru
        </h3>
        <div className="row">
          <button
            type="button"
            className="btn"
            autoFocus
            onClick={() => {
              setRound((r) => r + 1)
              setIndex(0)
              setRight(0)
            }}
          >
            Yeni cümleler
          </button>
        </div>
      </section>
    )

  return (
    <div className="stack lab-sentencequiz">
      <p className="small muted">
        {index + 1} / {questions.length} · Cümledeki boşluğa fiilin çekimini yaz
      </p>
      <ClozeQuestion
        key={index}
        language={language}
        cloze={q}
        last={index + 1 >= questions.length}
        onAnswered={(ok, given) => {
          if (ok) setRight((n) => n + 1)
          onAnswer?.(q.verb, q.tense, ok, given, q.form)
        }}
        onContinue={() => setIndex((i) => i + 1)}
      />
      <p className="small muted">
        Cümleler: <a href="https://tatoeba.org" target="_blank" rel="noreferrer">Tatoeba</a> (CC BY 2.0 FR)
      </p>
    </div>
  )
}

/**
 * One sentence with the verb's form taken out: the verb and the tense given, the form to write.
 * Used by the sentence quiz and the day's verb round.
 */
export function ClozeQuestion({
  language,
  cloze: q,
  last = false,
  onAnswered,
  onContinue,
}: {
  language: LabLanguage
  cloze: Cloze
  /** The last question of a round: the button says "Bitir". */
  last?: boolean
  onAnswered: (ok: boolean, given: string) => void
  onContinue: () => void
}) {
  const [typed, setTyped] = useState('')
  const [shown, setShown] = useState<boolean | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const check = () => {
    if (!typed.trim() || shown !== null) return
    const ok = clozeRight(q, typed, language)
    setShown(ok)
    if (ok) sfx.correct()
    else sfx.wrong()
    onAnswered(ok, typed.trim())
  }
  const whole = `${q.before}${q.form}${q.after}`
  return (
    <div className="stack">
      <p className="prompt-label" lang={language}>
        {q.verb} · {tenseName(q.tense)}
      </p>
      <p className="prompt-text" lang={language}>
        {q.before}
        <span className="lab-blank">{shown === null ? '_____' : q.form}</span>
        {q.after}
      </p>
      <p className="small muted">{q.translation}</p>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault()
          if (shown !== null) onContinue()
          else check()
        }}
      >
        <input
          ref={input}
          className={`input answer-input${shown === null ? '' : shown ? ' is-correct' : ' is-wrong'}`}
          lang={language}
          value={typed}
          onChange={accentChange(language, setTyped)}
          autoFocus
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          disabled={shown !== null}
          aria-label="Cevap"
          placeholder="Çekimi yaz"
        />
        <AccentBar language={language} disabled={shown !== null} onInsert={(ch) => input.current && setTyped(insertAt(input.current, ch))} />
        {shown === null ? (
          <div className="row">
            <button type="submit" className="btn" disabled={!typed.trim()}>
              Kontrol et
            </button>
          </div>
        ) : (
          <div className={`accent-result is-${shown ? 'correct' : 'wrong'}`}>
            <p className="small" role="status">
              {shown ? 'Doğru!' : 'Doğrusu: '}
              {!shown && <strong lang={language}>{q.form}</strong>}
              {canSpeak() && (
                <button type="button" className="icon-btn icon-btn-sm" aria-label="Cümleyi dinle" onClick={() => speak(whole, language)}>
                  <SpeakerIcon size={15} />
                </button>
              )}
            </p>
            <div className="row">
              <button type="button" className="btn" onClick={onContinue} autoFocus>
                {last ? 'Bitir' : 'Devam'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
