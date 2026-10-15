/**
 * The order of a round of flashcards, learnt the Memrise way: a card not known comes back a few
 * cards later (not only at the end) until it is known; a hard one comes back once, a little later.
 */

/** 0: didn't know, 1: knew it with effort, 2: knew it. */
export type FlashGrade = 0 | 1 | 2

/** Cards to wait before a card comes back: soon when not known, later when hard. */
export const COME_BACK_AFTER: Record<Exclude<FlashGrade, 2>, number> = { 0: 3, 1: 6 }
/** A card comes back at most this many times in one round (then the round moves on). */
export const MAX_RETURNS = 3

/**
 * The queue after the first card is graded. `returns` is how often that card has come back already.
 * A known card leaves; a missed one is put back COME_BACK_AFTER cards on (or last); a hard one once.
 */
export function requeue<T>(queue: readonly T[], grade: FlashGrade, returns: number): T[] {
  const [card, ...rest] = queue
  if (card === undefined) return []
  if (grade === 2 || returns >= MAX_RETURNS || (grade === 1 && returns > 0)) return rest
  const at = Math.min(COME_BACK_AFTER[grade], rest.length)
  return [...rest.slice(0, at), card, ...rest.slice(at)]
}
