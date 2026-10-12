import { useEffect, useState, type CSSProperties } from 'react'
import { GameResult } from './GameResult'
import { huntPool, huntRound, HUNT_ROUND, type HuntQuestion } from '../../engine/affixHunt'
import type { Affix } from '../../engine/derive'
import { recordGrammar, type GrammarLog } from '../../engine/grammar'
import { createRng } from '../../engine/rng'
import type { TargetLanguage } from '../../engine/types'
import { makeLookup } from '../../data/deriveLookup'
import { loadFrequency } from '../../data/frequency'
import { db } from '../../data/instance'
import { loadPack } from '../../data/wordpack'
import type { Pack } from '../../data/wordpackBuild'
import { LANGUAGE_NAME, POS_NAME } from '../labels'
import { sfx } from '../sounds'

/** One at a time: answers in quick succession must not overwrite each other's log. */
let writing: Promise<unknown> = Promise.resolve()
const note = (id: string, correct: boolean) => {
  writing = writing.then(async () => db.saveAffixLog(recordGrammar(await db.getAffixLog(), id, correct, new Date()))).catch(() => undefined)
  return writing
}

const label = (a: Affix) => (a.kind === 'prefix' ? `${a.form}-` : `-${a.form}`)
/** The word with the affix put on, the way it is said: un- + comfortable = uncomfortable; its pieces come in one after another. */
function Formula({ q, language }: { q: HuntQuestion; language: TargetLanguage }) {
  const affix = <span className="morph morph-suffix formula-piece" style={{ '--i': q.answer.kind === 'prefix' ? 0 : 1 } as CSSProperties}>{label(q.answer)}</span>
  const base = <span className="formula-piece" style={{ '--i': q.answer.kind === 'prefix' ? 1 : 0 } as CSSProperties}>{q.base}</span>
  return (
    <span className="formula" lang={language}>
      {q.answer.kind === 'prefix' ? affix : base}
      <span className="formula-piece muted" style={{ '--i': 2 } as CSSProperties}>+</span>
      {q.answer.kind === 'prefix' ? base : affix}
      <span className="formula-piece muted" style={{ '--i': 3 } as CSSProperties}>=</span>
      <strong className="formula-piece formula-result" style={{ '--i': 4 } as CSSProperties}>{q.word}</strong>
    </span>
  )
}

/**
 * Affix hunt: a word and its relative in Turkish; the prefix or suffix that makes it is picked
 * among three. The right one is shown put on the word, with what it does and its Turkish counterpart.
 */
