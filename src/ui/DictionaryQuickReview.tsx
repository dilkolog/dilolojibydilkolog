import { useState } from 'react'
import type { TargetLanguage } from '../engine/types'
import { createRng, shuffle } from '../engine/rng'

export interface LookupWord { word: string; meaning: string }
/** A practice of lookups, including words not saved yet; it never creates orphan SRS states/events. */
export function DictionaryQuickReview({ words, language, onDone }: { words: LookupWord[]; language: TargetLanguage; onDone: () => void }) {
  const [round] = useState(() => {
    const rng = createRng(Date.now())
    return shuffle(words, rng).map(item => ({ ...item, options: shuffle([...new Set([item.meaning, ...shuffle(words.filter(w => w.meaning !== item.meaning), rng).slice(0, 3).map(w => w.meaning)])], rng) }))
  })
  const [index, setIndex] = useState(0)
  const [answer, setAnswer] = useState<string | null>(null)
  const [correct, setCorrect] = useState(0)
  const item = round[index]
  return <section className="section card stack" aria-label="Son aramalardan hızlı tekrar">
    <h2 className="section-title">Son aramalardan hızlı tekrar</h2>
    <p className="small muted">Serbest pratik · tekrar takvimini değiştirmez.</p>
    {!item ? <><p role="status">{round.length} kelimeden {correct} doğru.</p><button className="btn" onClick={onDone}>Sözlüğe dön</button></> : <>
      <p className="small muted">{index + 1} / {round.length}</p><h3 className="word" lang={language}>{item.word}</h3>
      <div className="stack gap-2">{item.options.map(option => <button key={option} type="button" className={`option${answer !== null ? option === item.meaning ? ' is-correct' : option === answer ? ' is-wrong' : '' : ''}`} disabled={answer !== null} onClick={() => { setAnswer(option); if (option === item.meaning) setCorrect(n => n + 1) }}>{option}</button>)}</div>
      {answer !== null && <><p role="status">{answer === item.meaning ? 'Doğru!' : `Doğru cevap: ${item.meaning}`}</p><button className="btn" onClick={() => { setIndex(n => n + 1); setAnswer(null) }}>{index + 1 === round.length ? 'Sonucu gör' : 'Sonraki'}</button></>}
      <button className="link small" onClick={onDone}>Tekrarı bırak</button>
    </>}
  </section>
}
