import type { TargetLanguage } from './types'

/**
 * Everyday dialogues (a café, a hotel, the doctor…): the other person speaks, the learner picks the one fitting reply
 * of three, and learns why the tempting wrong one is wrong. Written content, no AI: it works offline and keyless.
 */

export type DialogueLevel = 'A1' | 'A2' | 'B1' | 'B2'

export interface DialogueTurn {
  /** What the other person says, in the language. */
  say: string
  tr: string
  options: [string, string, string]
  answer: 0 | 1 | 2
  /** Why the reply fits, and what is wrong with the tempting one (Turkish). */
  why: string
  /** The right reply in Turkish. */
  replyTr: string
}

export interface Dialogue {
  id: string
  language: TargetLanguage
  level: DialogueLevel
  title: string
  scene: string
  turns: DialogueTurn[]
}

/** Best share right per dialogue (0–1). */
export type DialogueScores = Record<string, number>

/** The dialogues to offer, of one level or all: never tried first (easier first), then the ones that went worst. */
export function dialogueOrder(all: readonly Dialogue[], scores: DialogueScores, language: TargetLanguage, level?: DialogueLevel): Dialogue[] {
  const order: DialogueLevel[] = ['A1', 'A2', 'B1', 'B2']
  return all
    .filter((d) => d.language === language && (!level || d.level === level))
    .map((d, i) => ({ d, i }))
    .sort((a, b) => {
      const sa = scores[a.d.id]
      const sb = scores[b.d.id]
      if ((sa === undefined) !== (sb === undefined)) return sa === undefined ? -1 : 1
      if (sa !== undefined && sb !== undefined && sa !== sb) return sa - sb
      return order.indexOf(a.d.level) - order.indexOf(b.d.level) || a.i - b.i
    })
    .map((x) => x.d)
}

/** A finished dialogue keeps its best result. */
export function recordDialogue(scores: DialogueScores, id: string, share: number): DialogueScores {
  return { ...scores, [id]: Math.max(scores[id] ?? 0, Math.max(0, Math.min(1, share))) }
}
