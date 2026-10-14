import type { ConjugationExplainRequest } from '../ai/types'
import { diagnose, ERROR_TEXT, type ErrorKind } from './formDiagnosis'
import { formFeedback } from './tenseGuide'
import { TENSE_BRIEF } from './tenseBrief'
import { conjugateTense, subjectLabel, withSubject, type Tense } from './tenses'

/** Slips the app already explains in full (a missing accent, a letter or two): not worth asking the AI. */
const SAID_ENOUGH: ReadonlySet<ErrorKind> = new Set(['accent', 'typo'])

/**
 * What the AI is told of a wrong conjugation: the verb, the asked form, what was typed, the app's
 * own diagnosis and the whole tense (so the answer leans on real forms, not invented ones).
 * Undefined when there is nothing worth explaining or no table to explain it with.
 */
export function explainRequest(language: 'fr' | 'es', verb: string, tense: Tense, person: number, typed: string): ConjugationExplainRequest | undefined {
  const given = typed.trim()
  if (!given) return undefined
  const entry = { language, lemma: verb, partOfSpeech: 'verb' as const }
  const forms = conjugateTense(entry, tense)
  if (!forms?.[person]) return undefined
  const kind = diagnose(entry, tense, person, given)
  if (SAID_ENOUGH.has(kind)) return undefined
  return {
    language,
    verb,
    tense: TENSE_BRIEF[tense].name,
    subject: subjectLabel(language, tense, person),
    expected: withSubject(language, tense, person, forms[person]),
    typed: given,
    kind: ERROR_TEXT[kind].name,
    note: formFeedback(entry, tense, given),
    table: forms.map((f, p) => (f ? withSubject(language, tense, p, f) : '')).filter(Boolean),
  }
}

/** One key per asked form and answer, so the same mistake is explained once. */
export const explainKey = (r: ConjugationExplainRequest) => [r.language, r.verb, r.tense, r.subject, r.typed.toLocaleLowerCase(r.language)].join('|')
