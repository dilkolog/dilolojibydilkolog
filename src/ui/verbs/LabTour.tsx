import { useEffect, useMemo, useState } from 'react'
import { loadPack, packRecord } from '../../data/wordpack'
import { buildTour, tourVerbs, type TourItem } from '../../engine/labTour'
import type { LabData } from '../../engine/labProgress'
import { createRng, shuffle } from '../../engine/rng'
import { conjugateTense, labTensesOf, subjectLabel, type Tense } from '../../engine/tenses'
import { PlayIcon, CheckIcon } from '../icons'
import { LinesSkeleton } from '../Skeleton'
import { FormQuestion } from '../session/FormQuestion'
import { sfx } from '../sounds'
import { people } from './drills'
import { CORE_TENSES, dayNumber, tenseName, verbEntry, type LabLanguage } from './labShared'
import { clozesFor, type Cloze } from './sentenceCloze'
import { ClozeQuestion } from './SentenceQuiz'

/** About how long one question takes, for the estimate on the start card. */
const SECONDS_PER_QUESTION = 15
const DONE_KEY = (language: LabLanguage) => `kelime-koc:lab-tour:${language}`

const doneToday = (language: LabLanguage, day: number) => {
  try {
    return localStorage.getItem(DONE_KEY(language)) === String(day)
  } catch {
    return false
  }
}

