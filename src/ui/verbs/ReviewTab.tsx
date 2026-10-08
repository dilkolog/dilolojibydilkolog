import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { prefs } from '../prefs'
import { createRng, pick } from '../../engine/rng'
import { dueItems, type LabData } from '../../engine/labProgress'
import { conjugateTense, irregularForms, personsOf, subjectLabel, withSubject, type Tense } from '../../engine/tenses'
import { AccentBar, accentChange, insertAt } from '../AccentBar'
import { sfx } from '../sounds'
import { Diagnosis } from './Diagnosis'
import { judge } from './PracticeTab'
import { tenseName, verbEntry, type LabLanguage } from './labShared'

/** How many forms one review sitting asks: short enough to fit a spare two minutes. */
export const REVIEW_SIZE = 8

/** One question: a person's form of a verb in a tense. */
export interface Asked {
  verb: string
  tense: Tense
  person: number
}

/** The person asked for a form: the ones that break the rule come up a little more often. */
export function personFor(language: LabLanguage, item: { verb: string; tense: Tense }, seed: number): number {
  const rng = createRng(seed)
  const all = personsOf(language, item.tense).filter((p) => !(language === 'es' && prefs.hideVosotros && p === 4))
  const odd = irregularForms(verbEntry(language, item.verb), item.tense)
  const irregular = all.filter((p) => odd[p])
  return pick(irregular.length && rng() < 0.6 ? irregular : all, rng)
}

/**
 * Review: the forms that are due, one person of each. Right is Good for the scheduler, wrong is
 * Again, so what is shaky comes back soon and what is solid goes far out.
 */
export function ReviewTab({ language, lab, onCheck, onOpen }: { language: LabLanguage; lab: LabData; onCheck: RunCheck; onOpen: (verb: string) => void }) {
  // The queue is fixed when the sitting starts; the answers change `lab` under it.
  const queue = useMemo<Asked[]>(() => dueItems(lab, new Date()).slice(0, REVIEW_SIZE).map((item, i) => ({ verb: item.verb, tense: item.tense, person: personFor(language, item, Date.now() + i) })), []) // eslint-disable-line react-hooks/exhaustive-deps
  const total = useRef(dueItems(lab, new Date()).length)
  if (!queue.length)
    return (
      <div className="stack lab-review-empty center">
        <h2>Bugün tekrar yok</h2>
        <p className="muted">Çalıştığın ya da “Tekrar listeme ekle” dediğin fiil çekimleri, unutmak üzereyken buraya gelir.</p>
      </div>
    )
  const more = total.current > queue.length ? total.current - queue.length : 0
  return (
    <FormRun
      language={language}
      queue={queue}
      onCheck={onCheck}
      onOpen={onOpen}
      count={more ? ` (bekleyen ${total.current})` : ''}
      doneTitle="Tekrar bitti"
      doneText={`${more ? `${more} çekim daha bekliyor; ` : ''}Doğru bilinenler daha uzağa, yanlışlar yakına yazıldı.`}
    />
  )
}

export type RunCheck = (verb: string, tense: Tense, ok: boolean, given: string, expected: string, person: number) => void

/** A run of typed forms, one at a time, with what went wrong named; shared by the review and the focused drills. */
export function FormRun({
  language,
  queue,
  onCheck,
  onOpen,
  count = '',
  doneTitle,
  doneText,
  doneAction,
}: {
  language: LabLanguage
  queue: readonly Asked[]
  onCheck: RunCheck
  onOpen?: (verb: string) => void
  /** Shown after "3 / 8". */
  count?: string
  doneTitle: string
  doneText: string
  doneAction?: ReactNode
}) {
  const [index, setIndex] = useState(0)
  const [typed, setTyped] = useState('')
  const [shown, setShown] = useState<boolean | null>(null)
  const [right, setRight] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const asked = queue[index]
  const forms = asked ? conjugateTense(verbEntry(language, asked.verb), asked.tense) : undefined

  const check = () => {
    if (!asked || !forms || !typed.trim() || shown !== null) return
    const ok = judge(language, asked.verb, asked.tense, asked.person, typed)
    setShown(ok)
    if (ok) {
      setRight((n) => n + 1)
      sfx.correct()
    } else sfx.wrong()
    onCheck(asked.verb, asked.tense, ok, typed.trim(), forms[asked.person], asked.person)
  }
  const next = () => {
    setShown(null)
    setTyped('')
    setIndex((i) => i + 1)
    requestAnimationFrame(() => input.current?.focus())
  }
  useEffect(() => {
    if (index >= queue.length && queue.length) sfx.levelUp()
  }, [index, queue.length])

  if (index >= queue.length)
    return (
      <section className="stack lab-result center" role="status">
        <h2>{doneTitle}</h2>
        <p className="lab-score">
          {right} / {queue.length}
        </p>
        <p className="muted">{doneText}</p>
        {doneAction}
      </section>
    )

  return (
    <div className="stack lab-review-run">
      <div className="lab-practice-top">
        <span className="small muted">
          {index + 1} / {queue.length}
          {count}
        </span>
        {onOpen && (
          <button type="button" className="link small" onClick={() => onOpen(asked.verb)}>
            Fiili aç
          </button>
        )}
      </div>
      <div className="lab-bar" aria-hidden>
        <span style={{ width: `${(index / queue.length) * 100}%` }} />
      </div>
      <p className="prompt-label">
        <span lang={language}>{tenseName(asked.tense)}</span>
      </p>
      <p className="prompt-text" lang={language}>
        {subjectLabel(language, asked.tense, asked.person)} · {asked.verb}
      </p>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault()
          if (shown !== null) next()
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
              {!shown && forms && <strong lang={language}>{withSubject(language, asked.tense, asked.person, forms[asked.person])}</strong>}
            </p>
            {!shown && <Diagnosis language={language} verb={asked.verb} tense={asked.tense} person={asked.person} typed={typed} />}
            <div className="row">
              <button type="button" className="btn" onClick={next} autoFocus>
                {index + 1 >= queue.length ? 'Bitir' : 'Devam'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
