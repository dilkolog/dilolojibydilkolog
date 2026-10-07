import { useMemo, useState } from 'react'
import { createRng, shuffle } from '../engine/rng'
import type { TargetLanguage } from '../engine/types'
import { SpeakerIcon } from './icons'
import { canSpeak, speak } from './speech'

export interface LessonItem {
  /** The word as the dictionary has it (aller for "allons"). */
  word: string
  meaning: string
}

/**
 * A two-minute lesson before reading: the text's key words one by one with their meaning and sound,
 * then matched to their meanings. Nothing is added to the list unless the learner chooses it at the
 * end, where the words they missed are offered.
 */
export function PreReadingLesson({ language, items, onAdd, onClose }: { language: TargetLanguage; items: readonly LessonItem[]; onAdd: (word: string) => void; onClose: () => void }) {
  const [step, setStep] = useState<'meet' | 'match' | 'done'>('meet')
  const [index, setIndex] = useState(0)
  const [missed, setMissed] = useState<ReadonlySet<string>>(new Set())
  return (
    <div className="stack" aria-live="polite">
      {step === 'meet' && (
        <MeetStep
          language={language}
          item={items[index]}
          position={`${index + 1} / ${items.length}`}
          last={index === items.length - 1}
          onNext={() => (index === items.length - 1 ? setStep('match') : setIndex(index + 1))}
        />
      )}
      {step === 'match' && (
        <MatchStep
          language={language}
          items={items}
          onDone={(m) => {
            setMissed(m)
            setStep('done')
          }}
        />
      )}
      {step === 'done' && (
        <div className="stack gap-2 lab-result" role="status">
          <h3>
            {items.length - missed.size} / {items.length} ilk denemede doğru
          </h3>
          {missed.size > 0 ? (
            <>
              <p className="small muted">Karıştırdıklarını listene ekleyip tekrarlarına alabilirsin:</p>
              <div className="choice-row" role="group" aria-label="Karıştırdıkların">
                {[...missed].map((w) => (
                  <button key={w} type="button" className="chip chip-sm" lang={language} onClick={() => onAdd(w)}>
                    + {w}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="small muted">Hepsi yerinde: metinde onları göreceksin.</p>
          )}
          <div>
            <button type="button" className="btn" autoFocus onClick={onClose}>
              Okumaya geç
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function MeetStep({ language, item, position, last, onNext }: { language: TargetLanguage; item: LessonItem; position: string; last: boolean; onNext: () => void }) {
  return (
    <div className="stack gap-2">
      <p className="small muted">{position} · tanış</p>
      <div className="row">
        <p className="word" lang={language} style={{ margin: 0 }}>
          {item.word}
        </p>
        {canSpeak() && (
          <button type="button" className="speak" onClick={() => speak(item.word, language)} aria-label="Sesli dinle">
            <SpeakerIcon size={20} />
          </button>
        )}
      </div>
      <p className="gloss">{item.meaning}</p>
      <div>
        <button type="button" className="btn" autoFocus onClick={onNext}>
          {last ? 'Eşleştirmeye geç' : 'Sonraki'}
        </button>
      </div>
    </div>
  )
}

/** Each word to its meaning; a wrong pair marks the word as missed (it stays to be matched). */
function MatchStep({ language, items, onDone }: { language: TargetLanguage; items: readonly LessonItem[]; onDone: (missed: ReadonlySet<string>) => void }) {
  const right = useMemo(() => shuffle([...items], createRng(Date.now())), [items])
  const [pick, setPick] = useState<string | null>(null)
  const [done, setDone] = useState<ReadonlySet<string>>(new Set())
  const [missed, setMissed] = useState<ReadonlySet<string>>(new Set())
  const [miss, setMiss] = useState<string | null>(null)
  const choose = (word: string) => {
    if (pick === null) return
    if (pick === word) {
      const next = new Set(done).add(word)
      setDone(next)
      if (next.size === items.length) onDone(missed)
    } else {
      setMissed(new Set(missed).add(pick))
      setMiss(word)
      setTimeout(() => setMiss(null), 500)
    }
    setPick(null)
  }
  return (
    <div className="stack gap-2">
      <p className="small muted">Kelimeyi seç, sonra anlamını.</p>
      <div className="lab-match">
        <div className="stack gap-2" lang={language}>
          {items.map((i) => (
            <button key={i.word} type="button" className={`lab-match-btn${done.has(i.word) ? ' is-done' : ''}${pick === i.word ? ' is-picked' : ''}`} disabled={done.has(i.word)} aria-pressed={pick === i.word} onClick={() => setPick(i.word)}>
              {i.word}
            </button>
          ))}
        </div>
        <div className="stack gap-2" lang="tr">
          {right.map((i) => (
            <button key={i.word} type="button" className={`lab-match-btn${done.has(i.word) ? ' is-done' : ''}${miss === i.word ? ' is-miss' : ''}`} disabled={done.has(i.word) || pick === null} onClick={() => choose(i.word)}>
              {i.meaning}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
