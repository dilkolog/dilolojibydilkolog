import type { ReactNode } from 'react'
import type { PartOfSpeech } from '../engine/types'
import { POS_NAME } from './labels'

/**
 * A part of speech as a small shape and a tone, so it is known at a glance and not by colour
 * alone: a square for nouns, a triangle for verbs, a diamond for adjectives, a ring for adverbs,
 * an arrow for prepositions, a cross for conjunctions, a small dot for pronouns, a speech bubble
 * for phrases.
 */
const SHAPE: Record<PartOfSpeech, ReactNode> = {
  noun: <rect x="2" y="2" width="8" height="8" rx="2" />,
  verb: <path d="M3 1.8 10.2 6 3 10.2z" strokeLinejoin="round" />,
  adjective: <path d="M6 1 11 6 6 11 1 6z" strokeLinejoin="round" />,
  adverb: <circle cx="6" cy="6" r="4" fill="none" strokeWidth="1.8" />,
  preposition: <path d="M1.5 6h8M6.5 2.5 10 6l-3.5 3.5" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />,
  conjunction: <path d="M6 2v8M2 6h8" fill="none" strokeWidth="1.8" strokeLinecap="round" />,
  pronoun: <circle cx="6" cy="6" r="2.2" />,
  phrase: <path d="M2 2.5h8a1 1 0 0 1 1 1V7a1 1 0 0 1-1 1H6l-2.5 2.2V8H2a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1z" strokeLinejoin="round" />,
  other: <circle cx="6" cy="6" r="1.4" />,
}

export function PosTag({ pos, label = false, className = '' }: { pos: PartOfSpeech; label?: boolean; className?: string }) {
  return (
    <span className={`pos-tag ${className}`.trim()} data-pos={pos} title={POS_NAME[pos]}>
      <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" stroke="currentColor" strokeWidth="0.5" aria-hidden>
        {SHAPE[pos]}
      </svg>
      {label ? POS_NAME[pos] : <span className="sr-only">{POS_NAME[pos]}</span>}
    </span>
  )
}
