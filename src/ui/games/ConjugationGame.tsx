import { useEffect, useMemo, useRef, useState } from 'react'
import { prefs } from '../prefs'
import { GameResult } from './GameResult'
import { checkTyped, normalize } from '../../engine/answerCheck'
import { createRng, pick, shuffle, type Rng } from '../../engine/rng'
import { formFeedback, TENSE_GUIDE } from '../../engine/tenseGuide'
import { answersFor, conjugateTense, irregularForms, subjectLabel, tenseSentence, withSubject, tensesOf, tenseVariants, TENSES, type Tense, type TenseSentence } from '../../engine/tenses'
import type { VocabularyEntry } from '../../engine/types'
import { db } from '../../data/instance'
import { AccentBar, accentChange, insertAt } from '../AccentBar'
import { TENSE_GROUPS, useTenses } from '../ConjugationTable'
import { Sentence } from '../session/shared'
import { sfx } from '../sounds'
import { canSpeak, speak } from '../speech'
import { SpeakerIcon } from '../icons'
import { AspectGame } from './AspectGame'
import { useTenseStats, weakestTense } from '../TenseWeakness'
import { isPctRecord, recordPractice, type Props } from './shared'

const ROUND = 10
/** Own verbs needed before a round uses them instead of the most common verbs. */
export const CONJ_MIN_VERBS = 3

type Verb = Pick<VocabularyEntry, 'language' | 'lemma' | 'partOfSpeech'> & { gloss: string; entry?: VocabularyEntry }

/** The verbs every learner needs first, for when the list has few verbs of its own. */
export const COMMON: Record<'fr' | 'es', [string, string][]> = {
  fr: [
    ['être', 'olmak'], ['avoir', 'sahip olmak'], ['aller', 'gitmek'], ['faire', 'yapmak'], ['dire', 'söylemek'], ['pouvoir', '-ebilmek'],
    ['vouloir', 'istemek'], ['savoir', 'bilmek'], ['venir', 'gelmek'], ['devoir', 'zorunda olmak'], ['prendre', 'almak'], ['voir', 'görmek'],
    ['donner', 'vermek'], ['parler', 'konuşmak'], ['mettre', 'koymak'], ['partir', 'ayrılmak'], ['trouver', 'bulmak'], ['croire', 'inanmak'],
    ['finir', 'bitirmek'], ['comprendre', 'anlamak'],
  ],
  es: [
    ['ser', 'olmak'], ['estar', 'bulunmak, olmak'], ['tener', 'sahip olmak'], ['hacer', 'yapmak'], ['ir', 'gitmek'], ['poder', '-ebilmek'],
    ['decir', 'söylemek'], ['dar', 'vermek'], ['ver', 'görmek'], ['saber', 'bilmek'], ['querer', 'istemek'], ['llegar', 'varmak'],
    ['pasar', 'geçmek'], ['poner', 'koymak'], ['salir', 'çıkmak'], ['venir', 'gelmek'], ['hablar', 'konuşmak'], ['comer', 'yemek'],
    ['vivir', 'yaşamak'], ['pedir', 'istemek, rica etmek'],
  ],
}

interface Question {
  verb: Verb
  tense: Tense
  person: number
  forms: string[]
  /** Asked in a sentence instead (Spanish, when a checked one exists). */
  sentence?: TenseSentence
}

interface Answer {
  ok: boolean
  near: boolean
  /** Another tense's or person's form of the same verb. */
  form: boolean
  typed: string
}

/** Questions spread over the chosen tenses; irregular forms come up a little more often. */
function buildRound(verbs: Verb[], tenses: Tense[], n: number, rng: Rng, weak?: Tense): Question[] {
  const out: Question[] = []
  const pool = shuffle(verbs, rng)
  for (let i = 0; out.length < n && i < n * 6; i++) {
    const verb = pool[i % pool.length]
    const own = tenses.filter((t) => tensesOf(verb).includes(t))
    if (!own.length) continue
    // The weakest tense (from past answers) comes up more often; the rest take turns.
    const want = weak && tenses.includes(weak) && rng() < 0.4 ? weak : tenses[out.length % tenses.length]
    const tense = own.includes(want) ? want : pick(own, rng)
    const forms = conjugateTense(verb, tense)!
    const odd = irregularForms(verb, tense)
    // Vosotros stays out for learners of Latin American Spanish (Ayarlar → Sorular).
    const all = [0, 1, 2, 3, 4, 5].filter((p) => !(verb.language === 'es' && prefs.hideVosotros && p === 4))
    const irregular = all.filter((p) => odd[p])
    const people = irregular.length && rng() < 0.6 ? irregular : all
    const person = pick(people, rng)
    if (out.some((q) => q.verb.lemma === verb.lemma && q.tense === tense && q.person === person)) continue
    const sentence = tenseSentence(verb, tense)
    out.push({ verb, tense, person, forms, sentence: sentence && rng() < 0.5 ? sentence : undefined })
  }
  return out
}

