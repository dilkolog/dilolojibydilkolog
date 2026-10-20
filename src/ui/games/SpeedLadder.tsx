import { useEffect, useMemo, useRef, useState } from 'react'
import { GameResult } from './GameResult'
import { loadSources } from './sentenceSources'
import { canClimb, ladder, LADDER_RATES, LADDER_SENTENCES, addRun, advice, change, cleanRuns, scoreByRate, type LadderAnswer, type LadderItem, type LadderRun } from '../../engine/speedLadder'
import { createRng } from '../../engine/rng'
import type { TargetLanguage, VocabularyEntry } from '../../engine/types'
import { EmptyState } from '../EmptyState'
import { LANGUAGE_NAME } from '../labels'
import { sfx } from '../sounds'
import { speakAsync, speechPrefs, stopSpeaking } from '../speech'

const storeKey = (language: TargetLanguage) => `diloloji:ladder:${language}`
const loadRuns = (language: TargetLanguage): LadderRun[] => {
  try {
    return cleanRuns(JSON.parse(localStorage.getItem(storeKey(language)) ?? '[]'))
  } catch {
    return []
  }
}
const rateText = (rate: number) => `${String(rate).replace('.', ',')}×`

/**
 * The speed ladder: the same sentence is heard slower, as it is and faster, with a question about what was heard each
 * time. The result says which speed the ear holds today and how it compares with the last ladder (kept on the device).
 */
