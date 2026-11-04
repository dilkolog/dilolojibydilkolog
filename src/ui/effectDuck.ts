/**
 * The link between word audio and sound effects, kept apart so speech.ts need not load the sounds (and the other way
 * round): when a word or sentence starts to sound, the effects' tails are turned down so the pronunciation is heard.
 */
let ducker: (() => void) | null = null

export function setEffectDucker(fn: () => void) {
  ducker = fn
}

/** Called as word audio starts. */
export function duckEffects() {
  try {
    ducker?.()
  } catch {
    // Effects are a nicety: never let them stop the word.
  }
}
