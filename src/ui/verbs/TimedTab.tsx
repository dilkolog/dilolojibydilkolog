import { useEffect, useMemo, useRef, useState } from 'react'
import { checkTyped } from '../../engine/answerCheck'
import { createRng, pick } from '../../engine/rng'
import { answersFor, conjugateTense, labTensesOf, subjectLabel, withSubject, type Tense } from '../../engine/tenses'
import type { Level } from '../../engine/verbLab'
import type { UserWordState, VocabularyEntry } from '../../engine/types'
import { AspectGame } from '../games/AspectGame'
import { db } from '../../data/instance'
import { prefs } from '../prefs'
import { AccentBar, accentChange, insertAt } from '../AccentBar'
import { FlameIcon, HeartIcon, SproutIcon, BoltIcon } from '../icons'
import { sfx } from '../sounds'
import { tenseName, verbEntry, type LabLanguage } from './labShared'

type Difficulty = 'easy' | 'medium' | 'hard'

interface Setup {
  name: string
  icon: typeof SproutIcon
  /** Points per right answer, multiplied. */
  times: number
  seconds: number
  levels: Level[]
  /** Which tenses the questions draw on. */
  tenses: (language: LabLanguage) => Tense[]
  summary: (language: LabLanguage) => string
}

const BASIC: Record<LabLanguage, Tense[]> = {
  fr: ['present', 'passe-compose', 'imparfait', 'futur'],
  es: ['presente', 'preterito', 'imperfecto', 'futuro'],
}
const WIDER: Record<LabLanguage, Tense[]> = {
  fr: [...BASIC.fr, 'conditionnel', 'subjonctif'],
  es: [...BASIC.es, 'perfecto', 'condicional', 'subjuntivo'],
}

const SETUPS: Record<Difficulty, Setup> = {
  easy: {
    name: 'Kolay',
    icon: SproutIcon,
    times: 1,
    seconds: 15,
    levels: ['A1', 'A2'],
    tenses: (l) => BASIC[l],
    summary: (l) => `A1–A2 fiiller · ${l === 'fr' ? 'Présent, Passé composé, Imparfait, Futur' : 'Presente, Indefinido, Imperfecto, Futuro'}`,
  },
  medium: {
    name: 'Orta',
    icon: BoltIcon,
    times: 2,
    seconds: 10,
    levels: ['A1', 'A2', 'B1'],
    tenses: (l) => WIDER[l],
    summary: (l) => `A1–B1 fiiller · ${l === 'fr' ? '+ Conditionnel, Subjonctif' : '+ Perfecto, Condicional, Subjuntivo'}`,
  },
  hard: {
    name: 'Zor',
    icon: FlameIcon,
    times: 3,
    seconds: 7,
    levels: ['A1', 'A2', 'B1', 'B2', 'C1'],
    tenses: (l) => (l === 'fr' ? labTensesOf({ language: 'fr', lemma: 'parler', partOfSpeech: 'verb' }) : labTensesOf({ language: 'es', lemma: 'hablar', partOfSpeech: 'verb' })),
    summary: (l) => `Tüm seviyeler · ${l === 'fr' ? 'bileşik zamanlar ve subjonctif dahil' : 'bileşik zamanlar ve subjuntivo dahil'}`,
  },
}

const ROUND = 10
const LIVES = 3

interface Question {
  verb: string
  tense: Tense
  person: number
}

function buildRound(language: LabLanguage, verbs: readonly string[], tenses: readonly Tense[], rng: () => number): Question[] {
  const out: Question[] = []
  const people = [0, 1, 2, 3, 4, 5].filter((p) => !(language === 'es' && prefs.hideVosotros && p === 4))
  for (let i = 0; out.length < ROUND && i < ROUND * 20; i++) {
    const verb = pick(verbs, rng)
    const tense = pick(tenses, rng)
    const person = pick(people, rng)
    if (!conjugateTense(verbEntry(language, verb), tense)) continue
    if (out.some((q) => q.verb === verb && q.tense === tense && q.person === person)) continue
    out.push({ verb, tense, person })
  }
  return out
}

/**
 * Against the clock: ten forms to write before the time per question runs out, three lives, a
 * combo that multiplies the points. Three levels set the verbs, the tenses, the time and the
 * multiplier. A record is kept per level.
 */
