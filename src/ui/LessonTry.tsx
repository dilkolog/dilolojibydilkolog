import { useState } from 'react'
import type { CheckItem } from '../data/guide/lessonOf'
import type { TargetLanguage } from '../engine/types'
import { sfx } from './sounds'

/**
 * "Hemen dene": a question or two right after a lesson's rules, to see whether the rule holds before the examples.
 * Nothing is kept (no score, no mark on the lesson): the short check at the end is what counts.
 */
export function LessonTry({ items, language }: { items: CheckItem[]; language: TargetLanguage }) {
  const [index, setIndex] = useState(0)
  const [given, setGiven] = useState<number | null>(null)
  const item = items[index]
  if (!item) return null
  const inSentence = item.prompt.includes('___')
  const choose = (i: number) => {
    if (given !== null) return
    setGiven(i)
    if (i === item.answer) sfx.correct()
    else sfx.wrong()
  }
  return (
    <section className="card stack gap-2 lesson-try" aria-label="Hemen dene">
      <div className="row justify-between">
        <h2 className="section-title">Hemen dene</h2>
        <span className="small muted">
          {index + 1} / {items.length}
        </span>
      </div>
      <p className="lesson-check-prompt" lang={inSentence ? language : undefined}>
        {item.prompt}
      </p>
      <div className="options">
        {item.options.map((o, i) => (
          <button
            key={o}
            type="button"
            className={`option${given === null ? '' : i === item.answer ? ' is-correct' : given === i ? ' is-wrong' : ' is-dim'}`}
            disabled={given !== null}
            onClick={() => choose(i)}
          >
            <span className="key">{i + 1}</span>
            <span lang={inSentence ? language : undefined}>{o}</span>
          </button>
        ))}
      </div>
      {given !== null && (
        <div className="stack gap-2" role="status">
          <p className={given === item.answer ? 'small' : 'cross-warn'}>
            <strong>{given === item.answer ? 'Doğru!' : 'Olmadı.'}</strong> {item.why}
          </p>
          {index + 1 < items.length && (
            <div className="row">
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => {
                  setIndex(index + 1)
                  setGiven(null)
                }}
              >
                Bir tane daha
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
