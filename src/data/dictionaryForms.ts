import { irregularVerbs } from './englishVerbs'
import { attachedPronouns } from '../engine/attachedPronouns'
import { verbFormsOf } from '../engine/verbLookup'
import { analyzeImperative, subjectLabel, type Tense } from '../engine/tenses'
import { TENSE_BRIEF } from '../engine/tenseBrief'
import type { TargetLanguage } from '../engine/types'

export interface DictionaryForm { lemma: string; note: string; tense?: Tense; stem?: string; pronouns?: string[] }

export function dictionaryForms(language: TargetLanguage, typed: string): DictionaryForm[] {
  const word = typed.trim().toLowerCase()
  if (language === 'en') return irregularVerbs.flatMap(v => {
    const forms: DictionaryForm[] = []
    if (v.past.includes(word)) forms.push({ lemma: v.base, note: 'Past simple · geçmiş zaman' })
    if (v.pp.includes(word)) forms.push({ lemma: v.base, note: 'Past participle · geçmiş zaman ortacı' })
    return forms
  })
  const direct: DictionaryForm[] = verbFormsOf(language, typed)
  if (direct.length) return direct
  let fallback: DictionaryForm[] = []
  for (const split of attachedPronouns(typed, language)) {
    const imperative = analyzeImperative(language, split.stem).map(a => ({ lemma: a.lemma, tense: a.tense, note: `${TENSE_BRIEF[a.tense].tr} · ${subjectLabel(language, a.tense, a.persons[0])}` }))
    if (imperative.length) return imperative.map(f => ({ ...f, stem: split.stem, pronouns: split.pronouns }))
    if (!fallback.length) fallback = verbFormsOf(language, split.stem).map(f => ({ ...f, stem: split.stem, pronouns: split.pronouns }))
    if (language === 'es' && /(?:ar|er|ir)$/.test(split.stem)) return [{ lemma: split.stem, note: 'Mastar + bitişik zamir', ...split }]
  }
  return fallback
}
