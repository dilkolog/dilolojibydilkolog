import { useEffect, useMemo, useRef, useState } from 'react'
import { buildTest, scoreTest, TEST_KIND_NAME, wordsOf, type TestKind, type TestQuestion } from '../../engine/practiceTest'
import { displayForm, evaluateTyped } from '../../engine/exercises'
import { createRng, shuffle } from '../../engine/rng'
import { selectStudyWords } from '../../engine/studySet'
import type { VocabularyEntry } from '../../engine/types'
import { scheduler } from '../../data/instance'
import { SAMPLE_WORDS } from '../../data/seed'
import { AccentBar } from '../AccentBar'
import { accentChange, insertAt } from '../accentCaret'
import { LANGUAGE_NAME } from '../labels'
import { sfx } from '../sounds'
import { StudyOptionsPanel } from '../StudyOptions'
import { useStudyOptions } from '../studyOptionsStore'
import { GameResult } from './GameResult'
import { type Props, recordPractice } from './shared'
import { saveListTest } from '../listTests'

const KINDS: TestKind[] = ['choice', 'typed', 'truefalse', 'match']
const KINDS_KEY = 'diloloji:test-kinds'

function loadKinds(): TestKind[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KINDS_KEY) ?? 'null') as TestKind[] | null
    const ok = (raw ?? []).filter((k) => KINDS.includes(k))
    return ok.length ? ok : KINDS
  } catch {
    return KINDS
  }
}

const KIND_ICONS: Record<TestKind, string> = {
  choice: '🔘',
  typed: '⌨️',
  truefalse: '⚖️',
  match: '🧩',
}

/**
 * A practice test of the learner's own words: the set, how many questions and which kinds (multiple
 * choice, typing, true/false, matching) are chosen first; at the end the score by kind and the words
 * missed, with a new test of just those. Answers are practice: they earn a little XP and never move
 * the review schedule (the monthly retention exam is the one that measures).
 */
