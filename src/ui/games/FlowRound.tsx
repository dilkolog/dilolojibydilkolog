import { LessonLink } from '../LessonLink'
import { useEffect, useMemo, useState } from 'react'
import { GameResult } from './GameResult'
import { flowParts, flowRound, shuffledOptions, flowGapId, FLOW_ROUND, type FlowItem } from '../../engine/flow'
import type { GrammarLog } from '../../engine/grammar'
import { createRng } from '../../engine/rng'
import type { TargetLanguage } from '../../engine/types'
import { db } from '../../data/instance'
import { noteIn } from './logNote'
import { flowItems } from '../../data/flow'
import { LANGUAGE_NAME } from '../labels'
import { sfx } from '../sounds'
import { SpeakerIcon } from '../icons'
import { canSpeak, speak } from '../speech'
import { isPctRecord } from './shared'

const note = noteIn(() => db.getFlowLog(), (log) => db.saveFlowLog(log))

/**
 * Text flow: a short paragraph with its connectors missing. The gaps are filled one after another by
 * choosing the connector that gives the thought its direction; each answer says why in Turkish.
 */
export function FlowRound({ language, onExit, onLesson }: { language: TargetLanguage; onExit: () => void; /** Opens the guide's lesson on a topic. */ onLesson?: (topic: string) => void }) {
  const [log, setLog] = useState<GrammarLog | null>(null)
  const [phase, setPhase] = useState<'intro' | 'play' | 'over'>('intro')
  const [round, setRound] = useState<FlowItem[]>([])
  const [index, setIndex] = useState(0)
  /** What was chosen for each gap of the paragraph on screen (by gap number). */
  const [chosen, setChosen] = useState<string[]>([])
  const [results, setResults] = useState<{ text: string; ok: boolean }[]>([])

  const recordKey = `flow:${language}`
  const [best, setBest] = useState<number | undefined>(undefined)
  const [record, setRecord] = useState(false)

  useEffect(() => {
    void db.getRecords().then((r) => setBest(r[recordKey]))
  }, [recordKey])

  useEffect(() => {
    let live = true
    void db.getFlowLog().then((l) => live && setLog(l))
    return () => {
      live = false
    }
  }, [phase])

  const item = round[index]
  const gapNo = chosen.length
  const gap = item?.gaps[gapNo]
  const done = !!item && gapNo >= item.gaps.length
  const total = flowItems.filter((i) => i.language === language).length
  const parts = useMemo(() => (item ? flowParts(item) : []), [item])
  // The options of the open gap, shuffled once per gap.
  const options = useMemo(() => (gap ? shuffledOptions(gap, createRng(Date.now() + gapNo)) : []), [gap, gapNo])
  // The gap just answered: its explanation stays until Devam.
  const [shown, setShown] = useState<number | null>(null)
  const last = shown !== null ? item?.gaps[shown] : undefined

  const start = () => {
    setRound(flowRound(flowItems, log ?? {}, language, createRng(Date.now())))
    setIndex(0)
    setChosen([])
    setShown(null)
    setResults([])
    setPhase('play')
  }

  const choose = (option: string) => {
    if (!item || !gap || shown !== null) return
    const ok = option === gap.answer
    if (ok) sfx.correct()
    else sfx.wrong()
    setChosen((c) => [...c, option])
    setShown(gapNo)
    setResults((r) => [...r, { text: gap.answer, ok }])
    void note(flowGapId(item, gapNo), ok)
  }

  const next = async () => {
    if (!item) return
    if (shown !== null && gapNo < item.gaps.length) {
      setShown(null)
      return
    }
    if (index + 1 < round.length) {
      setIndex(index + 1)
      setChosen([])
      setShown(null)
      return
    }
    const correctCount = results.filter((r) => r.ok).length
    const pct = Math.round((correctCount / results.length) * 100)
    if (isPctRecord(pct, best)) {
      await db.saveRecord(recordKey, pct)
      setRecord(best !== undefined)
    }
    sfx.levelUp()
    setPhase('over')
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== 'play' || !item) return
      const n = Number(e.key)
      if (gap && shown === null && n >= 1 && n <= options.length) choose(options[n - 1])
      else if ((shown !== null || done) && e.key === 'Enter') {
        e.preventDefault()
        void next()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const missed = results.filter((r) => !r.ok)
  const lastOfParagraph = !!item && shown !== null && gapNo >= item.gaps.length

  return (
    <div className="stack flow-game">
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
        <div className="card flow-card stack gap-2">
          <h1 className="greeting">Metin akışı</h1>
          <p className="muted">
            Kısa bir {LANGUAGE_NAME[language]} paragrafta düşüncenin yönünü değiştiren bağlaçlar eksik (ama, bu yüzden, -se de). Boşlukları sırayla doldurursun; her cevapta neden o bağlacın uyduğunu Türkçe görürsün. Akıcı yazı ve konuşma cümleleri birbirine bağlamakla başlar.
          </p>
          <p className="small muted">{total} paragraf.</p>
          <div className="row">
            <button className="btn btn-lg" onClick={start} autoFocus disabled={!log || total === 0}>
              {Math.min(FLOW_ROUND, total)} paragraflık tura başla
            </button>
          </div>
        </div>
      )}

      {phase === 'play' && item && (
        <div className="card flow-card stack gap-2">
          <p className="prompt-label">Her boşluğa düşüncenin yönüne uyan bağlacı seç.</p>
          <p className="flow-text" lang={language}>
            {parts.map((p, i) => {
              if ('text' in p) return <span key={i}>{p.text}</span>
              const given = chosen[p.gap]
              const right = item.gaps[p.gap].answer
              if (given === undefined)
                return (
                  <span key={i} className={`flow-gap${p.gap === gapNo ? ' is-open' : ''}`} aria-label={p.gap === gapNo ? 'boşluk' : 'sonraki boşluk'}>
                    {p.gap === gapNo ? '[ ? ]' : '[ … ]'}
                  </span>
                )
              return (
                <span key={i} className={`flow-gap ${given === right ? 'is-correct' : 'is-wrong'}`}>
                  {right}
                </span>
              )
            })}
          </p>

          {gap && shown === null && (
            <div className="options" role="group" aria-label="Seçenekler">
              {options.map((o, i) => (
                <button key={o} type="button" className="option" onClick={() => choose(o)}>
                  <span className="key">{i + 1}</span>
                  <span className="option-serif" lang={language}>
                    {o}
                  </span>
                </button>
              ))}
            </div>
          )}

          {last && (
            <div className="stack gap-1" role="status">
              <div className="row items-center gap-1">
                <span className="chip chip-sm flow-kind-chip">{last.kind}</span>
                {canSpeak() && (
                  <button
                    type="button"
                    className="icon-btn icon-btn-sm"
                    aria-label={`${last.answer} dinle`}
                    onClick={() => speak(last.answer, language)}
                  >
                    <SpeakerIcon size={14} />
                  </button>
                )}
              </div>
              <p className={chosen[shown!] === last.answer ? 'small' : 'cross-warn'}>
                {chosen[shown!] === last.answer ? 'Doğru: ' : 'Bu bağlaç uymaz. '}
                <strong lang={language}>{last.answer}</strong> ({last.kind.toLocaleLowerCase('tr')}). {last.why}
              </p>
              {chosen[shown!] !== last.answer && (
                <p className="small muted">
                  Seçtiğin <span lang={language}>“{chosen[shown!]}”</span> burada düşüncenin yönünü tutturmuyor.
                </p>
              )}
            </div>
          )}

          {lastOfParagraph && (
            <div className="stack gap-2">
              {canSpeak() && (
                <div className="row">
                  <button
                    type="button"
                    className="btn btn-quiet btn-sm"
                    onClick={() => speak(item.text.replace(/\{(\d+)\}/g, (_, n) => item.gaps[Number(n)]?.answer ?? ''), language)}
                  >
                    <SpeakerIcon size={16} className="inline-icon" /> Paragrafı dinle
                  </button>
                </div>
              )}
              <div className="note flow-translation" lang="tr">
                <strong>Türkçesi:</strong> {item.tr}
              </div>
            </div>
          )}

          {(shown !== null || done) && (
            <div className="row">
              <button type="button" className="btn" onClick={() => void next()} autoFocus>
                {lastOfParagraph ? (index + 1 < round.length ? 'Sonraki paragraf' : 'Bitir') : 'Devam'}
              </button>
            </div>
          )}
        </div>
      )}

      {phase === 'over' && (
        <GameResult
          title="Tur bitti"
          headline={`${results.length - missed.length} / ${results.length} boşluk doğru`}
          accuracy={results.length ? (results.length - missed.length) / results.length : 0}
          record={record}
          missed={missed.map((m) => m.text)}
          missedLabel="Tutturamadığın bağlaçlar"
          language={language}
          onAgain={start}
          onExit={onExit}
        />
      )}
      {phase === 'over' && missed.length > 0 && onLesson && <LessonLink language={language} topic={`conn_${language}`} onOpen={onLesson} />}
    </div>
  )
}
