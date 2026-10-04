import { useEffect, useMemo, useRef, useState } from 'react'
import { GameResult } from './GameResult'
import { normalize } from '../../engine/answerCheck'
import { createRng, shuffle } from '../../engine/rng'
import { TENSE_GUIDE } from '../../engine/tenseGuide'
import { aspectItems, type AspectItem, type Tense } from '../../engine/tenses'
import type { UserWordState, VocabularyEntry } from '../../engine/types'
import { db } from '../../data/instance'
import { useTenses } from '../ConjugationTable'
import { CheckIcon, CloseIcon } from '../icons'
import { sfx } from '../sounds'
import { isPctRecord, recordPractice } from './shared'

const ROUND = 10

/** The two past tenses the choice is between, in each language. */
export const ASPECT_PAIR: Record<'fr' | 'es', [Tense, Tense]> = { fr: ['passe-compose', 'imparfait'], es: ['preterito', 'imperfecto'] }

interface Question extends AspectItem {
  options: string[]
  entry?: VocabularyEntry
}

const capitalize = (s: string) => s.charAt(0).toLocaleUpperCase() + s.slice(1)

/**
 * Passé composé or imparfait (indefinido or imperfecto): a sentence, two forms of the verb, one
 * fits. Every sentence carries time words that settle it, so the cue is learned with the form
 * (contrasting the two side by side teaches the difference better than each alone). The learner's
 * own verbs come first, alternating the two tenses.
 */