/** The round for today, from the lab's own data and today's verb. */
export function useTour(language: LabLanguage, lab: LabData, verbOfDay: string | undefined, ready: boolean, round = 0): TourItem[] {
  return useMemo(() => {
    if (!ready) return []
    const now = new Date()
    return buildTour({
      lab,
      now,
      verbOfDay,
      core: CORE_TENSES[language],
      persons: (_verb, tense) => people(language, tense),
      has: (verb, tense) => labTensesOf(verbEntry(language, verb)).includes(tense) && !!conjugateTense(verbEntry(language, verb), tense),
      day: dayNumber(now),
    })
    // The round is set when the lab opens (and again after one ends): answering inside it must not reshuffle it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, verbOfDay, ready, round])
}

/**
 * The start of the lab: one card with the day's round (how many questions, about how long, which
 * verbs) and one button. Done for today, it says so and offers another round.
 */
export function TourCard({ language, items, onStart }: { language: LabLanguage; items: readonly TourItem[]; onStart: () => void }) {
  const day = dayNumber(new Date())
  if (!items.length) return null
  const done = doneToday(language, day)
  const minutes = Math.max(1, Math.round((items.length * SECONDS_PER_QUESTION) / 60))
  const due = items.filter((i) => i.reason === 'due').length
  const weak = items.filter((i) => i.reason === 'weak').length
  const fresh = items.find((i) => i.reason === 'new')?.verb
  const parts = [due && `${due} tekrar`, weak && `${weak} zayıf nokta`, fresh && `günün fiili`].filter(Boolean)
  return (
    <section className={`card lab-tour-card${done ? ' is-done' : ''}`} aria-label="Bugünün fiil turu">
      <div className="lab-tour-text">
        <h2 className="section-title">{done ? 'Bugünkü fiil turun bitti' : 'Bugünün fiil turu'}</h2>
        <p className="small muted">
          {items.length} soru · yaklaşık {minutes} dk ·{' '}
          <span lang={language}>{tourVerbs(items).join(', ')}</span>
          {parts.length > 0 && ` (${parts.join(', ')})`}
        </p>
      </div>
      <button type="button" className={done ? 'btn btn-quiet' : 'btn'} onClick={onStart}>
        {done ? (
          <>
            <CheckIcon size={18} /> Bir tur daha
          </>
        ) : (
          <>
            <PlayIcon size={18} /> Başla
          </>
        )}
      </button>
    </section>
  )
}

type Prepared = TourItem & { cloze?: Cloze }

/** A sentence for each "in a sentence" question; without one in the pack, the form is written on its own. */
async function prepare(language: LabLanguage, items: readonly TourItem[], seed: number): Promise<Prepared[]> {
  if (!items.some((i) => i.kind === 'sentence')) return [...items]
  const pack = await loadPack(language)
  const rng = createRng(seed)
  return items.map((item) => {
    if (item.kind !== 'sentence') return item
    const sentences = pack ? packRecord(pack, item.verb, language)?.c : undefined
    const found = sentences ? clozesFor(language, item.verb, sentences, [item.tense]) : []
    return found.length ? { ...item, cloze: shuffle(found, rng)[0] } : { ...item, kind: 'type' }
  })
}

/**
 * The round itself, one question at a time and nothing else on screen: pick the form among four,
 * write it, or write it into a real sentence. Every answer goes to the lab (mastery, review, the
 * weak-spot map); the end says what was done and closes the day's round.
 */
export function TourRun({
  language,
  items,
  onAnswer,
  onOpenVerb,
  onClose,
}: {
  language: LabLanguage
  items: readonly TourItem[]
  onAnswer: (item: TourItem, ok: boolean, given: string) => void
  onOpenVerb: (verb: string) => void
  onClose: () => void
}) {
  const [questions, setQuestions] = useState<Prepared[] | null>(null)
  const [index, setIndex] = useState(0)
  const [right, setRight] = useState(0)

  useEffect(() => {
    let live = true
    void prepare(language, items, dayNumber(new Date())).then((q) => live && setQuestions(q))
    return () => {
      live = false
    }
  }, [language, items])

  useEffect(() => {
    if (questions && index >= questions.length) {
      try {
        localStorage.setItem(DONE_KEY(language), String(dayNumber(new Date())))
      } catch {
        // Storage off: the start card just won't say "done".
      }
      sfx.levelUp()
    }
  }, [questions, index, language])

  if (!questions) return <LinesSkeleton lines={4} label="Tur hazırlanıyor" />

  const answered = (q: Prepared, ok: boolean, given: string) => {
    if (ok) setRight((n) => n + 1)
    onAnswer(q, ok, given)
  }
  const next = () => setIndex((i) => i + 1)
  const q = questions[index]

  if (!q)
    return (
      <section className="card stack lab-tour-done" role="status">
        <h2 className="section-title">Bugünkü fiil turun bitti</h2>
        <p>
          {questions.length} çekim, {right} doğru.
        </p>
        <div className="lab-chips" lang={language}>
          {tourVerbs(questions).map((v) => (
            <button key={v} type="button" className="chip chip-sm" onClick={() => onOpenVerb(v)}>
              {v}
            </button>
          ))}
        </div>
        <p className="small muted">Yanlışlar ve yeni biçimler tekrar sırana girdi; zamanı gelince turda yine çıkarlar.</p>
        <div className="row">
          <button type="button" className="btn" onClick={onClose} autoFocus>
            Laboratuvara dön
          </button>
        </div>
      </section>
    )

  return (
    <section className="card stack lab-tour-run" aria-label="Fiil turu">
      <div className="row lab-tour-top">
        <button type="button" className="link" onClick={onClose}>
          ← Turu bırak
        </button>
        <span className="small muted">
          {index + 1} / {questions.length}
        </span>
      </div>
      <div className="progress" aria-hidden>
        <div style={{ width: `${(index / questions.length) * 100}%` }} />
      </div>
      {q.kind === 'choose' ? (
        <ChooseForm key={index} language={language} item={q} onAnswered={(ok, given) => answered(q, ok, given)} onContinue={next} />
      ) : q.kind === 'sentence' && q.cloze ? (
        <ClozeQuestion key={index} language={language} cloze={q.cloze} last={index + 1 >= questions.length} onAnswered={(ok, given) => answered(q, ok, given)} onContinue={next} />
      ) : (
        <FormQuestion key={index} form={{ language, verb: q.verb, tense: q.tense, person: q.person }} onAnswered={(ok, given) => answered(q, ok, given)} onContinue={next} />
      )}
    </section>
  )
}

/** The form among four: the right one, the same tense for other persons, the same person in another tense. */
export function formOptions(language: LabLanguage, verb: string, tense: Tense, person: number, seed: number): string[] {
  const entry = verbEntry(language, verb)
  const right = conjugateTense(entry, tense)?.[person] ?? ''
  const rng = createRng(seed)
  const sameTense = (conjugateTense(entry, tense) ?? []).filter(Boolean)
  const samePerson = CORE_TENSES[language].filter((t) => t !== tense).map((t) => conjugateTense(entry, t)?.[person])
  const others = shuffle([...new Set([...sameTense, ...samePerson].filter((f): f is string => !!f && f !== right))], rng)
  return shuffle([right, ...others.slice(0, 3)], rng)
}

function ChooseForm({ language, item, onAnswered, onContinue }: { language: LabLanguage; item: TourItem; onAnswered: (ok: boolean, given: string) => void; onContinue: () => void }) {
  const { verb, tense, person } = item
  const right = conjugateTense(verbEntry(language, verb), tense)?.[person] ?? ''
  const options = useMemo(() => formOptions(language, verb, tense, person, dayNumber(new Date()) + person), [language, verb, tense, person])
  const [picked, setPicked] = useState<string | null>(null)
  const pick = (form: string) => {
    if (picked !== null) return
    setPicked(form)
    const ok = form === right
    if (ok) sfx.correct()
    else sfx.wrong()
    onAnswered(ok, form)
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const i = Number(e.key) - 1
      if (picked === null && i >= 0 && i < options.length) pick(options[i])
      else if (picked !== null && e.key === 'Enter') onContinue()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })
  return (
    <div className="stack">
      <p className="prompt-label">
        Doğru çekimi seç · <span lang={language}>{tenseName(tense)}</span>
      </p>
      <p className="prompt-text" lang={language}>
        {subjectLabel(language, tense, person)} · {verb}
      </p>
      <div className="options" lang={language}>
        {options.map((o, i) => (
          <button
            key={o}
            type="button"
            className={`option${picked !== null && o === right ? ' is-correct' : ''}${picked === o && o !== right ? ' is-wrong' : ''}`}
            disabled={picked !== null}
            onClick={() => pick(o)}
          >
            <span className="key">{i + 1}</span>
            <span>{o}</span>
          </button>
        ))}
      </div>
      {picked !== null && (
        <div className="row">
          <button type="button" className="btn" onClick={onContinue} autoFocus>
            Devam
          </button>
        </div>
      )}
    </div>
  )
}
