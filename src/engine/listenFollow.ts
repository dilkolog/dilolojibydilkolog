import type { Cue } from './subtitles'

/**
 * Following a listening text sentence by sentence: when each sentence starts in the audio. With
 * timed subtitles the sentences are laid over the cues (exact); without them, a sentence starts
 * about as far into the audio as it is into the text (approximate), counting the pauses a reader
 * makes: after a sentence, at a comma, between paragraphs (a story's page turn), and the lead-in
 * before the first words. The learner can pin a sentence to the moment it is heard (an anchor):
 * the estimate shifts to fit, between pins by interpolation.
 */
const norm = (s: string) => s.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, '')

/** A sentence the learner heard at a known moment of the audio. */
export interface SyncAnchor {
  sentence: number
  time: number
}

export interface FollowOptions {
  /** Which sentences open a paragraph (a pause comes before them). */
  paragraphStarts?: readonly boolean[]
  anchors?: readonly SyncAnchor[]
}

// The pauses, in letters' worth of speech: roughly what a reader takes at each.
const LEAD_IN = 10
const TAIL = 8
const SENTENCE_END = 6
const SOFT_PAUSE = 2
const PARAGRAPH_GAP = 10

/** Where each sentence starts when the audio is read steadily, pauses included (no cues). */
function readingTimes(sentences: readonly string[], duration: number, paragraphStarts: readonly boolean[] | undefined): number[] {
  const speech = sentences.map((s) => norm(s).length + (/[.!?…]["»”’')\]]*\s*$/.test(s.trim()) ? SENTENCE_END : 0) + (s.match(/[,;:–—]/g)?.length ?? 0) * SOFT_PAUSE)
  const gaps: number[] = sentences.map((_, i) => (i > 0 && paragraphStarts?.[i] ? PARAGRAPH_GAP : 0))
  const total = Math.max(1, LEAD_IN + speech.reduce((a, b) => a + b, 0) + gaps.reduce((a, b) => a + b, 0) + TAIL)
  let at = LEAD_IN
  return sentences.map((_, i) => {
    at += gaps[i]
    const start = at
    at += speech[i]
    return (start / total) * duration
  })
}

/** The estimate moved so each pinned sentence starts when it was heard; in between, the shift slides from one pin to the next. */
export function withAnchors(times: readonly number[], anchors: readonly SyncAnchor[] | undefined): number[] {
  const pins = [...(anchors ?? [])].filter((a) => a.sentence >= 0 && a.sentence < times.length).sort((a, b) => a.sentence - b.sentence)
  if (!pins.length) return [...times]
  const shifts = pins.map((a) => ({ at: a.sentence, delta: a.time - times[a.sentence] }))
  const out = times.map((t, i) => {
    let k = shifts.findIndex((s) => s.at >= i)
    if (k < 0) return t + shifts[shifts.length - 1].delta
    if (k === 0) return t + shifts[0].delta
    const lo = shifts[k - 1]
    const hi = shifts[k]
    const share = hi.at === lo.at ? 1 : (i - lo.at) / (hi.at - lo.at)
    return t + lo.delta + (hi.delta - lo.delta) * share
  })
  // Never backwards, never before the start.
  let last = 0
  return out.map((t) => (last = Math.max(last, t, 0)))
}

/** Start time (seconds) of each sentence; null when it can't be told (no cues and no duration yet). */
export function sentenceTimes(sentences: readonly string[], cues: readonly Cue[] | undefined, duration: number | undefined, options: FollowOptions = {}): number[] | null {
  const base = baseTimes(sentences, cues, duration, options.paragraphStarts)
  return base && options.anchors?.length ? withAnchors(base, options.anchors) : base
}

function baseTimes(sentences: readonly string[], cues: readonly Cue[] | undefined, duration: number | undefined, paragraphStarts: readonly boolean[] | undefined): number[] | null {
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
  return readingTimes(sentences, duration, paragraphStarts)
}

/** The sentence being heard at `t`: the last one started (a moment early, so it lights as it begins). */
export function sentenceAt(times: readonly number[], t: number): number {
  let i = -1
  for (let k = 0; k < times.length; k++) if (times[k] <= t + 0.25) i = k
  return i
}
