import { typedCompound } from './textForms'
import { TENSE_BRIEF } from './tenseBrief'
import { analyzeFormLoose, subjectLabel, tensesLoaded, type Tense } from './tenses'
import type { TargetLanguage } from './types'

/**
 * The verbs a typed conjugated form belongs to, from the verb tables (loaded first): "renuncio" →
 * renunciar (presente, yo), "j'ai mangé" → manger (passé composé). A form some tables share comes
 * with each verb it may be; empty for English, for a form no table has, or before the tables load.
 */
export interface VerbFormHit {
  lemma: string
  /** The tense and person in words: "presente de subjuntivo, tú". */
  note: string
  tense: Tense
  /** The first person it stands for; none for a form without one (infinitif passé). */
  person?: number
}

export function verbFormsOf(language: TargetLanguage, typed: string): VerbFormHit[] {
  if (language === 'en' || !tensesLoaded(language)) return []
  const t = typed.trim()
  if (!t) return []
  if (/\s/.test(t)) {
    const compound = typedCompound(language, t)
    return compound ? [{ lemma: compound.lemma, note: TENSE_BRIEF[compound.tense].name, tense: compound.tense }] : []
  }
  return analyzeFormLoose(language, t).map((a) => {
    const who = a.persons.length ? subjectLabel(language, a.tense, a.persons[0]).split(' / ')[0] : ''
    return { lemma: a.lemma, note: [TENSE_BRIEF[a.tense].name, who].filter(Boolean).join(', '), tense: a.tense, ...(a.persons.length ? { person: a.persons[0] } : {}) }
  })
}
