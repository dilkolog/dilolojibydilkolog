import { cardCompleteness, CARD_PARTS, type CardPart } from '../engine/completeness'
import type { VocabularyEntry } from '../engine/types'

/** Where each missing part is added on the word page (an element id; the note is a field to type in). */
const TARGET: Record<CardPart, string> = { image: 'word-media', audio: 'word-media', example: 'word-examples', note: 'w-notes' }

/** A thin bar for how full the card is, and a chip for each thing still missing that scrolls to where it is added. */
export function CardCompleteness({ entry }: { entry: VocabularyEntry }) {
  const { percent, missing } = cardCompleteness(entry)
  const go = (part: CardPart) => {
    const el = document.getElementById(TARGET[part])
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) el.focus({ preventScroll: true })
  }
  return (
    <div className="card-fill">
      <div className="card-fill-head">
        <span className="small">Kart doluluğu</span>
        <strong className="small">%{percent}</strong>
      </div>
      <div className="card-fill-track" role="progressbar" aria-label="Kart doluluğu" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
        <span style={{ width: `${percent}%` }} />
      </div>
      {missing.length > 0 && (
        <ul className="card-fill-chips">
          {CARD_PARTS.filter(({ part }) => missing.includes(part)).map(({ part, add }) => (
            <li key={part}>
              <button type="button" className="chip chip-sm" onClick={() => go(part)}>
                {add}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