/**
 * Conjugation drill: a verb, a person and a tense; the learner types the form. The learner picks
 * the tenses; the round uses their own verbs (the most common verbs when they have few). After
 * each answer the whole tense is shown with the asked form marked, so one question teaches six.
 * Practice: XP, no schedule.
 */
export function ConjugationGame({ language, vocabulary, states, best, bestAspect, recordKey, startWithAspect, onExit }: Props & { language: 'fr' | 'es'; best?: number; bestAspect?: number; recordKey: string; startWithAspect?: boolean; onExit: () => void }) {
  const ready = useTenses(language)
  const [aspect, setAspect] = useState(!!startWithAspect)
  const weak = weakestTense(useTenseStats(language, vocabulary))
  const ownVerbs = useMemo<Verb[]>(
    () => (ready ? vocabulary.filter((v) => v.partOfSpeech === 'verb' && tensesOf(v).length > 1).map((v) => ({ ...v, gloss: v.senses[0].gloss, entry: v })) : []),
    [vocabulary, ready],
  )
  const common = useMemo<Verb[]>(
    () => (ready ? COMMON[language].map(([lemma, gloss]) => ({ language, lemma, partOfSpeech: 'verb' as const, gloss })).filter((v) => tensesOf(v).length > 1) : []),
    [language, ready],
  )
  const [source, setSource] = useState<'own' | 'common'>('own')
  const [chosen, setChosen] = useState<Tense[]>(() => (TENSES[language] as Tense[]).filter((t) => t !== 'present' && t !== 'presente'))
  const [phase, setPhase] = useState<'intro' | 'play' | 'over'>('intro')
  const [round, setRound] = useState<Question[]>([])
  const [index, setIndex] = useState(0)
  const [typed, setTyped] = useState('')
  const [answer, setAnswer] = useState<Answer | null>(null)
  const [results, setResults] = useState<(Answer & { q: Question })[]>([])
  const [record, setRecord] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const started = useRef(0)
  const q = round[index]
  const useOwn = source === 'own' && ownVerbs.length >= CONJ_MIN_VERBS
  const verbs = useOwn ? ownVerbs : common

  const toggle = (t: Tense) => setChosen((c) => (c.includes(t) ? (c.length > 1 ? c.filter((x) => x !== t) : c) : (TENSES[language] as Tense[]).filter((x) => x === t || c.includes(x))))

  const start = () => {
    setRound(buildRound(verbs, chosen, ROUND, createRng(Date.now()), weak?.tense))
    setIndex(0)
    setResults([])
    setTyped('')
    setAnswer(null)
    setRecord(false)
    setPhase('play')
    started.current = performance.now()
  }

  const check = () => {
    if (!q || answer || !typed.trim()) return
    const accepted = q.sentence
      ? [q.sentence.form, ...tenseVariants(language, q.sentence.form)]
      : answersFor(q.verb, q.tense, q.person)
    const others = tensesOf(q.verb).flatMap((t) => conjugateTense(q.verb, t) ?? [])
    const r = checkTyped(typed, accepted, { language, confusables: [], familyForms: others.filter((f) => !accepted.includes(f)) })
    const a: Answer = { ok: r.verdict === 'correct', near: r.verdict === 'near', form: r.errorType === 'form', typed: typed.trim() }
    if (a.ok) sfx.correct()
    else sfx.wrong()
    setAnswer(a)
    setResults((rs) => [...rs, { ...a, q }])
    if (q.verb.entry)
      void recordPractice(q.verb.entry, states.find((s) => s.entryId === q.verb.entry!.id), 'conjugation', a.ok, performance.now() - started.current, {
        given: a.typed,
        expected: q.sentence ? q.sentence.form : q.forms[q.person],
      })
  }

  const next = () => {
    setAnswer(null)
    setTyped('')
    started.current = performance.now()
    if (index + 1 < round.length) {
      setIndex(index + 1)
      requestAnimationFrame(() => input.current?.focus())
      return
    }
    // The round ends at once, so nothing can be answered again while the record is saved.
    setPhase('over')
    sfx.levelUp()
    const pct = Math.round((results.filter((r) => r.ok).length / round.length) * 100)
    if (isPctRecord(pct, best)) void db.saveRecord(recordKey, pct).then(() => setRecord(true))
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase === 'play' && answer && e.key === 'Enter') {
        e.preventDefault()
        next()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const missed = results.filter((r) => !r.ok)

  return (
    <div className="stack conj-game">
      <div className="game-top">
        <button className="link" onClick={onExit}>
          ← Oyunlar
        </button>
        {phase === 'play' && (
          <span className="game-timer">
            {index + 1} / {round.length}
          </span>
        )}
        <span className="small muted">{aspect ? (bestAspect ? `Rekor: %${bestAspect}` : '') : best ? `Rekor: %${best}` : ''}</span>
      </div>

      {aspect && <AspectGame language={language} vocabulary={vocabulary} states={states} best={bestAspect} recordKey={`aspect:${language}`} onBack={startWithAspect ? onExit : () => setAspect(false)} />}

      {!aspect && phase === 'intro' && (
        <div className="stack">
          <h1 className="greeting">Çekim antrenmanı</h1>
          <p className="muted">Bir fiil, bir kişi, bir zaman: çekimini yazarsın. Her cevaptan sonra o zamanın bütün çekimi görünür; kuralın dışındaki biçimler daha sık gelir.</p>
          <div className="stack gap-2">
            <p className="prompt-label">Zamanlar</p>
            {/* Grouped as on the word page, each tense with its Turkish meaning. */}
            <div className="conj-tense-groups">
              {TENSE_GROUPS.map((g) => {
                const own = g.tenses.filter((t) => (TENSES[language] as Tense[]).includes(t))
                return (
                  <div key={g.label} className="conj-tense-group" role="group" aria-label={g.label}>
                    <span className="conj-tense-group-label">{g.label}</span>
                    <div className="conj-tenses">
                      {own.map((t) => (
                        <button key={t} type="button" className="chip conj-tense-chip" aria-pressed={chosen.includes(t)} onClick={() => toggle(t)}>
                          <span lang={language}>{TENSE_GUIDE[t].name}</span>
                          <span className="conj-tense-tr">{TENSE_GUIDE[t].tr}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
            {weak && chosen.includes(weak.tense) && (
              <p className="small notice">
                Son cevaplarına göre en çok <strong lang={language}>{TENSE_GUIDE[weak.tense].name}</strong> zorluyor ({weak.correct}/{weak.correct + weak.wrong} doğru); bu turda daha sık gelecek.
              </p>
            )}
          </div>
          <div className="stack gap-2">
            <p className="prompt-label">Fiiller</p>
            <div className="segmented" role="tablist" aria-label="Fiiller">
              <button role="tab" className="segmented-btn" aria-selected={useOwn} disabled={ownVerbs.length < CONJ_MIN_VERBS} onClick={() => setSource('own')}>
                Benim fiillerim{ownVerbs.length ? ` (${ownVerbs.length})` : ''}
              </button>
              <button role="tab" className="segmented-btn" aria-selected={!useOwn} onClick={() => setSource('common')}>
                En sık {common.length} fiil
              </button>
            </div>
            {ownVerbs.length < CONJ_MIN_VERBS && <p className="small muted">Listende {CONJ_MIN_VERBS} fiil olunca kendi fiillerinle de oynayabilirsin.</p>}
          </div>
          <div className="row">
            <button className="btn btn-lg" onClick={start} autoFocus disabled={!ready || verbs.length === 0}>
              {ready ? `${ROUND} soruluk tura başla` : 'Çekimler yükleniyor…'}
            </button>
          </div>
          <section className="card aspect-card">
            <div className="stack gap-xs">
              <strong>
                Hangi geçmiş zaman? <span className="muted" lang={language}>{language === 'fr' ? 'passé composé / imparfait' : 'indefinido / imperfecto'}</span>
              </strong>
              <p className="small muted">
                Öğrencilerin en çok karıştırdığı ayrım. Cümledeki zaman ifadesine bakıp iki biçimden uyanı seçersin ({language === 'fr' ? 'hier, autrefois, tous les jours' : 'ayer, cuando era niño, todos los días'}).
              </p>
            </div>
            <button className="btn btn-quiet" onClick={() => setAspect(true)} disabled={!ready}>
              Bu turu oyna
            </button>
          </section>
        </div>
      )}

      {!aspect && phase === 'play' && q && (
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault()
            check()
          }}
        >
          <p className="prompt-label">
            <span lang={language}>{TENSE_GUIDE[q.tense].name}</span> · {TENSE_GUIDE[q.tense].tr}
          </p>
          {q.sentence ? (
            <>
              <p className="muted conj-gloss">
                <span lang={language}>{q.verb.lemma}</span> · {q.verb.gloss}
              </p>
              <div lang={language}>
                <Sentence text={q.sentence.text} translation={answer ? q.sentence.translation : undefined} lang={language} />
              </div>
            </>
          ) : (
            <>
              <p className="prompt-text" lang={language}>
                {subjectLabel(language, q.tense, q.person)} · {q.verb.lemma}
              </p>
              <p className="muted conj-gloss">{q.verb.gloss}</p>
            </>
          )}
          <input
            ref={input}
            className={`input answer-input${answer ? (answer.ok ? ' is-correct' : ' is-wrong') : ''}`}
            value={typed}
            onChange={accentChange(language, setTyped)}
            lang={language}
            autoFocus
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            disabled={!!answer}
            aria-label="Cevap"
            placeholder="Çekimi yaz"
          />
          <AccentBar language={language} disabled={!!answer} onInsert={(ch) => input.current && setTyped(insertAt(input.current, ch))} />
          {answer ? (
            <div className={`accent-result is-${answer.ok ? 'correct' : answer.near ? 'accent' : 'wrong'}`} >
              <p className="small" role="status">
                {answer.ok
                  ? 'Doğru!'
                  : answer.form
                    ? (formFeedback(q.verb, q.tense, answer.typed) ?? `“${answer.typed}” bu fiilin başka bir kişi ya da zaman biçimi.`)
                    : answer.near
                      ? 'Neredeyse: harflerden ya da aksandan biri farklı.'
                      : `Sen “${answer.typed}” yazdın.`}
                {!answer.ok && (
                  <>
                    {' '}
                    Doğrusu: <strong lang={language}>{q.sentence ? q.sentence.form.toLocaleLowerCase(language) : q.forms[q.person]}</strong>
                  </>
                )}
              </p>
              <table className="conj-table conj-mini" lang={language}>
                <tbody>
                  {q.forms.map((f, i) => (
                    <tr key={i} className={(q.sentence ? normalize(f) === normalize(q.sentence.form) : i === q.person) ? 'is-asked' : undefined}>
                      <th scope="row">{subjectLabel(language, q.tense, i)}</th>
                      <td>{f}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="small muted">{TENSE_GUIDE[q.tense].short}</p>
              {canSpeak() && (
                <div>
                  <button
                    type="button"
                    className="btn btn-quiet btn-sm"
                    onClick={() => speak(q.sentence ? q.sentence.text.replace('___', q.sentence.form) : withSubject(language, q.tense, q.person, q.forms[q.person]), language)}
                  >
                    <SpeakerIcon size={15} /> Dinle
                  </button>
                </div>
              )}
              <div className="row">
                <button type="button" className="btn" onClick={() => next()} autoFocus>
                  Devam
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
      )}

      {!aspect && phase === 'over' && (
        <GameResult
          record={record}
          title={record ? 'Yeni rekor!' : 'Tur bitti'}
          headline={`${round.length - missed.length} / ${round.length} doğru`}
          accuracy={round.length ? (round.length - missed.length) / round.length : 0}
          stats={chosen
            .map((t) => ({ t, rs: results.filter((r) => r.q.tense === t) }))
            .filter((x) => x.rs.length)
            .map(({ t, rs }) => ({ label: TENSE_GUIDE[t].name, value: `${rs.filter((r) => r.ok).length}/${rs.length}` }))}
          missed={missed.map((m) => (m.q.sentence ? m.q.sentence.form.toLocaleLowerCase(language) : withSubject(language, m.q.tense, m.q.person, m.q.forms[m.q.person])))}
          missedLabel="Doğru biçimleri"
          language={language}
          onAgain={start}
          onExit={onExit}
        />
      )}
    </div>
  )
}
