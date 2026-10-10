import type { SessionNoteRequest } from '../ai/types'
import type { SessionSummary } from './session'
import type { VocabularyEntry } from './types'

/** Fewer mistakes than this are no pattern: no remark is offered. */
export const MIN_MISTAKES = 3

/** The most missed words listed for the remark. */
const MAX_WORDS = 8

/**
 * What a session's mistakes look like to a teacher: the kinds of error, then the words missed.
 * Null when there were too few mistakes (or the session had no words of the learner's own).
 */
export function sessionDigest(summary: SessionSummary, byId: ReadonlyMap<string, VocabularyEntry>, errorName: (type: string) => string): SessionNoteRequest | null {
  const missed = summary.words.filter((w) => w.wrong > 0 && byId.has(w.entryId)).sort((a, b) => b.wrong - a.wrong)
  const wrong = summary.answered - summary.correct
  const first = byId.get(summary.words.find((w) => byId.has(w.entryId))?.entryId ?? '')
  if (!first || wrong < MIN_MISTAKES || !missed.length) return null
  const kinds = Object.entries(summary.errors).sort((a, b) => b[1] - a[1]).map(([t, n]) => `${errorName(t)} ×${n}`)
  const words = missed.slice(0, MAX_WORDS).map((w) => {
    const e = byId.get(w.entryId)!
    return `${e.lemma} (${e.senses[0]?.gloss ?? ''}): ${w.wrong} wrong`
  })
  return { language: first.language, answers: summary.answered, wrong, lines: [...(kinds.length ? [`Error kinds: ${kinds.join(', ')}`] : []), 'Words missed:', ...words] }
}