export function SpeedLadder({ language, vocabulary, onExit }: { language: TargetLanguage; vocabulary: readonly VocabularyEntry[]; onExit: () => void }) {
  const [items, setItems] = useState<LadderItem[] | null>(null)
  const [ready, setReady] = useState<boolean | null>(null)
  const [sources, setSources] = useState<Awaited<ReturnType<typeof loadSources>>>([])
  const [phase, setPhase] = useState<'intro' | 'play' | 'over'>('intro')
  const [index, setIndex] = useState(0)
  const [picked, setPicked] = useState<string | null>(null)
  const [answers, setAnswers] = useState<LadderAnswer[]>([])
  const [runs, setRuns] = useState<LadderRun[]>(() => loadRuns(language))
  const [playing, setPlaying] = useState(false)
  const token = useRef(0)

  useEffect(() => {
    let live = true
    void loadSources(language, [...vocabulary]).then((s) => {
      if (!live) return
      setSources(s)
      setReady(canClimb(s, language))
    })
    return () => {
      live = false
      stopSpeaking()
    }
    // The sentences are read once per visit.
  }, [language]) // eslint-disable-line react-hooks/exhaustive-deps

  // The questions in the order they are asked: a sentence's three steps one after another.
  const queue = useMemo(() => (items ?? []).flatMap((item) => item.steps.map((step) => ({ item, step }))), [items])
  const current = queue[index]

  const play = async () => {
    if (!current) return
    const mine = ++token.current
    setPlaying(true)
    try {
      await speakAsync(current.item.text, language, speechPrefs.rate * current.step.rate)
    } finally {
      if (token.current === mine) setPlaying(false)
    }
  }

  const hush = () => {
    token.current++
    stopSpeaking()
  }
  // Each question begins with the sentence read at its speed.
  useEffect(() => {
    if (phase === 'play') void play()
    return hush
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, index])

  const start = () => {
    setItems(ladder(sources, language, createRng(Date.now())))
    setIndex(0)
    setPicked(null)
    setAnswers([])
    setPhase('play')
  }

  const answer = (option: string) => {
    if (!current || picked !== null) return
    const ok = option === current.step.target
    setPicked(option)
    setAnswers((a) => [...a, { rate: current.step.rate, ok }])
    if (ok) sfx.correct()
    else sfx.wrong()
  }

  const next = () => {
    if (index + 1 < queue.length) {
      setIndex(index + 1)
      setPicked(null)
      return
    }
    const next = addRun(runs, scoreByRate(answers), new Date())
    setRuns(next)
    try {
      localStorage.setItem(storeKey(language), JSON.stringify(next))
    } catch {
      // Progress is a convenience; a full or blocked store only means no comparison next time.
    }
    sfx.levelUp()
    setPhase('over')
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== 'play') return
      if (picked !== null && e.key === 'Enter') {
        e.preventDefault()
        next()
      } else if (picked === null && current && /^[1-4]$/.test(e.key)) {
        const option = current.step.options[Number(e.key) - 1]
        if (option) answer(option)
      } else if (picked === null && e.key.toLowerCase() === 'r') void play()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const top = (
    <div className="game-top">
      <button className="link" onClick={onExit}>
        ← Oyunlar
      </button>
      {phase === 'play' && queue.length > 0 && (
        <span className="game-timer">
          {index + 1} / {queue.length}
        </span>
      )}
      <span className="small muted" />
    </div>
  )

  if (ready === null) return <div className="stack">{top}</div>
  if (!ready)
    return (
      <div className="stack">
        {top}
        <EmptyState sticker="read" title="Henüz yeterli cümle yok">
          Hız merdiveni, okuduğun metinlerden, çevirdiğin cümlelerden ve kelimelerinin örneklerinden {LADDER_SENTENCES} uygun cümle ister (6–16 kelimelik). Biraz okuyup çevirdikçe cümleler birikir.
        </EmptyState>
      </div>
    )

  if (phase === 'over') {
    const scores = scoreByRate(answers)
    const diff = change(runs)
    const right = answers.filter((a) => a.ok).length
    return (
      <div className="stack">
        {top}
        <GameResult
          title="Hız merdiveni"
          headline={`${right} / ${answers.length} doğru`}
          accuracy={answers.length ? right / answers.length : 0}
          stats={scores.map((s, i) => ({
            label: rateText(s.rate),
            value: (
              <>
                {s.right}/{s.n}
                {diff && diff[i] !== null && diff[i] !== 0 ? <span className="small muted"> ({diff[i]! > 0 ? '+' : ''}{diff[i]} puan)</span> : null}
              </>
            ),
          }))}
          note={advice(scores)}
          language={language}
          onAgain={start}
          onExit={onExit}
        />
      </div>
    )
  }

  return (
    <div className="stack ladder-game">
      {top}
      {phase === 'intro' && (
        <div className="stack">
          <h1 className="greeting">Hız merdiveni</h1>
          <p className="muted">
            Aynı {LANGUAGE_NAME[language]} cümleyi üç hızda dinlersin: yavaş ({rateText(LADDER_RATES[0])}), olduğu gibi ve hızlı ({rateText(LADDER_RATES[2])}). Her seferinde cümlede hangi kelimenin geçtiğini seçersin. Kulağının bugün hangi hızı yakaladığını görürsün; bir sonraki merdivende farkı karşılaştırırız.
          </p>
          <p className="small muted">{LADDER_SENTENCES} cümle · {LADDER_SENTENCES * LADDER_RATES.length} soru · cümle sesi cihazının sesidir</p>
          <div className="row">
            <button className="btn btn-lg" onClick={start} autoFocus>
              Merdivene çık
            </button>
          </div>
        </div>
      )}

      {phase === 'play' && current && (
        <div className="stack">
          <p className="prompt-label">
            {rateText(current.step.rate)} hız · cümlede hangi kelime vardı?
          </p>
          <div className="row">
            <button type="button" className="btn btn-sm" onClick={() => void play()} disabled={playing} aria-label="Cümleyi yeniden dinle">
              {playing ? 'Çalıyor…' : '🔊 Tekrar dinle (R)'}
            </button>
          </div>
          <div className="options">
            {current.step.options.map((o, i) => (
              <button
                key={o}
                type="button"
                className={`option${picked !== null ? (o === current.step.target ? ' is-correct' : picked === o ? ' is-wrong' : ' is-dim') : ''}`}
                disabled={picked !== null}
                onClick={() => answer(o)}
              >
                <span className="key">{i + 1}</span>
                <span className="option-serif" lang={language}>
                  {o}
                </span>
              </button>
            ))}
          </div>
          {picked !== null && (
            <div className="stack grammar-feedback" role="status">
              <p lang={language}>{current.item.text}</p>
              {current.item.translation && <p className="small muted" lang="tr">{current.item.translation}</p>}
              <div className="row">
                <button type="button" className="btn" onClick={next} autoFocus>
                  {index + 1 < queue.length ? 'Devam' : 'Bitir'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