export function PracticeTest({ language, vocabulary, states, onExit, onChanged }: Props & { onExit: () => void }) {
  const [options, setOptions] = useStudyOptions('test', { scope: 'all', size: 20 })
  const [kinds, setKinds] = useState<TestKind[]>(loadKinds)
  const pool = useMemo(() => {
    const own = new Set(vocabulary.map((v) => v.id))
    return [...vocabulary, ...SAMPLE_WORDS[language].filter((w) => !own.has(w.id))]
  }, [vocabulary, language])
  const available = useMemo(() => selectStudyWords(vocabulary, states, scheduler, new Date(), { ...options, size: 0 }, createRng(1)).length, [vocabulary, states, options])
  const stateById = useMemo(() => new Map(states.map((s) => [s.entryId, s])), [states])
  const [questions, setQuestions] = useState<TestQuestion[] | null>(null)
  const [index, setIndex] = useState(0)
  const [got, setGot] = useState<number[]>([])
  const [missedWords, setMissedWords] = useState<VocabularyEntry[]>([])

  const toggleKind = (k: TestKind) => {
    const next = kinds.includes(k) ? kinds.filter((x) => x !== k) : [...kinds, k]
    if (!next.length) return
    setKinds(next)
    try {
      localStorage.setItem(KINDS_KEY, JSON.stringify(next))
    } catch {
      /* this visit only */
    }
  }
  const begin = (words: VocabularyEntry[], rng = createRng(Date.now())) => {
    setQuestions(buildTest(words, pool, KINDS.filter((k) => kinds.includes(k)), rng))
    setIndex(0)
    setGot([])
    setMissedWords([])
  }
  // The list a whole-list test was taken on (not a retake of its misses), to show its score on the list's page.
  const testedList = useRef<string | null>(null)
  const start = () => {
    const rng = createRng(Date.now())
    testedList.current = options.scope === 'list' && options.listId ? options.listId : null
    begin(selectStudyWords(vocabulary, states, scheduler, new Date(), options, rng), rng)
  }
  const q = questions?.[index]
  const finished = !!questions && index >= questions.length
  useEffect(() => {
    if (!finished) return
    onChanged()
    if (testedList.current && questions) {
      const score = scoreTest(questions, got)
      saveListTest(testedList.current, score.total ? Math.round((score.points / score.total) * 100) : 0)
      testedList.current = null
    }
    // The score once, when the test ends.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished, onChanged])

  /** A question is over: its points are kept and the words it got wrong are remembered for the next test. */
  const done = (earned: number, wrong: VocabularyEntry[]) => {
    setGot((g) => [...g, earned])
    setMissedWords((m) => [...m, ...wrong.filter((w) => !m.some((x) => x.id === w.id))])
    setIndex((i) => i + 1)
  }
  const record = (entry: VocabularyEntry, ok: boolean, ms: number, type: 'mc_meaning' | 'typed_translation') => void recordPractice(entry, stateById.get(entry.id), type, ok, ms, undefined, { schedule: false })

  if (!questions) {
    const count = options.size > 0 ? Math.min(options.size, available) : available
    return (
      <div className="stack exam-setup-screen">
        <button className="link" onClick={onExit}>← Oyunlar</button>
        <div className="exam-hero">
          <span className="exam-kicker">📋 DENEME SINAVI</span>
          <h1 className="greeting">Deneme sınavı</h1>
          <p className="greeting-sub">Kendi kelimelerinden karışık bir sınav kur: çoktan seçmeli, yazarak, doğru/yanlış, eşleştirme. Sonunda yanlışlarınla yeni bir sınav yapabilirsin.</p>
        </div>
        <StudyOptionsPanel value={options} onChange={setOptions} language={language} vocabulary={vocabulary} states={states} directions={false}>
          <section className="study-group">
            <h2 className="study-label">Soru türleri</h2>
            <div className="choice-row" role="group" aria-label="Soru türleri">
              {KINDS.map((k) => (
                <button key={k} type="button" className="chip study-chip" aria-pressed={kinds.includes(k)} onClick={() => toggleKind(k)}>
                  <span className="study-chip-icon" aria-hidden="true">{KIND_ICONS[k]}</span>
                  <span>{TEST_KIND_NAME[k]}</span>
                </button>
              ))}
            </div>
          </section>
        </StudyOptionsPanel>
        <div className="exam-start-bar">
          <div className="exam-summary-pill">
            <span className="exam-summary-item">📚 {available} kelime havuzda</span>
            <span className="exam-summary-dot">·</span>
            <span className="exam-summary-item">🎯 {kinds.length} soru türü</span>
          </div>
          <button className="btn btn-lg exam-start-btn" disabled={available < 3} onClick={start}>
            {available < 3 ? 'Bu grupta yeterli kelime yok' : `${count} kelimelik sınavı başlat`}
          </button>
        </div>
      </div>
    )
  }

  if (finished) {
    const score = scoreTest(questions, got)
    const pct = score.total ? Math.round((score.points / score.total) * 100) : 0
    return (
      <GameResult
        title="Sınav bitti"
        headline={`%${pct}`}
        accuracy={score.total ? score.points / score.total : 0}
        stats={[
          { label: 'puan', value: `${score.points} / ${score.total}` },
          ...(Object.entries(score.byKind) as [TestKind, [number, number]][]).map(([k, [r, n]]) => ({ label: TEST_KIND_NAME[k].toLocaleLowerCase('tr'), value: `${r}/${n}` })),
        ]}
        missed={missedWords.map((w) => `${displayForm(w)} — ${w.senses[0].gloss}`)}
        language={language}
        onAgain={start}
        onExit={onExit}
      >
        {missedWords.length > 0 && (
          <button
            className="btn btn-quiet"
            onClick={() => {
              testedList.current = null
              begin(shuffle(missedWords, createRng(Date.now())))
            }}
          >
            Yanlışlarla yeni sınav ({missedWords.length})
          </button>
        )}
      </GameResult>
    )
  }

  return (
    <div className="stack practice-test">
      <div className="row justify-between">
        <button className="link" onClick={onExit}>← Bitir</button>
        <span className="small muted">{index + 1} / {questions.length}</span>
      </div>
      <TestQuestionView key={`${index}-${wordsOf(q!)[0].id}`} q={q!} language={language} pool={pool} onDone={done} onRecord={record} />
    </div>
  )
}

function TestQuestionView({
  q,
  language,
  pool,
  onDone,
  onRecord,
}: {
  q: TestQuestion
  language: Props['language']
  pool: VocabularyEntry[]
  onDone: (earned: number, wrong: VocabularyEntry[]) => void
  onRecord: (entry: VocabularyEntry, ok: boolean, ms: number, type: 'mc_meaning' | 'typed_translation') => void
}) {
  const startedAt = useRef(performance.now())
  const [result, setResult] = useState<{ ok: boolean; note?: string } | null>(null)
  const [text, setText] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const ms = () => performance.now() - startedAt.current
  const finish = (ok: boolean, note?: string) => {
    if (result) return
    if (ok) sfx.correct()
    else sfx.wrong()
    setResult({ ok, note })
  }
  const next = () => onDone(result?.ok ? 1 : 0, result?.ok ? [] : q.kind === 'match' ? [] : [q.entry])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (result && e.key === 'Enter') {
        e.preventDefault()
        next()
      } else if (!result && q.kind === 'choice') {
        const i = Number(e.key) - 1
        const o = q.exercise.options[i]
        if (o) pickChoice(o.id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const pickChoice = (id: string) => {
    if (q.kind !== 'choice' || result) return
    const ok = id === q.exercise.correctOptionId
    onRecord(q.entry, ok, ms(), 'mc_meaning')
    finish(ok, ok ? undefined : `Doğrusu: ${q.exercise.options.find((o) => o.id === q.exercise.correctOptionId)!.label}`)
  }

  if (q.kind === 'match') return <MatchQuestion q={q} language={language} onRecord={onRecord} onDone={onDone} />

  const next2 = result && (
    <div className="stack gap-2">
      <p className={result.ok ? 'notice' : 'error'} role="status">{result.ok ? 'Doğru' : result.note}</p>
      <button className="btn" onClick={next} autoFocus>Sonraki</button>
    </div>
  )

  if (q.kind === 'choice') {
    const ex = q.exercise
    return (
      <>
        <h2 className="word" lang={language}>{displayForm(q.entry)}</h2>
        <div className="options">
          {ex.options.map((o, i) => (
            <button key={o.id} className={`option${result ? (o.id === ex.correctOptionId ? ' is-correct' : ' is-dim') : ''}`} disabled={!!result} onClick={() => pickChoice(o.id)}>
              <span className="key">{i + 1}</span>
              <span>{o.label}</span>
            </button>
          ))}
        </div>
        {next2}
      </>
    )
  }

  if (q.kind === 'truefalse') {
    const s = q.statement
    const say = (said: boolean) => {
      if (result) return
      const ok = said === s.isTrue
      onRecord(q.entry, ok, ms(), 'mc_meaning')
      finish(ok, s.isTrue ? 'Bu anlam doğruydu.' : `Yanlış ifadeydi: ${displayForm(q.entry)} = ${s.truth}`)
    }
    return (
      <>
        <div className="card stack tf-card">
          <strong className="swipe-word" lang={language}>{displayForm(q.entry)}</strong>
          <p className="tf-equals" aria-hidden>=</p>
          <p className="swipe-gloss">{s.shown}</p>
        </div>
        {result ? (
          next2
        ) : (
          <div className="swipe-actions">
            <button className="btn btn-bad btn-lg" onClick={() => say(false)}>Yanlış</button>
            <button className="btn btn-ok btn-lg" onClick={() => say(true)}>Doğru</button>
          </div>
        )}
      </>
    )
  }

  const ex = q.exercise
  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault()
        if (!text.trim() || result) return
        const ev = evaluateTyped(ex, text, q.entry, pool)
        const ok = ev.verdict !== 'wrong'
        onRecord(q.entry, ok, ms(), 'typed_translation')
        finish(ok, `Doğrusu: ${ex.accepted[0]}`)
      }}
    >
      <p className="muted small">{LANGUAGE_NAME[language]} karşılığını yaz</p>
      <p className="prompt-text">{ex.prompt}</p>
      <input
        ref={input}
        className="answer-input"
        value={text}
        onChange={accentChange(language, setText)}
        disabled={!!result}
        autoFocus
        lang={language}
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="done"
        placeholder="Cevabını yaz"
      />
      {!result && <AccentBar language={language} onInsert={(ch) => input.current && setText(insertAt(input.current, ch))} />}
      {next2}
    </form>
  )
}

/** Words on the left, their meanings (shuffled) on the right: pick a word, then its meaning. A pair is worth its point only if it was matched without a wrong pick. */
function MatchQuestion({
  q,
  language,
  onRecord,
  onDone,
}: {
  q: Extract<TestQuestion, { kind: 'match' }>
  language: Props['language']
  onRecord: (entry: VocabularyEntry, ok: boolean, ms: number, type: 'mc_meaning' | 'typed_translation') => void
  onDone: (earned: number, wrong: VocabularyEntry[]) => void
}) {
  const startedAt = useRef(performance.now())
  const [picked, setPicked] = useState<string | null>(null)
  const [matched, setMatched] = useState<string[]>([])
  const [slipped, setSlipped] = useState<string[]>([])
  const all = matched.length === q.entries.length
  const pickMeaning = (id: string) => {
    if (!picked || matched.includes(id)) return
    if (picked === id) {
      setMatched((m) => [...m, id])
      sfx.correct()
    } else {
      setSlipped((s) => (s.includes(picked) ? s : [...s, picked]))
      sfx.wrong()
    }
    setPicked(null)
  }
  const finish = () => {
    const entries = q.entries
    for (const e of entries) onRecord(e, !slipped.includes(e.id), performance.now() - startedAt.current, 'mc_meaning')
    onDone(entries.length - slipped.length, entries.filter((e) => slipped.includes(e.id)))
  }
  return (
    <>
      <p className="muted small">Kelimeyi seç, sonra anlamına dokun</p>
      <div className="test-match">
        <div className="test-match-col">
          {q.entries.map((e) => (
            <button key={e.id} className={`option${picked === e.id ? ' is-picked' : ''}${matched.includes(e.id) ? ' is-done' : ''}`} disabled={matched.includes(e.id)} onClick={() => setPicked(e.id)} lang={language}>
              {displayForm(e)}
            </button>
          ))}
        </div>
        <div className="test-match-col">
          {q.meanings.map((m) => (
            <button key={m.id} className={`option${matched.includes(m.id) ? ' is-done' : ''}`} disabled={matched.includes(m.id) || !picked} onClick={() => pickMeaning(m.id)}>
              {m.label}
            </button>
          ))}
        </div>
      </div>
      {all && (
        <div className="stack gap-2">
          <p className={slipped.length ? 'error' : 'notice'} role="status">
            {slipped.length ? `${q.entries.length - slipped.length} / ${q.entries.length} ilk denemede` : 'Hepsi ilk denemede'}
          </p>
          <button className="btn" onClick={finish} autoFocus>Sonraki</button>
        </div>
      )}
    </>
  )
}

