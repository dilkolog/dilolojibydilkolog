import '../../lazy.css'
import { useEffect, useMemo, useState } from 'react'
import { irregularVerbs, phrasalVerbs } from '../../data/englishVerbs'
import { db } from '../../data/instance'
import { formRight, formsText, irregularRound, phrasalRound, VERB_ROUND, type IrregularVerb, type PhrasalQuestion } from '../../engine/englishVerbs'
import type { GrammarLog } from '../../engine/grammar'
import { createRng } from '../../engine/rng'
import { GameResult } from '../games/GameResult'
import { noteIn } from '../games/logNote'
import { PageHeader } from '../PageHeader'
import { recordVisit } from '../screenUsage'
import { sfx } from '../sounds'
import { canSpeak, speak } from '../speech'
import { useTabIndicator } from '../useTabIndicator'
import { SpeakerIcon } from '../icons'

const note = noteIn(() => db.getEnVerbLog(), (log) => db.saveEnVerbLog(log))

type Part = 'irregular' | 'phrasal'
type Mode = 'list' | 'quiz'

/**
 * The English verb lab: no tables (English conjugates simply), but the two things in verbs that cost a Turkish
 * speaker most: the irregular forms (go – went – gone) and phrasal verbs (give up). Each has a list to look
 * through and a short round to practise; what was missed comes back sooner.
 */
export function EnglishVerbs() {
  const [part, setPart] = useState<Part>('irregular')
  const [mode, setMode] = useState<Mode>('list')
  const tabsRef = useTabIndicator(part)
  useEffect(() => recordVisit(`verbs:en:${part}:${mode}`), [part, mode])
  return (
    <div className="stack">
      <PageHeader art="write" title="Fiil laboratuvarı" sub="İngilizce fiillerin çekimi basit; asıl zor olan düzensiz fiiller ve phrasal verb'ler." />
      <div className="page-tabs ind-line" role="tablist" aria-label="Bölüm" ref={tabsRef}>
        <button role="tab" className="page-tab" aria-selected={part === 'irregular'} onClick={() => setPart('irregular')}>
          Düzensiz fiiller
        </button>
        <button role="tab" className="page-tab" aria-selected={part === 'phrasal'} onClick={() => setPart('phrasal')}>
          Phrasal verbs
        </button>
      </div>
      <div className="choice-row" role="group" aria-label="Görünüm">
        <button type="button" className="chip" aria-pressed={mode === 'list'} onClick={() => setMode('list')}>
          Liste
        </button>
        <button type="button" className="chip" aria-pressed={mode === 'quiz'} onClick={() => setMode('quiz')}>
          Alıştır
        </button>
      </div>
      {mode === 'list' ? part === 'irregular' ? <IrregularList /> : <PhrasalList /> : part === 'irregular' ? <IrregularQuiz onExit={() => setMode('list')} /> : <PhrasalQuiz onExit={() => setMode('list')} />}
    </div>
  )
}

const Say = ({ text }: { text: string }) =>
  canSpeak() ? (
    <button type="button" className="icon-btn icon-btn-sm" aria-label={`Dinle: ${text}`} onClick={() => speak(text, 'en')}>
      <SpeakerIcon size={15} />
    </button>
  ) : null

const includes = (text: string, q: string) => text.toLowerCase().includes(q.trim().toLowerCase())

