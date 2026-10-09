import { timeOf, type TargetLanguage } from './types'
import type { DiffPart } from './wordDiff'

/**
 * The words the ear misses: from every dictation, each word of the original that was not
 * written (and, for those already noted, each time it was written right after). Small words,
 * endings and linked sounds are what a listener skips; knowing which ones is what helps.
 */
export interface EarMiss {
  /** Times missed. */
  n: number
  /** Times written right since first missed. */
  ok: number
  /** Last missed (ISO). */
  last: string
  /** The sentence it was last missed in, to hear it again in context. */
  sentence: string
}

export type EarLog = Partial<Record<TargetLanguage, Record<string, EarMiss>>>

/** Words kept per language: plenty, and the log stays small. */
export const EAR_MAX = 400

/** A word as the log keys it: no punctuation, lower case. */
export const earKey = (w: string, language: TargetLanguage) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '').toLocaleLowerCase(language)

/** The log after one dictated sentence. */
export function recordDictation(log: EarLog, language: TargetLanguage, sentence: string, parts: readonly DiffPart[], now: Date): EarLog {
  const words = { ...(log[language] ?? {}) }
  for (const p of parts) {
    if (p.status === 'extra') continue
    const key = earKey(p.word, language)
    if (!key) continue
    const had = words[key]
    if (p.status === 'missed') words[key] = { n: (had?.n ?? 0) + 1, ok: had?.ok ?? 0, last: now.toISOString(), sentence }
    else if (had) words[key] = { ...had, ok: had.ok + 1 }
  }
  const kept = Object.entries(words)
    .sort((a, b) => timeOf(b[1].last) - timeOf(a[1].last))
    .slice(0, EAR_MAX)
  return { ...log, [language]: Object.fromEntries(kept) }
}

/** Still being missed: missed more often than written right since. */
export const stillMissed = (m: EarMiss) => m.n > m.ok

/** The words to train first: missed most (net of later successes), then most recently. */
export function topMisses(log: EarLog, language: TargetLanguage, k = 10): { word: string; miss: EarMiss }[] {
  return Object.entries(log[language] ?? {})
    .filter(([, m]) => stillMissed(m))
    .sort(([, a], [, b]) => b.n - b.ok - (a.n - a.ok) || timeOf(b.last) - timeOf(a.last))
    .slice(0, k)
    .map(([word, miss]) => ({ word, miss }))
}

/** Two devices' logs together: per word, the larger counts and the newer sentence. */
export function mergeEarLogs(a: EarLog = {}, b: EarLog = {}): EarLog {
  const out: EarLog = {}
  for (const language of new Set([...Object.keys(a), ...Object.keys(b)]) as Set<TargetLanguage>) {
    const words: Record<string, EarMiss> = { ...(a[language] ?? {}) }
    for (const [w, m] of Object.entries(b[language] ?? {})) {
      const had = words[w]
      words[w] = had ? { n: Math.max(had.n, m.n), ok: Math.max(had.ok, m.ok), ...(timeOf(m.last) > timeOf(had.last) ? { last: m.last, sentence: m.sentence } : { last: had.last, sentence: had.sentence }) } : m
    }
    out[language] = words
  }
  return out
}
