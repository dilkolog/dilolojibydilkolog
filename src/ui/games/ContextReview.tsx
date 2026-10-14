import { useEffect, useMemo, useRef, useState } from 'react'
import { GameResult } from './GameResult'
import { recordPractice, type Props } from './shared'
import { checkSlots, contextBank, contextItems, contextParts, contextRound, CONTEXT_ROUND, type ContextItem, type ContextSource } from '../../engine/contextReview'
import { createRng } from '../../engine/rng'
import { db } from '../../data/instance'
import { EmptyState } from '../EmptyState'
import { LANGUAGE_NAME } from '../labels'
import { sfx } from '../sounds'

/** The sentences the learner has met: texts read, sentences translated, their words' examples. */
async function loadSources(language: Props['language'], vocabulary: Props['vocabulary']): Promise<ContextSource[]> {
  const [texts, memory] = await Promise.all([db.getLibrary(language), db.getTranslations()])
  return [
    ...memory.filter((m) => m.from === language && m.to === 'tr').map((m) => ({ text: m.text, translation: m.translation, from: 'Çevirdiklerin' })),
    ...vocabulary.filter((v) => v.language === language).flatMap((v) => v.senses.flatMap((s) => s.examples.map((x) => ({ text: x.text, translation: x.translation || undefined, from: 'Örnek cümle' })))),
    ...texts.map((t) => ({ text: t.text, from: t.title })),
  ]
}

/**
 * Review in context: a sentence met before, with two or more of the learner's own words blanked;
 * the words come back from a bank of chips (with a couple of strays), then each blank is checked.
 * Every blank is an answer for its word: a due word is reviewed, as in the other games.
 */