function IrregularList() {
  const [q, setQ] = useState('')
  const rows = useMemo(() => irregularVerbs.filter((v) => !q.trim() || includes(v.base, q) || includes(v.tr, q) || v.past.some((p) => includes(p, q)) || v.pp.some((p) => includes(p, q))), [q])
  return (
    <section className="card stack">
      <input className="input" type="search" lang="tr" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ara: go, gitmek, went…" aria-label="Düzensiz fiillerde ara" />
      <p className="small muted">{rows.length} / {irregularVerbs.length} fiil</p>
      <div className="enverb-table-wrap">
        <table className="enverb-table">
          <thead>
            <tr>
              <th scope="col">Yalın</th>
              <th scope="col">Past simple</th>
              <th scope="col">Past participle</th>
              <th scope="col">Anlamı</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((v) => (
              <tr key={v.id}>
                <th scope="row" lang="en">
                  {v.base} <Say text={`${v.base}, ${v.past[0]}, ${v.pp[0]}`} />
                </th>
                <td lang="en">{formsText(v.past)}</td>
                <td lang="en">{formsText(v.pp)}</td>
                <td lang="tr" className="muted">
                  {v.tr}
                  <span className="enverb-example">
                    <span lang="en">
                      {v.text} <Say text={v.text} />
                    </span>
                    <span lang="tr">{v.textTr}</span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && <p className="muted">Bu aramayla fiil bulunamadı.</p>}
    </section>
  )
}

function PhrasalList() {
  const [q, setQ] = useState('')
  const rows = useMemo(() => phrasalVerbs.filter((v) => !q.trim() || includes(v.phrasal, q) || includes(v.tr, q)), [q])
  return (
    <section className="card stack">
      <input className="input" type="search" lang="tr" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ara: give up, vazgeçmek…" aria-label="Phrasal verb'lerde ara" />
      <p className="small muted">{rows.length} / {phrasalVerbs.length} phrasal verb</p>
      <ul className="plain stack enverb-phrasals">
        {rows.map((v) => (
          <li key={v.id} className="enverb-phrasal">
            <p>
              <strong lang="en">{v.phrasal}</strong> <span lang="tr">· {v.tr}</span>
            </p>
            <p className="small muted" lang="en">
              {v.text} <Say text={v.text} />
            </p>
            <p className="small muted" lang="tr">
              {v.textTr}
            </p>
          </li>
        ))}
      </ul>
      {rows.length === 0 && <p className="muted">Bu aramayla phrasal verb bulunamadı.</p>}
    </section>
  )
}

function useLog(refresh: unknown) {
  const [log, setLog] = useState<GrammarLog | null>(null)
  useEffect(() => {
    let live = true
    void db.getEnVerbLog().then((l) => live && setLog(l))
    return () => {
      live = false
    }
  }, [refresh])
  return log
}

function IrregularQuiz({ onExit }: { onExit: () => void }) {
  const [phase, setPhase] = useState<'intro' | 'play' | 'over'>('intro')
  const log = useLog(phase)
  const [round, setRound] = useState<IrregularVerb[]>([])
  const [index, setIndex] = useState(0)
  const [past, setPast] = useState('')
  const [pp, setPp] = useState('')
  const [checked, setChecked] = useState<{ past: boolean; pp: boolean } | null>(null)
  const [results, setResults] = useState<{ v: IrregularVerb; ok: boolean }[]>([])
  const v = round[index]

  const start = () => {
    setRound(irregularRound(irregularVerbs, log ?? {}, createRng(Date.now())))
    setIndex(0)
    setResults([])
    setPast('')
    setPp('')
    setChecked(null)
    setPhase('play')
  }

  const check = () => {
    const res = { past: formRight(past, v.past), pp: formRight(pp, v.pp) }
    const ok = res.past && res.pp
    if (ok) sfx.correct()
    else sfx.wrong()
    setChecked(res)
    setResults((r) => [...r, { v, ok }])
    void note(v.id, ok)
  }

  const next = () => {
    if (index + 1 < round.length) {
      setIndex(index + 1)
      setPast('')
      setPp('')
      setChecked(null)
      return
    }
    sfx.levelUp()
    setPhase('over')
  }

  if (phase === 'over') {
    const missed = results.filter((r) => !r.ok)
    return (
      <GameResult
        title="Tur bitti"
        headline={`${round.length - missed.length} / ${round.length} doğru`}
        accuracy={round.length ? (round.length - missed.length) / round.length : 0}
        missed={missed.map((m) => `${m.v.base} – ${formsText(m.v.past)} – ${formsText(m.v.pp)}`)}
        missedLabel="Tekrar bakmaya değer"
        language="en"
        onAgain={start}
        onExit={onExit}
      />
    )
  }

  if (phase === 'intro' || !v)
    return (
      <section className="card stack">
        <h2 className="section-title">Düzensiz fiil turu</h2>
        <p className="muted">Yalın hâli ve Türkçesi verilir; past simple ve past participle biçimlerini yaz. İki biçim de doğruysa soru doğru sayılır. Yanlışlar daha sık sorulur.</p>
        <p className="small muted">{irregularVerbs.length} fiil var.</p>
        <div className="row">
          <button className="btn btn-lg" onClick={start} disabled={!log} autoFocus>
            {VERB_ROUND} soruluk tura başla
          </button>
        </div>
      </section>
    )

  return (
    <form
      className="card stack enverb-quiz"
      onSubmit={(e) => {
        e.preventDefault()
        if (checked) next()
        else if (past.trim() && pp.trim()) check()
      }}
    >
      <p className="small muted">
        {index + 1} / {round.length}
      </p>
      <p className="prompt-label">
        <strong lang="en">{v.base}</strong> <span lang="tr">· {v.tr}</span> <Say text={v.base} />
      </p>
      <label className="field">
        <span className="small">Past simple</span>
        <input className="input" lang="en" value={past} onChange={(e) => setPast(e.target.value)} readOnly={!!checked} autoFocus autoCapitalize="off" autoCorrect="off" spellCheck={false} />
      </label>
      <label className="field">
        <span className="small">Past participle</span>
        <input className="input" lang="en" value={pp} onChange={(e) => setPp(e.target.value)} readOnly={!!checked} autoCapitalize="off" autoCorrect="off" spellCheck={false} />
      </label>
      {checked && (
        <p role="status" className={checked.past && checked.pp ? 'notice' : 'cross-warn'}>
          {checked.past && checked.pp ? 'Doğru. ' : 'Doğrusu: '}
          <strong lang="en">
            {v.base} – {formsText(v.past)} – {formsText(v.pp)}
          </strong>{' '}
          <Say text={`${v.base}, ${v.past[0]}, ${v.pp[0]}`} />
        </p>
      )}
      {checked && (
        <p className="enverb-example">
          <span lang="en">
            {v.text} <Say text={v.text} />
          </span>
          <span lang="tr" className="muted">
            {v.textTr}
          </span>
        </p>
      )}
      <div className="row">
        <button type="submit" className="btn" disabled={!checked && (!past.trim() || !pp.trim())}>
          {checked ? 'Devam' : 'Kontrol et'}
        </button>
      </div>
    </form>
  )
}

function PhrasalQuiz({ onExit }: { onExit: () => void }) {
  const [phase, setPhase] = useState<'intro' | 'play' | 'over'>('intro')
  const log = useLog(phase)
  const [round, setRound] = useState<PhrasalQuestion[]>([])
  const [index, setIndex] = useState(0)
  const [given, setGiven] = useState<string | null>(null)
  const [results, setResults] = useState<{ q: PhrasalQuestion; ok: boolean }[]>([])
  const q = round[index]

  const start = () => {
    setRound(phrasalRound(phrasalVerbs, log ?? {}, createRng(Date.now())))
    setIndex(0)
    setResults([])
    setGiven(null)
    setPhase('play')
  }

  const choose = (option: string) => {
    if (!q || given) return
    const ok = option === q.answer
    if (ok) sfx.correct()
    else sfx.wrong()
    setGiven(option)
    setResults((r) => [...r, { q, ok }])
    void note(q.id, ok)
  }

  const next = () => {
    if (index + 1 < round.length) {
      setIndex(index + 1)
      setGiven(null)
      return
    }
    sfx.levelUp()
    setPhase('over')
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== 'play' || !q) return
      const n = Number(e.key)
      if (!given && n >= 1 && n <= q.options.length) choose(q.options[n - 1])
      else if (given && e.key === 'Enter') {
        e.preventDefault()
        next()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (phase === 'over') {
    const missed = results.filter((r) => !r.ok)
    return (
      <GameResult
        title="Tur bitti"
        headline={`${round.length - missed.length} / ${round.length} doğru`}
        accuracy={round.length ? (round.length - missed.length) / round.length : 0}
        missed={missed.map((m) => `${m.q.verb.phrasal} = ${m.q.verb.tr}`)}
        missedLabel="Tekrar bakmaya değer"
        language="en"
        onAgain={start}
        onExit={onExit}
      />
    )
  }

  if (phase === 'intro' || !q)
    return (
      <section className="card stack">
        <h2 className="section-title">Phrasal verb turu</h2>
        <p className="muted">Kimi sorularda phrasal verb’in anlamını, kimilerinde eksik edatı (give ___) seçersin. Yanlışlar daha sık sorulur.</p>
        <p className="small muted">{phrasalVerbs.length} phrasal verb var.</p>
        <div className="row">
          <button className="btn btn-lg" onClick={start} disabled={!log} autoFocus>
            {VERB_ROUND} soruluk tura başla
          </button>
        </div>
      </section>
    )

  const [head] = q.verb.phrasal.split(' ')
  return (
    <section className="card stack enverb-quiz">
      <p className="small muted">
        {index + 1} / {round.length}
      </p>
      {q.kind === 'meaning' ? (
        <p className="prompt-label">
          <strong lang="en">“{q.verb.phrasal}”</strong> ne demek?
        </p>
      ) : (
        <p className="prompt-label">
          <strong lang="en">{head} ___</strong> <span lang="tr">· {q.verb.tr}</span>
        </p>
      )}
      <div className="options" role="group" aria-label="Seçenekler">
        {q.options.map((o, i) => (
          <button key={o} type="button" className={`option${given ? (o === q.answer ? ' is-correct' : given === o ? ' is-wrong' : ' is-dim') : ''}`} disabled={!!given} onClick={() => choose(o)}>
            <span className="key">{i + 1}</span>
            <span className="option-serif" lang={q.kind === 'meaning' ? 'tr' : 'en'}>
              {o}
            </span>
          </button>
        ))}
      </div>
      {given && (
        <div className="stack" role="status">
          <p className={given === q.answer ? 'notice' : 'cross-warn'}>
            <strong lang="en">{q.verb.phrasal}</strong> = {q.verb.tr}
          </p>
          <p className="small muted" lang="en">
            {q.verb.text} <Say text={q.verb.text} />
          </p>
          <p className="small muted" lang="tr">
            {q.verb.textTr}
          </p>
          <div className="row">
            <button type="button" className="btn" onClick={next} autoFocus>
              Devam
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
