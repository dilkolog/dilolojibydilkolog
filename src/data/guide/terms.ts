import type { TargetLanguage } from '../../engine/types'

/** A grammar term of the guide: what it is called in the language, in Turkish, and what it means. */
export interface GuideTerm {
  term: string
  aliases?: string[]
  tr: string
  explanation: string
  example?: { text: string; tr: string }
}

interface GuideTermsFile {
  language: TargetLanguage
  source: string
  terms: GuideTerm[]
}

const FILES = import.meta.glob<GuideTermsFile>('./terms/*.json', { eager: true, import: 'default' })

/** The terms of a language (empty when it has none). */
export function termsOf(language: TargetLanguage): GuideTerm[] {
  return Object.values(FILES).find((f) => f.language === language)?.terms ?? []
}

/** Lower case, no accents, every run of other characters one space: text and terms compare on equal terms. */
const plain = (text: string): string =>
  ` ${text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()} `

/** At most this many terms are offered for one lesson. */
export const MAX_LESSON_TERMS = 8

/**
 * The terms a lesson's text uses, in the order they first appear: a term (or one of its aliases, or its Turkish name when
 * that has more than one word) written out whole in the texts, whatever the accents or capitals. A longer term hides the shorter ones it contains ("présent de
 * l'indicatif" over "présent").
 */
export function termsIn(terms: readonly GuideTerm[], texts: readonly string[]): GuideTerm[] {
  const haystack = plain(texts.join(' \n '))
  const found: { term: GuideTerm; at: number; length: number }[] = []
  for (const term of terms) {
    let best = -1
    let length = 0
    // The Turkish name counts too when it is more than a common word ("belirli artikel", not "uyum").
    for (const name of [term.term, ...(term.aliases ?? []), ...(term.tr.trim().includes(' ') ? [term.tr] : [])]) {
      const needle = plain(name)
      const at = haystack.indexOf(needle)
      if (at >= 0 && (best < 0 || at < best)) {
        best = at
        length = needle.length
      }
    }
    if (best >= 0) found.push({ term, at: best, length })
  }
  // A term inside the span of a longer one that was found is dropped.
  const kept = found.filter((f) => !found.some((g) => g !== f && g.length > f.length && f.at >= g.at && f.at + f.length <= g.at + g.length))
  return kept.sort((a, b) => a.at - b.at).slice(0, MAX_LESSON_TERMS).map((f) => f.term)
}

/** The texts of a lesson that name its terms: what is explained, not the example sentences. */
export function lessonTexts(lesson: { summary: string; rules: string[]; watch: string[]; tip?: string; table?: { head: string[]; rows: string[][] } }): string[] {
  return [lesson.summary, ...lesson.rules, ...lesson.watch, lesson.tip ?? '', ...(lesson.table ? [...lesson.table.head, ...lesson.table.rows.flat()] : [])]
}