export function ContextReview({ language, vocabulary, states, onChanged, onExit }: Props & { onExit: () => void }) {
  const [items, setItems] = useState<ContextItem[] | null>(null)
  const [phase, setPhase] = useState<'intro' | 'play' | 'over'>('intro')
  const [round, setRound] = useState<ContextItem[]>([])
  const [index, setIndex] = useState(0)
  const [filled, setFilled] = useState<(string | null)[]>([])
  const [checked, setChecked] = useState<boolean[] | null>(null)
  const [showTr, setShowTr] = useState(false)
  const [results, setResults] = useState<{ form: string; ok: boolean }[]>([])
  const shownAt = useRef(Date.now())

  useEffect(() => {
    let live = true
    void loadSources(language, vocabulary).then((sources) => live && setItems(contextItems(sources, language, vocabulary, states, new Date())))
    return () => {
      live = false
    }
    // The sentences are read once per visit: answering changes states, not which sentences there are.
  }, [language]) // eslint-disable-line react-hooks/exhaustive-deps

  const item = round[index]
  const bank = useMemo(() => (item ? contextBank(item, round, createRng(Date.now())) : []), [item, round])
  const parts = useMemo(() => (item ? contextParts(item) : []), [item])
  const due = items?.filter((i) => i.due > 0).length ?? 0

  const show = (i: number) => {
    setIndex(i)
    setFilled(new Array(round[i]?.slots.length ?? 0).fill(null))
    setChecked(null)
    setShowTr(false)
    shownAt.current = Date.now()
  }
  const start = () => {
    if (!items) return
    const r = contextRound(items, createRng(Date.now()))
    setRound(r)
    setIndex(0)
    setFilled(new Array(r[0]?.slots.length ?? 0).fill(null))
    setChecked(null)
    setShowTr(false)
    setResults([])
    shownAt.current = Date.now()
    setPhase('play')
  }

  /** A chip goes to the first empty blank; a filled blank tapped again gives its chip back. */
  const put = (form: string) => {
    if (checked) return
    const at = filled.indexOf(null)
    if (at < 0) return
    setFilled(filled.map((f, i) => (i === at ? form : f)))
  }
  const takeBack = (slot: number) => {
    if (checked) return
    setFilled(filled.map((f, i) => (i === slot ? null : f)))
  }
  const used = (form: string, i: number) => filled.filter((f) => f === form).length > bank.slice(0, i).filter((b) => b === form).length

  const check = () => {
    if (!item || filled.includes(null)) return
    const ok = checkSlots(item, filled)
    setChecked(ok)
    setShowTr(true)
    if (ok.every(Boolean)) sfx.correct()
    else sfx.wrong()
    setResults((r) => [...r, ...item.slots.map((s, i) => ({ form: s.form, ok: ok[i] }))])
    const ms = Math.round((Date.now() - shownAt.current) / item.slots.length)
    const byId = new Map(vocabulary.map((v) => [v.id, v]))
    const stateById = new Map(states.map((s) => [s.entryId, s]))
    void Promise.all(
      item.slots.map((s, i) => {
        const entry = byId.get(s.entryId)
        return entry ? recordPractice(entry, stateById.get(s.entryId), 'mc_context', ok[i], ms, { given: filled[i] ?? '', expected: s.form }) : Promise.resolve(false)
      }),
    ).then(onChanged)
  }
  const next = () => {
    if (index + 1 < round.length) show(index + 1)
    else {
      sfx.levelUp()
      setPhase('over')
    }
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== 'play' || e.key !== 'Enter') return
      e.preventDefault()
      if (checked) next()
      else check()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const missed = results.filter((r) => !r.ok)
  const top = (
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
  )
  if (!items) return <div className="stack">{top}</div>
  if (!items.length)
    return (
      <div className="stack">
        {top}
        <EmptyState sticker="read" title="Henüz uygun cümle yok">
          Bu tur, okuduğun metinlerde, çevirdiğin cümlelerde ve kelimelerinin örneklerinde en az iki kelimenin birlikte geçtiği cümleleri kullanır. Biraz okuyup kelime ekledikçe cümleler birikir.
        </EmptyState>
      </div>
    )

  return (
    <div className="stack flow-game context-game">
      {top}
      {phase === 'intro' && (
        <div className="stack">
          <h1 className="greeting">Cümlede tekrar</h1>
          <p className="muted">
            Daha önce karşılaştığın {LANGUAGE_NAME[language]} cümlelerde kendi kelimelerinden birkaçı boş bırakılır. Alttaki kelimelerden doğru yerlere yerleştir: kelimeyi tek başına değil, yanındaki kelimelerle birlikte hatırlarsın. Tekrar zamanı gelen kelimeler gerçek tekrar sayılır.
          </p>
          <p className="small muted">
            {items.length} cümle{due ? ` · ${due} tanesinde tekrar zamanı gelen kelime var` : ''}.
          </p>
          <div className="row">
            <button className="btn btn-lg" onClick={start} autoFocus>
              {Math.min(CONTEXT_ROUND, items.length)} cümlelik tura başla
            </button>
          </div>
        </div>
      )}

      {phase === 'play' && item && (
        <div className="stack">
          <p className="prompt-label">Boşluklara kelimeleri yerleştir. Yanlış yere koyduğuna dokunursan geri gelir.</p>
          <p className="flow-text" lang={language}>
            {parts.map((p, i) => {
              if ('text' in p) return <span key={i}>{p.text}</span>
              const given = filled[p.slot]
              if (checked)
                return (
                  <span key={i} className={`flow-gap ${checked[p.slot] ? 'is-correct' : 'is-wrong'}`} title={checked[p.slot] ? undefined : `Yazdığın: ${given}`}>
                    {item.slots[p.slot].form}
                  </span>
                )
              return given ? (
                <button key={i} type="button" className="flow-gap context-filled" onClick={() => takeBack(p.slot)} aria-label={`${given}: geri al`}>
                  {given}
                </button>
              ) : (
                <span key={i} className={`flow-gap${filled.indexOf(null) === p.slot ? ' is-open' : ''}`} aria-label="boşluk">
                  [ {p.slot + 1} ]
                </span>
              )
            })}
          </p>
          <p className="small muted">{item.from}</p>

          {!checked && (
            <div className="choice-row context-bank" role="group" aria-label="Kelimeler" lang={language}>
              {bank.map((form, i) => (
                <button key={`${form}-${i}`} type="button" className="chip" disabled={used(form, i)} onClick={() => put(form)}>
                  {form}
                </button>
              ))}
            </div>
          )}

          {item.translation && (showTr ? (
            <div className="note flow-translation" lang="tr">
              <strong>Türkçesi:</strong> {item.translation}
            </div>
          ) : (
            <div>
              <button type="button" className="link small" onClick={() => setShowTr(true)}>
                Türkçesini göster
              </button>
            </div>
          ))}

          {checked && (
            <p className={checked.every(Boolean) ? 'small' : 'cross-warn'} role="status">
              {checked.every(Boolean) ? 'Hepsi yerinde.' : `${checked.filter(Boolean).length} / ${checked.length} doğru. Kırmızı olanların doğrusu yazıyor.`}
            </p>
          )}

          <div className="row">
            {checked ? (
              <button type="button" className="btn" onClick={next} autoFocus>
                {index + 1 < round.length ? 'Sonraki cümle' : 'Bitir'}
              </button>
            ) : (
              <button type="button" className="btn" onClick={check} disabled={filled.includes(null)}>
                Kontrol et
              </button>
            )}
          </div>
        </div>
      )}

      {phase === 'over' && (
        <GameResult
          title="Tur bitti"
          headline={`${results.length - missed.length} / ${results.length} kelime yerinde`}
          accuracy={results.length ? (results.length - missed.length) / results.length : 0}
          missed={[...new Set(missed.map((m) => m.form))]}
          language={language}
          onAgain={start}
          onExit={onExit}
        />
      )}
    </div>
  )
}
