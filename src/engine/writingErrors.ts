import { stripDiacritics } from './answerCheck'
import type { GrammarIssue } from './grammarIssues'
import type { RepairTarget } from './blindSpots'
import type { TargetLanguage } from './types'

/**
 * The writing error notebook: what the grammar checker (LanguageTool) finds in the learner's own texts, sorted into a few
 * kinds the learner can act on and counted over time, so a mistake that keeps coming back is seen as a pattern
 * ("you keep missing agreement"), not as one red underline in one text. Kept on the device.
 */
export type WritingKind = 'spelling' | 'accent' | 'agreement' | 'article' | 'preposition' | 'verb' | 'confusion' | 'wordorder' | 'punctuation' | 'other'

export const WRITING_LABEL: Record<WritingKind, string> = {
  spelling: 'Yazım',
  accent: 'Aksan',
  agreement: 'Uyum (cinsiyet, sayı, özne-fiil)',
  article: 'Artikel ve tanımlık',
  preposition: 'Edat',
  verb: 'Fiil biçimi ve zaman',
  confusion: 'Karıştırılan sözcükler',
  wordorder: 'Sözcük sırası',
  punctuation: 'Noktalama ve büyük harf',
  other: 'Diğer dil bilgisi',
}

const has = (s: string | undefined, re: RegExp) => !!s && re.test(s)

/**
 * The kind of a grammar finding (null for style hints, which are not errors). LanguageTool's rule names differ by
 * language, so the kind is read from broad word roots in the rule's id and category; what no root names is `other`.
 * A spelling mistake that is only a missing or wrong accent (French, Spanish) is its own kind.
 */
export function classifyIssue(issue: GrammarIssue, language: TargetLanguage, text: string): WritingKind | null {
  if (issue.kind === 'style') return null
  const rule = issue.ruleId ?? ''
  const category = issue.category ?? ''
  if (/^(PUNCTUATION|TYPOGRAPHY|CASING)$/i.test(category) || has(rule, /COMMA|PUNCT|UPPERCASE|CASING|WHITESPACE|APOS|QUOTE|SPACE/i)) return 'punctuation'
  if (issue.kind === 'spelling') {
    const wrong = text.slice(issue.offset, issue.offset + issue.length)
    const fix = issue.replacements[0] ?? ''
    return language !== 'en' && fix !== '' && fix !== wrong && stripDiacritics(fix).toLowerCase() === stripDiacritics(wrong).toLowerCase() ? 'accent' : 'spelling'
  }
  if (has(category, /CONFUS|HOMOPHON/i) || has(rule, /CONFUS|HOMOPHON|SIMILAR_WORD/i)) return 'confusion'
  if (has(rule, /AGR|ACCORD|CONCORD|GENDER|GENRE|NUMBER|PLUR|SINGUL|MASC|FEM/i)) return 'agreement'
  if (has(rule, /ARTICLE|(^|_)ART(_|$)|(^|_)DET(_|$)|DETERMIN|A_(VS_)?AN|AN_A|PARTITIF/i)) return 'article'
  if (has(rule, /PREP|IN_ON_AT/i)) return 'preposition'
  if (has(rule, /ORDER/i)) return 'wordorder'
  if (has(rule, /VERB|TENSE|CONJ|PAST|PERFECT|SUBJ|PARTICIP|AUX|MODAL|INFINIT|GERUND|IMPERAT|(^|_)(DID|HAVE|TO)_|PRP_|NON3/i)) return 'verb'
  return 'other'
}

export interface WritingSample {
  /** What was written, and what the checker suggested instead. */
  wrong: string
  fix: string
}

export interface WritingEntry {
  n: number
  /** The last day it happened (yyyy-mm-dd). */
  last: string
  /** A few recent examples, newest first. */
  samples: WritingSample[]
  /** The mistakes already counted today: a text checked again after a fix does not count the same slip twice (`wrong|fix|day`). */
  seen: string[]
}

export type WritingLog = Partial<Record<TargetLanguage, Partial<Record<WritingKind, WritingEntry>>>>

const MAX_SAMPLES = 4
const MAX_SEEN = 60
const MAX_WRONG = 60

/** The findings of one check added to the log (a new log; the old one is not changed). */
export function recordWriting(log: WritingLog, language: TargetLanguage, text: string, issues: readonly GrammarIssue[], day: string): WritingLog {
  const mine = { ...(log[language] ?? {}) }
  for (const issue of issues) {
    const kind = classifyIssue(issue, language, text)
    if (!kind) continue
    const wrong = text.slice(issue.offset, issue.offset + issue.length).trim().slice(0, MAX_WRONG)
    const fix = (issue.replacements[0] ?? '').slice(0, MAX_WRONG)
    const key = `${wrong}|${fix}|${day}`
    const entry = mine[kind] ?? { n: 0, last: day, samples: [], seen: [] }
    if (entry.seen.includes(key)) continue
    mine[kind] = {
      n: entry.n + 1,
      last: day,
      samples: wrong && fix ? [{ wrong, fix }, ...entry.samples.filter((s) => s.wrong !== wrong || s.fix !== fix)].slice(0, MAX_SAMPLES) : entry.samples,
      seen: [...entry.seen, key].slice(-MAX_SEEN),
    }
  }
  return { ...log, [language]: mine }
}

export interface WritingRow extends WritingEntry {
  kind: WritingKind
}

/** The kinds seen in a language, most frequent first. */
export function writingRows(log: WritingLog, language: TargetLanguage): WritingRow[] {
  return (Object.entries(log[language] ?? {}) as [WritingKind, WritingEntry][])
    .filter(([, e]) => e && e.n > 0)
    .map(([kind, e]) => ({ kind, ...e }))
    .sort((a, b) => b.n - a.n || (a.last < b.last ? 1 : -1))
}

export interface WritingRepair {
  target: RepairTarget
  action: string
  /** The guide's lesson on it (only used where the language has it). */
  lesson?: string
}

/** Where a kind of writing mistake is worked on: a practice, and the guide's lesson on it. Nothing for spelling and punctuation. */
export function repairFor(kind: WritingKind, language: TargetLanguage): WritingRepair | undefined {
  const lang = (en: string, fr: string, es: string) => ({ en, fr, es })[language]
  switch (kind) {
    case 'agreement':
      return { target: 'grammar', action: 'Dilbilgisi soruları', lesson: lang('basics_en_present_simple', 'basics_fr_adjectifs', 'basics_es_adjetivos') }
    case 'article':
      return language === 'en' ? { target: 'grammar', action: 'Dilbilgisi soruları', lesson: 'articles_en' } : { target: 'article', action: 'Artikel antrenmanı', lesson: lang('', 'basics_fr_articles', 'basics_es_articulos') }
    case 'preposition':
      return { target: 'grammar', action: 'Dilbilgisi soruları', lesson: lang('prep_en', 'prep_fr', 'prep_es') }
    case 'verb':
      return language === 'en'
        ? { target: 'grammar', action: 'Dilbilgisi soruları', lesson: 'basics_en_past_simple' }
        : { target: 'verbs', action: 'Fiil laboratuvarı', lesson: lang('', 'basics_fr_passe_compose', 'basics_es_preterito') }
    case 'confusion':
      return { target: 'boss', action: 'Boss savaşları' }
    case 'accent':
      return language === 'en' ? undefined : { target: 'accent', action: 'Aksan antrenmanı' }
    case 'wordorder':
    case 'other':
      return { target: 'grammar', action: 'Dilbilgisi soruları' }
    default:
      return undefined
  }
}
