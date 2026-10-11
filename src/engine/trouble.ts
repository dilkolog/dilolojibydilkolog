import { earKey, stillMissed, type EarLog } from './earMisses'
import { PRON_GOOD, weakPronWords, type PronScore } from './pronWeak'
import type { TargetLanguage, VocabularyEntry } from './types'

/** A word the learner struggles with by ear or by voice, and how much. */
export interface Trouble {
  /** `ear`: missed when dictating; `voice`: pronunciation scored low. The ear comes first. */
  kind: 'ear' | 'voice'
  weight: number
}

/**
 * The list words that show trouble outside the reviews: dictation misses (the word is among the
 * ones still missed) and low pronunciation scores. The day's plan brings them back with a listening
 * question. A word with both counts as an ear problem.
 */
export function troubleWords(
  vocabulary: readonly VocabularyEntry[],
  language: TargetLanguage,
  earLog: EarLog,
  pronScores: Readonly<Record<string, readonly PronScore[]>>,
): Map<string, Trouble> {
  const out = new Map<string, Trouble>()
  const missed = new Map(Object.entries(earLog[language] ?? {}).filter(([, m]) => stillMissed(m)).map(([w, m]) => [w, m.n - m.ok]))
  if (missed.size)
    for (const entry of vocabulary) {
      if (entry.language !== language) continue
      // The word itself, or a form it was met in, in any of its senses (a conjugated or plural form of it).
      const keys = [entry.lemma, ...entry.senses.flatMap((s) => s.examples ?? []).map((e) => e.form)].map((w) => earKey(w, language)).filter(Boolean)
      const weight = Math.max(0, ...keys.map((k) => missed.get(k) ?? 0))
      if (weight > 0) out.set(entry.id, { kind: 'ear', weight })
    }
  for (const w of weakPronWords(pronScores, vocabulary, language, 1000))
    if (!out.has(w.entry.id)) out.set(w.entry.id, { kind: 'voice', weight: (PRON_GOOD - w.recent) / 25 })
  return out
}
