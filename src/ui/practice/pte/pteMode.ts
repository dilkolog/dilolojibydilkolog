import type { PteScore } from '../../../engine/pteScore'

/** Practice (no clock, replay as often as wanted, the default) or exam (the exam's times, the recording heard once). */
export type PteMode = 'practice' | 'exam'

const MODE_KEY = 'diloloji:pte-mode'

export function readPteMode(): PteMode {
  try {
    return localStorage.getItem(MODE_KEY) === 'exam' ? 'exam' : 'practice'
  } catch {
    return 'practice'
  }
}

export function savePteMode(mode: PteMode) {
  try {
    localStorage.setItem(MODE_KEY, mode)
  } catch {
    // Without storage the choice is just not kept.
  }
}

/** What an item component hands back: its points and, for the feedback, what the learner wrote or said. */
export interface PteAnswer {
  score: PteScore
  given?: string
  /** Fill in the blanks: the choice in each blank. */
  chosen?: (string | undefined)[]
  /** Read aloud: scored by the pronunciation check (0–100), not by the words said. */
  pronunciation?: boolean
}

export interface PteItemProps<T> {
  item: T
  mode: PteMode
  onAnswer: (answer: PteAnswer) => void
  /** Leaves the item without a score (a device that cannot do the task). */
  onSkip: () => void
}