export function AspectGame({
  language,
  vocabulary,
  states,
  best,
  recordKey,
  onBack,
}: {
  language: 'fr' | 'es'
  vocabulary: VocabularyEntry[]
  states: UserWordState[]
  best?: number
  recordKey: string
  onBack: () => void
}) {
  const ready = useTenses(language)
  const pair = ASPECT_PAIR[language]
  const [phase, setPhase] = useState<'play' | 'over'>('play')
  const [round, setRound] = useState<Question[]>([])
  const [index, setIndex] = useState(0)
  const [chosen, setChosen] = useState<string | null>(null)
  const [results, setResults] = useState<{ q: Question; ok: boolean }[]>([])
  const [record, setRecord] = useState(false)
  const started = useRef(0)
  const own = useMemo(() => new Map(vocabulary.filter((v) => v.partOfSpeech === 'verb').map((v) => [normalize(v.lemma), v])), [vocabulary])

  const start = () => {
    const rng = createRng(Date.now())
    const all = shuffle(aspectItems(language), rng)
    // Own verbs first; the two tenses take turns.
    const sorted = [...all.filter((a) => own.has(a.verb)), ...all.filter((a) => !own.has(a.verb))]
    const picked: AspectItem[] = []
    for (let i = 0; picked.length < ROUND && i < ROUND * 4; i++) {
      const want = pair[picked.length % 2]
      const item = sorted.find((a) => a.tense === want && !picked.includes(a) && !picked.some((p) => p.verb === a.verb))
      if (item) picked.push(item)
      else break
    }
    setRound(
      picked.map((a) => {
        const atStart = a.text.startsWith('___')
        const options = shuffle([a.form.toLocaleLowerCase(language), a.other], rng).map((o) => (atStart ? capitalize(o) : o))
        return { ...a, options, entry: own.get(a.verb) }
      }),
    )
    setIndex(0)
    setResults([])
    setChosen(null)
    setRecord(false)
    setPhase('play')
    started.current = performance.now()
  }

  useEffect(() => {
    window.scrollTo({ top: 0 })
  }, [])
  useEffect(() => {
    if (ready) start()
    // A new round once the tables are there.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready])

  const q = round[index]
  const right = q && q.options.find((o) => normalize(o) === normalize(q.form))!

  const choose = (option: string) => {
    if (!q || chosen) return
    const ok = option === right
    if (ok) sfx.correct()
    else sfx.wrong()
    setChosen(option)
    setResults((r) => [...r, { q, ok }])
    if (q.entry) void recordPractice(q.entry, states.find((s) => s.entryId === q.entry!.id), 'conjugation', ok, performance.now() - started.current, { given: option, expected: q.form })
  }

  const next = () => {
    setChosen(null)
    started.current = performance.now()
    if (index + 1 < round.length) return setIndex(index + 1)
    setPhase('over')
    sfx.levelUp()
    const pct = Math.round((results.filter((r) => r.ok).length / round.length) * 100)
    if (isPctRecord(pct, best)) void db.saveRecord(recordKey, pct).then(() => setRecord(true))
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== 'play' || !q) return
      if (!chosen && (e.key === '1' || e.key === '2')) choose(q.options[Number(e.key) - 1])
      else if (chosen && e.key === 'Enter') {
        e.preventDefault()
        next()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!ready) return <p className="muted">Cümleler yükleniyor…</p>
  if (phase === 'over')
    return (
      <GameResult
        record={record}
        title={record ? 'Yeni rekor!' : 'Tur bitti'}
        headline={`${results.filter((r) => r.ok).length} / ${round.length} doğru`}
        accuracy={round.length ? results.filter((r) => r.ok).length / round.length : 0}
        stats={pair.map((t) => {
          const rs = results.filter((r) => r.q.tense === t)
          return { label: TENSE_GUIDE[t].name, value: `${rs.filter((r) => r.ok).length}/${rs.length}` }
        })}
        missed={results.filter((r) => !r.ok).map((r) => `${r.q.cue} → ${r.q.form.toLocaleLowerCase(language)}`)}
        missedLabel="İpucu ve doğru biçim"
        language={language}
        onAgain={start}
        onExit={onBack}
      />
    )
  if (!q) return <p className="muted">Bu dilde henüz yeterli cümle yok.</p>

  const guide = TENSE_GUIDE[q.tense]
  const [before, after] = q.text.split('___')
  const lemma = q.entry ? q.entry.lemma : q.verb
  return (
    <div className="stack aspect-game">
      <h1 className="greeting">Hangi geçmiş zaman?</h1>
      <p className="prompt-label">
        <span lang={language}>{TENSE_GUIDE[pair[0]].name}</span> mı, <span lang={language}>{TENSE_GUIDE[pair[1]].name}</span> mı?
        <span className="muted"> · {index + 1} / {round.length}</span>
      </p>
      <p className="muted conj-gloss">
        <span lang={language}>{lemma}</span>
        {q.entry && ` · ${q.entry.senses[0].gloss}`}
      </p>
      <p className="sentence" lang={language}>
        {chosen ? <Cue text={before} cue={q.cue} /> : before}
        <span className={`blank${chosen ? (chosen === right ? ' is-filled is-correct' : ' is-filled is-wrong') : ''}`}>{chosen ? right : '____'}</span>
        {chosen ? <Cue text={after} cue={q.cue} /> : after}
      </p>
      <div className="options aspect-options">
        {q.options.map((o, i) => (
          <button
            key={o}
            className={`option${chosen ? (o === right ? ' is-correct' : o === chosen ? ' is-wrong' : ' is-dim') : ''}`}
            disabled={!!chosen}
            onClick={() => choose(o)}
          >
            <span className="key">{chosen && o === right ? <CheckIcon size={14} /> : chosen && o === chosen ? <CloseIcon size={14} /> : i + 1}</span>
            <span className="option-serif" lang={language}>
              {o}
            </span>
          </button>
        ))}
      </div>
      {chosen && (
        <div className={`accent-result is-${chosen === right ? 'correct' : 'wrong'}`}>
          <p className="small">
            {chosen === right ? 'Doğru!' : 'Bu cümle öbürünü istiyor.'} <strong lang={language}>“{q.cue}”</strong> → <strong lang={language}>{guide.name}</strong>: {guide.short}
          </p>
          {q.translation && <p className="small muted">{q.translation}</p>}
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

/** After answering, the time words that settled it are marked in the sentence. */
function Cue({ text, cue }: { text: string; cue: string }) {
  const i = text.toLocaleLowerCase().indexOf(cue.toLocaleLowerCase())
  if (i < 0) return <>{text}</>
  return (
    <>
      {text.slice(0, i)}
      <mark className="aspect-cue">{text.slice(i, i + cue.length)}</mark>
      {text.slice(i + cue.length)}
    </>
  )
}
