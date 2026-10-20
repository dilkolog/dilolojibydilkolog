import type { IrregularVerb, PhrasalVerb } from '../engine/englishVerbs'

const FILES = import.meta.glob<{ verbs: unknown[] }>('./englishVerbs/*.json', { import: 'default', eager: true })

/** The irregular verbs and phrasal verbs of the English verb lab (ui/verbs/EnglishVerbs). */
export const irregularVerbs = (FILES['./englishVerbs/irregular.json']?.verbs ?? []) as IrregularVerb[]
export const phrasalVerbs = (FILES['./englishVerbs/phrasal.json']?.verbs ?? []) as PhrasalVerb[]
