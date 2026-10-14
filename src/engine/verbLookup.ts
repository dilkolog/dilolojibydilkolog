import { typedCompound } from './textForms'
import { TENSE_BRIEF } from './tenseBrief'
import { analyzeForm, subjectLabel, tensesLoaded } from './tenses'
import type { TargetLanguage } from './types'

/**
 * The verbs a typed conjugated form belongs to, from the verb tables (loaded first): "renuncio" →
 * renunciar (presente, yo), "j'ai mangé" → manger (passé composé). A form some tables share comes
 * with each verb it may be; empty for English, for a form no table has, or before the tables load.
 */
export function verbFormsOf(language: TargetLanguage, typed: string): { lemma: string; note: string }[] {
  if (language === 'en' || !tensesLoaded(language)) return []
  const t = typed.trim()
  if (!t) return []
  if (/\s/.test(t)) {
    const compound = typedCompound(language, t)
    return compound ? [{ lemma: compound.lemma, note: TENSE_BRIEF[compound.tense].name }] : []
  }
  const seen = new Set<string>()
  return analyzeForm(language, t).flatMap((a) => {
    if (seen.has(a.lemma)) return []
    seen.add(a.lemma)
    const who = a.persons.length ? subjectLabel(language, a.tense, a.persons[0]).split(' / ')[0] : ''
    return [{ lemma: a.lemma, note: [TENSE_BRIEF[a.tense].name, who].filter(Boolean).join(', ') }]
  })
}