export function TimedTab({
  language,
  byFrequency,
  levels,
  vocabulary,
  states,
  onAnswer,
}: {
  language: LabLanguage
  byFrequency: readonly string[]
  levels: ReadonlyMap<string, Level>
  vocabulary: readonly VocabularyEntry[]
  states: readonly UserWordState[]
  onAnswer?: (verb: string, tense: Tense, ok: boolean, given: string, expected: string) => void
}) {
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null)
  const [aspect, setAspect] = useState(false)
  const [records, setRecords] = useState<Record<string, number>>({})
  useEffect(() => {
    void db.getRecords().then(setRecords)
  }, [difficulty])
  const key = (d: Difficulty) => `verbtimed:${language}:${d}`

  if (aspect)
    return (
      <AspectGame language={language} vocabulary={vocabulary} states={states} best={records[`aspect:${language}`]} recordKey={`aspect:${language}`} onBack={() => setAspect(false)} />
    )

  if (!difficulty)
    return (
      <div className="stack lab-timed-intro">
        <header className="stack gap-2 center">
          <h2 className="lab-timed-title">Zamana karşı</h2>
          <p className="muted">Zorluğunu seç ve fiil çekimlerinde kendini test et.</p>
        </header>
        <div className="lab-levelcards">
          {(Object.keys(SETUPS) as Difficulty[]).map((d) => {
            const s = SETUPS[d]
            return (
              <button key={d} type="button" className={`lab-levelcard is-${d}`} onClick={() => setDifficulty(d)}>
                <span className="lab-levelcard-top">
                  <s.icon size={26} />
                  <span className="lab-times">x{s.times} PUAN</span>
                </span>
                <strong>{s.name}</strong>
                <span className="small muted">{s.summary(language)}</span>
                <span className="lab-levelcard-foot">
                  <span>Süre/soru</span>
                  <b>{s.seconds}s</b>
                </span>
                <span className="lab-levelcard-foot">
                  <span>Rekor</span>
                  <b>{records[key(d)] ?? '—'}</b>
                </span>
              </button>
            )
          })}
        </div>
        <button type="button" className="lab-aspect-card" onClick={() => setAspect(true)}>
          <strong>
            Hangi geçmiş zaman? <span className="muted" lang={language}>{language === 'fr' ? 'passé composé / imparfait' : 'indefinido / imperfecto'}</span>
          </strong>
          <span className="small muted">Cümledeki zaman ifadesine bakıp iki biçimden uyanı seç. En çok karıştırılan ayrım.{records[`aspect:${language}`] ? ` Rekor: %${records[`aspect:${language}`]}` : ''}</span>
        </button>
        <p className="small muted center">{LIVES} can · Süre dolunca doğru cevap gösterilir · Üst üste doğrular puanı katlar</p>
      </div>
    )

  return (
    <TimedRun
      key={difficulty}
      language={language}
      difficulty={difficulty}
      byFrequency={byFrequency}
      levels={levels}
      best={records[key(difficulty)]}
      onSaved={(score) => db.saveRecord(key(difficulty), score).then(() => setRecords((r) => ({ ...r, [key(difficulty)]: score })))}
      onExit={() => setDifficulty(null)}
      onAnswer={onAnswer}
    />
  )
}

