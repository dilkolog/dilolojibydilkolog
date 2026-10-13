import { useEffect, useRef, useState } from 'react'
import { displayForm } from '../../engine/exercises'
import type { VocabularyEntry } from '../../engine/types'
import { PosTag } from '../PosTag'
import { CheckIcon, CloseIcon } from '../icons'
import { sfx } from '../sounds'
import { modalOpen } from './keys'
import { SpeakButton, Word, Sentence } from './shared'
import { POS_ART } from '../drawnArt'

/** How far the card must travel (px) to count as a decision. */
const SWIPE_COMMIT = 90

/**
 * A word met yesterday (or earlier today) comes back as a card before its first question, so the
 * question isn't a cold start. The learner says how it feels: right (or →) "Hatırlıyorum", left
 * (or ←) "Zorlanıyorum", which adds one more easy question for the word later in the session.
 * The card is not graded and leaves no trace in the schedule.
 */
export function RefreshCard({ entry, onRemember, onStruggle }: { entry: VocabularyEntry; onRemember: () => void; onStruggle: () => void }) {
  const sense = entry.senses[0]
  const example = sense.examples[0]
  const [dx, setDx] = useState(0)
  const [leaving, setLeaving] = useState<'left' | 'right' | null>(null)
  const drag = useRef<{ x: number; moved: boolean } | null>(null)
  const decided = useRef(false)

  const decide = (ok: boolean) => {
    if (decided.current) return
    decided.current = true
    setLeaving(ok ? 'right' : 'left')
    if (ok) sfx.correct()
    setTimeout(ok ? onRemember : onStruggle, 200)
  }
  // Latest handler for the key listener, which is set up once.
  const decideRef = useRef(decide)
  decideRef.current = decide
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (modalOpen() || e.altKey || e.metaKey || e.ctrlKey || e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'ArrowRight' || e.key === 'Enter') decideRef.current(true)
      else if (e.key === 'ArrowLeft') decideRef.current(false)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const offset = leaving === 'right' ? 600 : leaving === 'left' ? -600 : dx
  return (
    <div className="stack swipe refresh">
      <p className="prompt-label">
        <span className="badge">Yeni kelime</span> <span className="small muted">Önce bir bak, sonra soru gelecek</span>
        {entry.partOfSpeech !== 'other' && <PosTag pos={entry.partOfSpeech} label className="is-chip" />}
        {POS_ART[entry.partOfSpeech] && <img className="pos-art" src={POS_ART[entry.partOfSpeech]} alt="" draggable={false} />}
      </p>
      <div className="swipe-stage refresh-stage">
        <div
          className={`swipe-card refresh-card${drag.current ? '' : ' is-settling'}`}
          style={{ transform: `translateX(${offset}px) rotate(${offset / 24}deg)` }}
          onPointerDown={(e) => {
            if (e.target instanceof Element && e.target.closest('button')) return
            drag.current = { x: e.clientX, moved: false }
            e.currentTarget.setPointerCapture(e.pointerId)
          }}
          onPointerMove={(e) => {
            if (!drag.current) return
            const d = e.clientX - drag.current.x
            if (Math.abs(d) > 6) drag.current.moved = true
            setDx(d)
          }}
          onPointerUp={() => {
            drag.current = null
            if (Math.abs(dx) >= SWIPE_COMMIT) decide(dx > 0)
            else setDx(0)
          }}
          onPointerCancel={() => {
            drag.current = null
            setDx(0)
          }}
        >
          <span className="swipe-stamp swipe-yes" style={{ opacity: Math.max(0, offset) / SWIPE_COMMIT }}>Hatırlıyorum</span>
          <span className="swipe-stamp swipe-no" style={{ opacity: Math.max(0, -offset) / SWIPE_COMMIT }}>Zorlanıyorum</span>
          <div className="row nowrap">
            <Word entry={entry} />
            <SpeakButton text={displayForm(entry)} entry={entry} auto />
          </div>
          {entry.ipa && <span className="ipa ipa-intro">{entry.ipa}</span>}
          <p className="swipe-gloss">{[sense.gloss, ...(sense.altGlosses ?? [])].join(', ')}</p>
          {example && <Sentence text={example.text} translation={example.translation} lang={entry.language} />}
        </div>
      </div>
      <div className="swipe-actions refresh-actions">
        <button className="btn btn-quiet" onClick={() => decide(false)}>
          <CloseIcon size={18} className="inline-icon" />Zorlanıyorum
        </button>
        <button className="btn grow" onClick={() => decide(true)} autoFocus>
          <CheckIcon size={18} className="inline-icon" />Hatırlıyorum
        </button>
      </div>
      <p className="kbd-legend" aria-hidden>
        <span><kbd>←</kbd> zorlanıyorum</span>
        <span><kbd>→</kbd> hatırlıyorum</span>
      </p>
    </div>
  )
}
