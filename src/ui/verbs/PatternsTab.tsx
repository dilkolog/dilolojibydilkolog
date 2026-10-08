import { useEffect, useMemo, useRef, useState } from 'react'
import { createRng, shuffle } from '../../engine/rng'
import { FAMILIES, FAMILY_ORDER, familyVerbs, type Family, type FamilyId } from '../../engine/verbFamilies'
import { conjugateTense, subjectLabel, withSubject, type Tense } from '../../engine/tenses'
import { AccentBar, accentChange, insertAt } from '../AccentBar'
import { sfx } from '../sounds'
import { FormTable } from './FormTable'
import { judge } from './labShared'
import { tenseName, verbEntry, type LabLanguage } from './labShared'

const SHORT: Record<LabLanguage, string[]> = {
  es: ['yo', 'tú', 'él', 'nos.', 'vos.', 'ellos'],
  fr: ['je', 'tu', 'il', 'nous', 'vous', 'ils'],
}

/** The six persons as pills, the ones that carry the change marked: the "boot" of a stem-changing verb is the shape of the pattern. */
export function PatternShape({ family }: { family: Family }) {
  return (
    <span className="lab-shape" role="img" aria-label={family.persons.length ? `Değişen kişiler: ${family.persons.map((p) => SHORT[family.language][p]).join(', ')}` : 'Değişim yok'}>
      {SHORT[family.language].map((s, i) => (
        <span key={s} className={family.persons.includes(i) ? 'is-change' : undefined}>
          {s}
        </span>
      ))}
    </span>
  )
}

const DRILL_SIZE = 8
/** Verbs side by side in a family's table: enough to see the rule repeat, few enough to read. */
const TABLE_VERBS = 6

/**
 * The family's most common verbs side by side in its tense, the persons that change marked: the same
 * change down each column shows the rule better than any one verb's table.
 */
