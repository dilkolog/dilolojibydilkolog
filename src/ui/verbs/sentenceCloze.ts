import { unpackSentences } from '../../data/wordpack'
import type { PackRecord } from '../../data/wordpackBuild'
import { conjugateTense, type Tense } from '../../engine/tenses'
import { verbEntry, type LabLanguage } from './labShared'

/** A real sentence with one conjugated form of a verb taken out, to be written back. */
export interface Cloze {
  verb: string
  tense: Tense
  before: string
  form: string
  after: string
  translation: string
}

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * The sentences that use the verb in one of `tenses` (tried in that order, so the core tenses win
 * when a form belongs to several), with that form cut out. A compound form ("ai parlé", "he
 * hablado") is found across the space; an infinitive or a gerund isn't a tense and is skipped.
 */
export function clozesFor(
  language: LabLanguage,
  verb: string,
  sentences: readonly (readonly [string, string])[] | PackRecord['c'],
  tenses: readonly Tense[],
): Cloze[] {
  const items = (unpackSentences(sentences as PackRecord['c']) ?? sentences) as readonly (readonly [string, string])[]
  const entry = verbEntry(language, verb)
  // Longer forms first: "ai parlé" before "ai", so a compound tense is taken whole.
  const forms = tenses
    .flatMap((tense) => [...new Set(conjugateTense(entry, tense) ?? [])].filter(Boolean).map((form) => ({ tense, form })))
    .map((f, order) => ({ ...f, order }))
    .sort((a, b) => b.form.length - a.form.length || a.order - b.order)
  const out: Cloze[] = []
  for (const [text, translation] of items) {
    for (const { tense, form } of forms) {
      const m = new RegExp(`(?<![\\p{L}])${escape(form).replace(/ /g, '\\s+')}(?![\\p{L}])`, 'iu').exec(text)
      if (!m) continue
      out.push({ verb, tense, before: text.slice(0, m.index), form: m[0], after: text.slice(m.index + m[0].length), translation })
      break
    }
  }
  return out
}

/** Right when it is the form that was taken out (capitals aside). */
export const clozeRight = (cloze: Cloze, typed: string, language: LabLanguage) =>
  typed.trim().replace(/\s+/g, ' ').normalize('NFC').toLocaleLowerCase(language) === cloze.form.replace(/\s+/g, ' ').normalize('NFC').toLocaleLowerCase(language)