function TimedRun({
  language,
  difficulty,
  byFrequency,
  levels,
  best,
  onSaved,
  onExit,
  onAnswer,
}: {
  language: LabLanguage
  difficulty: Difficulty
  byFrequency: readonly string[]
  levels: ReadonlyMap<string, Level>
  best?: number
  onSaved: (score: number) => void
  onExit: () => void
  onAnswer?: (verb: string, tense: Tense, ok: boolean, given: string, expected: string) => void
}) {
  const setup = SETUPS[difficulty]
  const verbs = useMemo(() => {
    const pool = byFrequency.filter((v) => setup.levels.includes(levels.get(v) ?? 'C1')).slice(0, 600)
    return pool.length >= 8 ? pool : byFrequency.slice(0, 120)
  }, [byFrequency, levels, setup])
  const [round, setRound] = useState(() => buildRound(language, verbs, setup.tenses(language), createRng(Date.now())))
  const [index, setIndex] = useState(0)
  const [typed, setTyped] = useState('')
  const [lives, setLives] = useState(LIVES)
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [left, setLeft] = useState(setup.seconds)
  const [shown, setShown] = useState<{ ok: boolean; late?: boolean } | null>(null)
  const [over, setOver] = useState(false)
  const [record, setRecord] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const q = round[index]

  // The clock: runs while a question waits for its answer.
  useEffect(() => {
    if (shown || over || !q) return
    const started = performance.now()
    setLeft(setup.seconds)
    const id = setInterval(() => {
      const remaining = setup.seconds - (performance.now() - started) / 1000
      if (remaining <= 0) {
        clearInterval(id)
        setLeft(0)
        settle(false, '', true)
      } else setLeft(remaining)
    }, 100)
    return () => clearInterval(id)
  }, [index, shown, over]) // eslint-disable-line react-hooks/exhaustive-deps

  const forms = q ? conjugateTense(verbEntry(language, q.verb), q.tense) : undefined

  function settle(ok: boolean, given: string, late = false) {
    if (!q || !forms) return
    const nextCombo = ok ? combo + 1 : 0
    const gain = ok ? Math.round((10 + Math.ceil(left)) * setup.times * (1 + Math.floor(nextCombo / 3) * 0.5)) : 0
    setScore((s) => s + gain)
    setCombo(nextCombo)
    if (!ok) setLives((l) => l - 1)
    setShown({ ok, late })
    if (ok) sfx.correct()
    else sfx.wrong()
    onAnswer?.(q.verb, q.tense, ok, given, forms[q.person])
  }

  const submit = () => {
    if (!q || !forms || !typed.trim()) return
    const entry = verbEntry(language, q.verb)
    const accepted = answersFor(entry, q.tense, q.person)
    const others = labTensesOf(entry).flatMap((t) => conjugateTense(entry, t) ?? [])
    const r = checkTyped(typed, accepted, { language, confusables: [], familyForms: others.filter((f) => !accepted.includes(f)) })
    settle(r.verdict === 'correct', typed.trim())
  }

  const next = () => {
    if (lives <= 0 || index + 1 >= round.length) {
      setOver(true)
      sfx.levelUp()
      if (score > 0 && score > (best ?? 0)) {
        onSaved(score)
        setRecord(true)
      }
      return
    }
    setShown(null)
    setTyped('')
    setIndex((i) => i + 1)
    requestAnimationFrame(() => input.current?.focus())
  }

  const again = () => {
    setRound(buildRound(language, verbs, setup.tenses(language), createRng(Date.now())))
    setIndex(0)
    setTyped('')
    setLives(LIVES)
    setScore(0)
    setCombo(0)
    setShown(null)
    setOver(false)
    setRecord(false)
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (shown && !over && e.key === 'Enter') {
        e.preventDefault()
        next()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (over)
    return (
      <section className="stack lab-timed-over center" role="status">
        <h2>{record ? 'Yeni rekor!' : 'Tur bitti'}</h2>
        <p className="lab-score">{score} puan</p>
        <p className="muted">
          {setup.name} · {Math.min(index + (shown ? 1 : 0), round.length)} soru{best ? ` · Rekor: ${Math.max(best, score)}` : ''}
        </p>
        <div className="row gap-2 center">
          <button type="button" className="btn" onClick={again} autoFocus>
            Tekrar
          </button>
          <button type="button" className="btn btn-quiet" onClick={onExit}>
            Zorluk seç
          </button>
        </div>
      </section>
    )

  if (!q || !forms) return <p className="muted">Soru hazırlanıyor…</p>
  const share = Math.max(0, Math.min(1, left / setup.seconds))
  return (
    <div className="stack lab-timed">
      <div className="lab-practice-top">
        <button type="button" className="link" onClick={onExit}>
          ← Zorluk
        </button>
        <span className="small muted">
          {index + 1} / {round.length} · {setup.name}
        </span>
        <span className="lab-hearts" role="img" aria-label={`${lives} can kaldı`}>
          {Array.from({ length: LIVES }, (_, i) => (
            <HeartIcon key={i} size={20} className={i < lives ? 'lab-heart' : 'lab-heart is-lost'} />
          ))}
        </span>
      </div>
      <div className={`lab-clock${share < 0.3 ? ' is-low' : ''}`} role="timer" aria-label={`${Math.ceil(left)} saniye kaldı`}>
        <span style={{ width: `${share * 100}%` }} />
      </div>
      <div className="lab-timed-stats">
        <span>
          <b>{score}</b> puan
        </span>
        {combo >= 2 && (
          <span className="lab-combo">
            <FlameIcon size={16} /> {combo} kombo
          </span>
        )}
      </div>
      <p className="prompt-label">
        <span lang={language}>{tenseName(q.tense)}</span>
      </p>
      <p className="prompt-text" lang={language}>
        {subjectLabel(language, q.tense, q.person)} · {q.verb}
      </p>
      <form
        className="stack"
        onSubmit={(e) => {
          e.preventDefault()
          if (shown) next()
          else submit()
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
        {shown ? (
          <div className={`accent-result is-${shown.ok ? 'correct' : 'wrong'}`}>
            <p className="small" role="status">
              {shown.ok ? 'Doğru!' : shown.late ? 'Süre doldu. ' : 'Yanlış. '}
              {!shown.ok && (
                <>
                  Doğrusu: <strong lang={language}>{withSubject(language, q.tense, q.person, forms[q.person])}</strong>
                </>
              )}
            </p>
            <div className="row">
              <button type="button" className="btn" onClick={next} autoFocus>
                {lives <= 0 || index + 1 >= round.length ? 'Bitir' : 'Devam'}
              </button>
            </div>
          </div>
        ) : (
          <div className="row">
            <button type="submit" className="btn" disabled={!typed.trim()}>
              Kontrol et
            </button>
          </div>
        )}
      </form>
    </div>
  )
}
