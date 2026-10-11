import { pickWeighted, type GrammarLog } from './grammar'
import type { TargetLanguage } from './types'

/**
 * Text flow: a short paragraph whose turning-point connectors are missing ("however", "that is why",
 * "although"). Choosing each one asks for the direction of the thought (contrast, cause, concession),
 * not a single sentence's grammar: what B2/C1 writing and speaking is made of.
 */
export interface FlowGap {
  answer: string
  /** The answer and the wrong ones, in a fixed order (the screen shuffles them). */
  options: string[]
  /** The direction of the thought this connector gives, in Turkish: contrast, cause, concession… */
  kind: string
  /** Why this one and not the others, in Turkish. */
  why: string
}

export interface FlowItem {
  id: string
  language: TargetLanguage
  /** The paragraph; gaps are `{1}`, `{2}`… in the order of `gaps`. */
  text: string
  /** The whole paragraph in Turkish. */
  tr: string
  gaps: FlowGap[]
  source: string
}

export const FLOW_ROUND = 3

/** The key of one gap in the learner's log. */
export const flowGapId = (item: FlowItem, gap: number) => `${item.id}|${gap + 1}`

export type FlowPart = { text: string } | { gap: number }

/** The paragraph cut at its gaps. */
export function flowParts(item: FlowItem): FlowPart[] {
  const out: FlowPart[] = []
  for (const piece of item.text.split(/(\{\d+\})/)) {
    const m = /^\{(\d+)\}$/.exec(piece)
    if (m) out.push({ gap: Number(m[1]) - 1 })
    else if (piece) out.push({ text: piece })
  }
  return out
}

export function shuffledOptions(gap: FlowGap, rng: () => number): string[] {
  const out = [...gap.options]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** A round of paragraphs; the ones whose gaps went wrong before come first (see pickWeighted). */
export function flowRound(items: readonly FlowItem[], log: GrammarLog, language: TargetLanguage, rng: () => number, size = FLOW_ROUND): FlowItem[] {
  const pool = items.filter((i) => i.language === language)
  // One record per paragraph, added up from its gaps, so the paragraph as a whole is weighed.
  const sums: GrammarLog = {}
  for (const item of pool) {
    let ok = 0
    let wrong = 0
    let last = ''
    item.gaps.forEach((_, n) => {
      const r = log[flowGapId(item, n)]
      if (!r) return
      ok += r.ok
      wrong += r.wrong
      if (r.last > last) last = r.last
    })
    if (ok + wrong > 0) sums[item.id] = { ok, wrong, last }
  }
  return pickWeighted(pool, sums, rng, size)
}
