import type { TargetLanguage, VocabularyEntry } from './types'

/**
 * Word-family practice: from a relative and a meaning, pick the right derived form. The wrong
 * options swap the suffix for another common one (décision → décidement, décidance), which is
 * exactly where learners go wrong with word families.
 */
const SUFFIXES: Record<TargetLanguage, string[]> = {
  en: ['ation', 'ition', 'tion', 'sion', 'ment', 'ness', 'ity', 'ance', 'ence', 'able', 'ible', 'ive', 'al', 'er', 'or', 'ly', 'ing', 'ed', 'ful', 'less', 'e'],
  fr: ['ation', 'ition', 'tion', 'sion', 'ement', 'ment', 'age', 'ance', 'ence', 'ité', 'eur', 'euse', 'able', 'ible', 'if', 'ive', 'el', 'elle', 'eux', 'er', 'ir', 're', 'é'],
  es: ['ación', 'ición', 'ción', 'sión', 'miento', 'mente', 'anza', 'encia', 'ancia', 'dad', 'dor', 'dora', 'able', 'ible', 'ivo', 'iva', 'oso', 'osa', 'ar', 'er', 'ir', 'ado'],
}
/** Suffixes offered as replacements: the productive, plausible ones. */
const SWAPS: Record<TargetLanguage, string[]> = {
  en: ['tion', 'sion', 'ment', 'ness', 'ity', 'ance', 'ence', 'al', 'ive', 'able'],
  fr: ['tion', 'sion', 'ment', 'age', 'ance', 'ence', 'ité', 'eur', 'able', 'if'],
  es: ['ción', 'sión', 'miento', 'anza', 'encia', 'dad', 'dor', 'able', 'ivo', 'oso'],
}

/** Plausible but wrong forms of `word` with another suffix on the same stem (up to `count`). */
export function suffixVariants(word: string, language: TargetLanguage, count = 3): string[] {
  const lower = word.toLocaleLowerCase(language)
  const suffix = SUFFIXES[language].filter((s) => lower.endsWith(s) && lower.length - s.length >= 3).sort((a, b) => b.length - a.length)[0] ?? ''
  const stem = lower.slice(0, lower.length - suffix.length)
  const out: string[] = []
  for (const s of SWAPS[language]) {
    if (s === suffix) continue
    // Avoid double letters at the seam that no one would write (décidaable).
    const form = stem.endsWith(s[0]) && 'aeiouéá'.includes(s[0]) ? stem + s.slice(1) : stem + s
    if (form !== lower && !out.includes(form)) out.push(form)
  }
  // Spread the choice: a short suffix list would otherwise always offer the same first three.
  const seed = [...lower].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7)
  return out.sort((a, b) => ((a.length * 7 + seed) % 11) - ((b.length * 7 + seed) % 11)).slice(0, count)
}

/** A linked relative of the entry (added from its family), to show in the prompt. */
export function familyRelative(entry: VocabularyEntry): { lemma: string; gloss: string } | undefined {
  return entry.wordFamily.find((m) => m.entryId && m.lemma.toLocaleLowerCase() !== entry.lemma.toLocaleLowerCase())
}
