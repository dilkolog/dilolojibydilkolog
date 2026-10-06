import type { VocabularyEntry } from '../engine/types'
import { BoltIcon } from './icons'
import { PosTag } from './PosTag'
import { WrittenForm } from './WrittenForm'

/**
 * A word as it is written wherever it is listed: the gender-tinted article and lemma in the language's
 * own face, the hard-word bolt, and (when asked) the part of speech as its small shape.
 * One look for the list, the mistakes, the session summary and the recall list.
 */
export function WordLabel({ entry, pos = false, className }: { entry: VocabularyEntry; pos?: boolean; className?: string }) {
  return (
    <span className={`word-label${className ? ` ${className}` : ''}`} lang={entry.language}>
      <WrittenForm entry={entry} />
      {pos && entry.partOfSpeech !== 'other' && <PosTag pos={entry.partOfSpeech} />}
      {entry.difficult && <BoltIcon size={14} solid className="difficult-mark" />}
    </span>
  )
}
