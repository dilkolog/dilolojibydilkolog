import type { Cue } from './subtitles'

/**
 * Following a listening text sentence by sentence: when each sentence starts in the audio. With
 * timed subtitles the sentences are laid over the cues (exact); without them, a sentence starts
 * as far into the audio as it is into the text (approximate, good for steadily read news).
 */
const norm = (s: string) => s.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')

/** Start time (seconds) of each sentence; null when it can't be told (no cues and no duration yet). */
export function sentenceTimes(sentences: readonly string[], cues: readonly Cue[] | undefined, duration: number | undefined): number[] | null {
  const lengths = sentences.map((s) => norm(s).length)
  const offsets = lengths.map((_, i) => lengths.slice(0, i).reduce((a, b) => a + b, 0))
  const total = Math.max(1, lengths.reduce((a, b) => a + b, 0))
  if (cues?.length) {
    // The cues' text in one string, each cue's place in it.
    const spans: { from: number; start: number }[] = []
    let all = ''
    for (const c of cues) {
      spans.push({ from: all.length, start: c.start })
      all += norm(c.text)
    }
    const timeAt = (pos: number) => {
      let i = spans.length - 1
      while (i > 0 && spans[i].from > pos) i--
      const here = spans[i]
      const next = spans[i + 1]
      const width = (next?.from ?? all.length) - here.from
      const gap = next ? next.start - here.start : 2
      return here.start + (width > 0 ? ((pos - here.from) / width) * gap : 0)
    }
    let cursor = 0
    return sentences.map((s, i) => {
      const head = norm(s).slice(0, 24)
      const found = head ? all.indexOf(head, cursor) : -1
      // Found: its exact place; lost: where the text so far puts it.
      const pos = found >= 0 ? found : Math.min(all.length - 1, Math.round((offsets[i] / total) * all.length))
      if (found >= 0) cursor = found + head.length
      return Math.max(0, timeAt(Math.max(0, pos)))
    })
  }
  if (!duration || !Number.isFinite(duration)) return null
  return offsets.map((o) => (o / total) * duration)
}

/** The sentence being heard at `t`: the last one started (a moment early, so it lights as it begins). */
export function sentenceAt(times: readonly number[], t: number): number {
  let i = -1
  for (let k = 0; k < times.length; k++) if (times[k] <= t + 0.25) i = k
  return i
}