export function AffixHunt({ language, onExit }: { language: TargetLanguage; onExit: () => void }) {
  const [log, setLog] = useState<GrammarLog | null>(null)
  const [data, setData] = useState<{ pack: Pack | undefined; rank: Map<string, number>; frequent: string[] } | null>(null)
  const [phase, setPhase] = useState<'intro' | 'play' | 'over'>('intro')
  const [round, setRound] = useState<HuntQuestion[]>([])
  const [index, setIndex] = useState(0)
  const [given, setGiven] = useState<Affix | null>(null)
  const [results, setResults] = useState<{ q: HuntQuestion; ok: boolean }[]>([])
  const [empty, setEmpty] = useState(false)

  useEffect(() => {
    let live = true
    // A failed read leaves an empty log (the round still starts), not a button that never wakes up.
    void db.getAffixLog().then((l) => live && setLog(l)).catch(() => live && setLog({}))
    return () => {
      live = false
    }
  }, [phase])

  useEffect(() => {
    let live = true
    void Promise.all([loadPack(language), loadFrequency(language).catch(() => new Map<string, number>())]).then(([pack, rank]) => {
      if (live) setData({ pack, rank, frequent: [...rank.keys()] })
    })
    return () => {
      live = false
    }
  }, [language])

  const q = round[index]

  const start = async () => {
    if (!data?.pack) return
    const vocabulary = await db.vocabulary.where('language').equals(language).toArray()
    const lookup = makeLookup(data.pack, data.rank, vocabulary, language)
    const rng = createRng(Date.now())
    // The words of pairs that went wrong more than right come first, so a miss gets another chance.
    const missedBases = Object.entries(log ?? {}).filter(([, r]) => r.wrong > r.ok).map(([id]) => id.split('|')[0])
    const own = vocabulary.filter((v) => !v.lemma.includes(' ')).map((v) => v.lemma)
    const next = huntRound(huntPool(own, data.frequent, language, lookup, rng, { priority: missedBases }), log ?? {}, rng)
    if (!next.length) {
      setEmpty(true)
      return
    }
    setEmpty(false)
    setRound(next)
    setIndex(0)
    setResults([])
    setGiven(null)
    setPhase('play')
  }

  const choose = (a: Affix) => {
    if (!q || given) return
    const ok = a.form === q.answer.form
    if (ok) sfx.correct()
    else sfx.wrong()
    setGiven(a)
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
      else if (given && e.key === 'Enter') next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const missed = results.filter((r) => !r.ok)

  return (
    <div className="stack affix-game">
      <div className="game-top">
        <button className="link" onClick={onExit}>
          ← Oyunlar
        </button>
        {phase === 'play' && (
          <span className="game-timer">
            {index + 1} / {round.length}
          </span>
        )}
        <span className="small muted" />
      </div>

      {phase === 'intro' && (
        <div className="stack">
          <h1 className="greeting">Ek avı</h1>
          <p className="muted">
            {LANGUAGE_NAME[language]} kelimelerin çoğu bir kök ve birkaç ekten kurulur: <em>comfort → comfortable → comfortably</em>. Bir kelimeyi ve türevinin Türkçesini görürsün; hangi ekin ya da ön ekin yaptığını seçersin. Kelimeleri tek tek ezberlemek yerine ekleri öğrenirsin.
          </p>
          <p className="small muted">Önce kendi kelimelerinden, sonra en sık kelimelerden sorulur.</p>
          {empty && <p className="cross-warn">Bu dilde soru çıkaracak kadar türev bulunamadı.</p>}
          <div className="row">
            <button className="btn btn-lg" onClick={() => void start()} autoFocus disabled={!log || !data?.pack}>
              {HUNT_ROUND} soruluk tura başla
            </button>
          </div>
          {data && !data.pack && <p className="small muted">Sözlük paketi henüz indirilmedi; internete bağlanıp bir kez açman gerekiyor.</p>}
        </div>
      )}

      {phase === 'play' && q && (
        <div className="stack">
          <p className="prompt-label">Bu kelimeye ek getirerek şunu yap:</p>
          <h1 className="word" lang={language}>
            {q.base}
          </h1>
          <p className="prompt-text" lang="tr">
            {q.baseGloss ? <span className="muted">({q.baseGloss}) → </span> : null}
            <strong>{q.wordGloss}</strong> <span className="muted">· {POS_NAME[q.wordPos]}</span>
          </p>
          <div className="options" role="group" aria-label="Seçenekler">
            {q.options.map((o, i) => (
              <button
                key={o.form}
                type="button"
                className={`option${given ? (o.form === q.answer.form ? ' is-correct' : given.form === o.form ? ' is-wrong' : ' is-dim') : ''}`}
                disabled={!!given}
                onClick={() => choose(o)}
              >
                <span className="key">{i + 1}</span>
                <span className="option-serif" lang={language}>
                  {label(o)}
                </span>
              </button>
            ))}
          </div>
          {given && (
            <div className="stack" role="status">
              <p className={given.form === q.answer.form ? 'small' : 'cross-warn'}>
                {given.form === q.answer.form ? 'Doğru: ' : 'Bu ek tutmuyor. '}
                <Formula q={q} language={language} />
              </p>
              <p className="small">
                <span className="morph morph-suffix">{label(q.answer)}</span> {q.answer.role}
                <span className="muted"> · Türkçesi: {q.answer.tr}</span>
              </p>
              {given.form !== q.answer.form && (
                <p className="small muted">
                  Seçtiğin <span lang={language}>{label(given)}</span> {given.role}; <span lang={language}>{q.base}</span> ile gerçek bir kelime olmaz.
                </p>
              )}
              <div className="row">
                <button type="button" className="btn" onClick={next} autoFocus>
                  Devam
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {phase === 'over' && (
        <GameResult
          title="Tur bitti"
          headline={`${round.length - missed.length} / ${round.length} doğru`}
          accuracy={round.length ? (round.length - missed.length) / round.length : 0}
          missed={missed.map((m) => `${m.q.base} → ${m.q.word} (${label(m.q.answer)})`)}
          missedLabel="Tutturamadığın ekler"
          language={language}
          onAgain={() => void start()}
          onExit={onExit}
        />
      )}
      {phase === 'over' && empty && <p className="cross-warn">Bu dilde yeni bir tur çıkaracak kadar türev bulunamadı.</p>}
    </div>
  )
}
