import { useEffect, useState } from 'react'
import type { TargetLanguage } from '../../engine/types'
import { createRng, shuffle } from '../../engine/rng'
import { CheckIcon, CloseIcon } from '../shared/icons'
import { GameResult } from '../games/GameResult'
import { sfx } from '../shared/sounds'

export interface LookupWord { word: string; meaning: string }

/**
 * A practice of recent lookups, including words not saved yet, in the same layout as the site's other tests (word, numbered
 * options, "Doğru / Doğrusu" line, Sonraki, the shared result screen). It never creates orphan SRS states or events.
 */
export function DictionaryQuickReview({ words, language, onDone }: { words: LookupWord[]; language: TargetLanguage; onDone: () => void }) {
  const [seed, setSeed] = useState(() => Date.now())
  const [round, setRound] = useState(() => buildRound(words, seed))
  const [index, setIndex] = useState(0)
  const [answer, setAnswer] = useState<string | null>(null)
  const [right, setRight] = useState(0)
  const [missed, setMissed] = useState<string[]>([])
  const item = round[index]
  const finished = !item

  const pick = (option: string) => {
    if (answer !== null || !item) return
    setAnswer(option)
    if (option === item.meaning) {
      setRight((n) => n + 1)
      sfx.correct()
    } else {
      setMissed((m) => [...m, `${item.word} — ${item.meaning}`])
      sfx.wrong()
    }
  }
  const next = () => {
    setIndex((n) => n + 1)
    setAnswer(null)
  }
  const again = () => {
    const s = Date.now()
    setSeed(s)
    setRound(buildRound(words, s))
    setIndex(0)
    setAnswer(null)
    setRight(0)
    setMissed([])
  }

  useEffect(() => {
    if (finished) return
    const onKey = (e: KeyboardEvent) => {
      if (answer !== null && e.key === 'Enter') {
        e.preventDefault()
        next()
      } else if (answer === null) {
        const o = item.options[Number(e.key) - 1]
        if (o) pick(o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (finished) {
    return (
      <GameResult
        title="Hızlı tekrar bitti"
        headline={`${right} / ${round.length}`}
        accuracy={round.length ? right / round.length : 0}
        stats={[{ label: 'doğru', value: right }, { label: 'yanlış', value: round.length - right }]}
        missed={missed}
        language={language}
        onAgain={again}
        onExit={onDone}
      />
    )
  }

  const ok = answer === item.meaning
  return (
    <div className="stack practice-test" aria-label="Son aramalardan hızlı tekrar" key={`${seed}-${index}`}>
      <div className="row justify-between">
        <button className="link" onClick={onDone}>← Bitir</button>
        <span className="small muted">{index + 1} / {round.length}</span>
      </div>
      <p className="small muted">Son aramalarından · serbest pratik, tekrar takvimini değiştirmez.</p>
      <h2 className="word" lang={language}>{item.word}</h2>
      <div className="options">
        {item.options.map((option, i) => {
          const state = answer === null ? '' : option === item.meaning ? ' is-correct' : option === answer ? ' is-wrong' : ' is-dim'
          return (
            <button key={option} type="button" className={`option${state}`} disabled={answer !== null} onClick={() => pick(option)}>
              <span className="key">{state === ' is-correct' ? <CheckIcon size={14} /> : state === ' is-wrong' ? <CloseIcon size={14} /> : i + 1}</span>
              <span>{option}</span>
            </button>
          )
        })}
      </div>
      {answer !== null && (
        <div className="stack gap-2">
          <p className={ok ? 'notice' : 'error'} role="status">{ok ? 'Doğru' : `Doğrusu: ${item.meaning}`}</p>
          <button className="btn" onClick={next} autoFocus>{index + 1 === round.length ? 'Sonucu gör' : 'Sonraki'}</button>
        </div>
      )}
    </div>
  )
}

function buildRound(words: LookupWord[], seed: number) {
  const rng = createRng(seed)
  return shuffle(words, rng).map((item) => ({
    ...item,
    options: shuffle([...new Set([item.meaning, ...shuffle(words.filter((w) => w.meaning !== item.meaning), rng).slice(0, 3).map((w) => w.meaning)])], rng),
  }))
}