function FamilyTable({ family, verbs }: { family: Family; verbs: readonly string[] }) {
  const language = family.language
  const tense = family.tense as Tense
  const rows = verbs
    .slice(0, 20)
    .map((v) => ({ verb: v, forms: conjugateTense(verbEntry(language, v), tense) }))
    .filter((r): r is { verb: string; forms: string[] } => !!r.forms)
    .slice(0, TABLE_VERBS)
  if (rows.length < 2) return null
  // The persons that change, and one that doesn't to compare with: the table fits a phone.
  const steady = [0, 1, 2, 3, 4, 5].find((p) => !family.persons.includes(p))
  const cols = [...family.persons, ...(steady === undefined ? [] : [steady])].sort((a, b) => a - b)
  return (
    <div className="lab-heat-wrap">
      <table className="data-table lab-family-table" lang={language}>
        <caption className="small muted">
          <span lang={language}>{tenseName(tense)}</span>: altı çizili biçimlerde aynı değişiklik her fiilde tekrar ediyor
        </caption>
        <thead>
          <tr>
            <th scope="col">
              <span className="sr-only">Fiil</span>
            </th>
            {cols.map((p) => (
              <th key={p} scope="col">
                {SHORT[language][p]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.verb}>
              <th scope="row">{r.verb}</th>
              {cols.map((i) => (
                <td key={i}>{family.persons.includes(i) ? <mark className="conj-odd">{r.forms[i]}</mark> : r.forms[i]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Drill: one person of the family's tense for a handful of its verbs; after each answer the whole tense shows the shape. */
function FamilyDrill({ family, verbs, onCheck, onClose }: { family: Family; verbs: readonly string[]; onCheck: (verb: string, tense: Tense, ok: boolean, given: string, expected: string, person: number) => void; onClose: () => void }) {
  const language = family.language
  const queue = useMemo(() => shuffle(verbs.slice(0, 40), createRng(Date.now())).slice(0, DRILL_SIZE), [verbs])
  const [index, setIndex] = useState(0)
  const [typed, setTyped] = useState('')
  const [shown, setShown] = useState<boolean | null>(null)
  const [right, setRight] = useState(0)
  const input = useRef<HTMLInputElement>(null)
  const verb = queue[index]
  const tense = family.tense as Tense
  const forms = verb ? conjugateTense(verbEntry(language, verb), tense) : undefined
  useEffect(() => {
    if (index >= queue.length && queue.length) sfx.levelUp()
  }, [index, queue.length])

  if (!verb || !forms)
    return (
      <section className="stack lab-result" role="status">
        <h3>{queue.length ? `${right} / ${queue.length} doğru` : 'Bu kalıpta çalışılacak fiil yok'}</h3>
        <div className="row">
          <button type="button" className="btn" onClick={onClose} autoFocus>
            Kalıplara dön
          </button>
        </div>
      </section>
    )
  const check = () => {
    if (!typed.trim() || shown !== null) return
    const ok = judge(language, verb, tense, family.ask, typed)
    setShown(ok)
    if (ok) {
      setRight((n) => n + 1)
      sfx.correct()
    } else sfx.wrong()
    onCheck(verb, tense, ok, typed.trim(), forms[family.ask], family.ask)
  }
  const next = () => {
    setShown(null)
    setTyped('')
    setIndex((i) => i + 1)
    requestAnimationFrame(() => input.current?.focus())
  }
  return (
    <div className="stack lab-drill">
      <div className="lab-practice-top">
        <span className="small muted">
          {family.name} · {index + 1} / {queue.length}
        </span>
        <button type="button" className="link small" onClick={onClose}>
          Çık
        </button>
      </div>
      <div className="lab-bar" aria-hidden>
        <span style={{ width: `${(index / queue.length) * 100}%` }} />
      </div>
      <p className="prompt-label">
        <span lang={language}>{tenseName(tense)}</span>
      </p>
      <p className="prompt-text" lang={language}>
        {subjectLabel(language, tense, family.ask)} · {verb}
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
              {!shown && <strong lang={language}>{withSubject(language, tense, family.ask, forms[family.ask])}</strong>}
            </p>
            <FormTable language={language} tense={tense} forms={forms} layout="single" speakable={false} />
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

const FIND_MEMBERS = 3
const FIND_OTHERS = 3

/** Spot the pattern: six verbs, pick the ones that follow it. */
function FamilyFind({ family, verbs, others, onClose }: { family: Family; verbs: readonly string[]; others: readonly string[]; onClose: () => void }) {
  const language = family.language
  const set = useMemo(() => {
    const rng = createRng(Date.now())
    const members = shuffle(verbs.slice(0, 30), rng).slice(0, FIND_MEMBERS)
    const rest = shuffle(others.filter((v) => !verbs.includes(v)).slice(0, 60), rng).slice(0, FIND_OTHERS)
    return shuffle([...members, ...rest], rng).map((v) => ({ verb: v, member: members.includes(v) }))
  }, [verbs, others])
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set())
  const [done, setDone] = useState(false)
  const tense = family.tense as Tense
  const score = set.filter((s) => s.member === picked.has(s.verb)).length
  return (
    <div className="stack lab-find">
      <div className="lab-practice-top">
        <span className="small muted">{family.name}: kalıbı tanı</span>
        <button type="button" className="link small" onClick={onClose}>
          Çık
        </button>
      </div>
      <p>Hangi fiiller bu kalıba uyuyor? <span className="muted">{family.rule}</span></p>
      <div className="lab-find-grid" lang={language}>
        {set.map((s) => {
          const forms = conjugateTense(verbEntry(language, s.verb), tense)
          const on = picked.has(s.verb)
          return (
            <button
              key={s.verb}
              type="button"
              className={`lab-find-card${done ? (s.member ? ' is-member' : ' is-other') : ''}`}
              aria-pressed={on}
              disabled={done}
              onClick={() => setPicked((p) => (p.has(s.verb) ? new Set([...p].filter((x) => x !== s.verb)) : new Set(p).add(s.verb)))}
            >
              <strong>{s.verb}</strong>
              {done && forms && <span className="small">{withSubject(language, tense, family.ask, forms[family.ask])}</span>}
              {done && <span className="small muted">{s.member ? 'kalıba uyar' : 'uymaz'}</span>}
            </button>
          )
        })}
      </div>
      {done ? (
        <section className="lab-result" role="status">
          <h3>
            {score} / {set.length} doğru
          </h3>
          <div className="row">
            <button type="button" className="btn" onClick={onClose} autoFocus>
              Kalıplara dön
            </button>
          </div>
        </section>
      ) : (
        <div className="row">
          <button type="button" className="btn" onClick={() => setDone(true)}>
            Kontrol et
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * Patterns: the families of verbs that break the rule the same way, each with its rule, the shape
 * of what changes, the verbs that follow it, and two ways to practise it: write forms of its verbs,
 * or tell which verbs belong to it.
 */
export function PatternsTab({
  language,
  frequency,
  initial,
  onVerb,
  onCheck,
}: {
  language: LabLanguage
  frequency: ReadonlyMap<string, number>
  initial?: FamilyId
  onVerb: (verb: string) => void
  onCheck: (verb: string, tense: Tense, ok: boolean, given: string, expected: string, person: number) => void
}) {
  const [open, setOpen] = useState<FamilyId | null>(initial ?? null)
  const [mode, setMode] = useState<'drill' | 'find' | null>(null)
  const order = FAMILY_ORDER[language]
  const list = (id: FamilyId) => familyVerbs(language, id, frequency)
  if (open && mode) {
    const family = FAMILIES[open]
    const close = () => setMode(null)
    const verbs = list(open)
    return mode === 'drill' ? (
      <FamilyDrill key={open} family={family} verbs={verbs} onCheck={onCheck} onClose={close} />
    ) : (
      <FamilyFind key={open} family={family} verbs={verbs} others={list(language === 'es' ? 'es-regular' : 'fr-er')} onClose={close} />
    )
  }
  return (
    <div className="stack lab-patterns">
      <p className="muted">Düzensiz fiilleri tek tek ezberlemek yerine kalıbı bir kez öğren: aynı kural yüzlerce fiili kapsar.</p>
      <ul className="lab-family-list">
        {order.map((id) => {
          const f = FAMILIES[id]
          const verbs = list(id)
          const expanded = open === id
          return (
            <li key={id} className={`lab-family${expanded ? ' is-open' : ''}`}>
              <button type="button" className="lab-family-head" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : id)}>
                <strong>{f.name}</strong>
                <span className="lab-count">{verbs.length} fiil</span>
              </button>
              {expanded && (
                <div className="stack lab-family-body">
                  <p>{f.rule}</p>
                  {f.persons.length > 0 && <PatternShape family={f} />}
                  <ul className="lab-family-examples" lang={language}>
                    {f.examples.map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                  {f.persons.length > 0 && <FamilyTable family={f} verbs={verbs} />}
                  <div className="lab-chips" lang={language}>
                    {verbs.slice(0, 24).map((v) => (
                      <button key={v} type="button" className="chip chip-sm" onClick={() => onVerb(v)}>
                        {v}
                      </button>
                    ))}
                    {verbs.length > 24 && <span className="small muted">+{verbs.length - 24}</span>}
                  </div>
                  <div className="row gap-2">
                    <button type="button" className="btn btn-sm" onClick={() => setMode('drill')} disabled={!verbs.length}>
                      Bu kalıpla çalış
                    </button>
                    <button type="button" className="btn btn-quiet btn-sm" onClick={() => setMode('find')} disabled={verbs.length < FIND_MEMBERS}>
                      Kalıbı tanı
                    </button>
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
