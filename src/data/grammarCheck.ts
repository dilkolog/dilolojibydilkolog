import type { GrammarIssue } from '../engine/grammarIssues'
import type { TargetLanguage } from '../engine/types'

/**
 * Grammar and spelling from LanguageTool's free public service (https://languagetool.org): only
 * when the learner asks, one text at a time, as its terms want (a few requests a minute, 20 KB
 * each, a visible link back). The text goes to LanguageTool; nothing else does.
 */
export const LANGUAGETOOL_URL = 'https://languagetool.org'
const ENDPOINT = 'https://api.languagetool.org/v2/check'
const CODE: Record<TargetLanguage, string> = { en: 'en-GB', fr: 'fr', es: 'es' }
export const GRAMMAR_MAX = 6000

export class GrammarError extends Error {}

interface Match {
  offset: number
  length: number
  message: string
  replacements: { value: string }[]
  rule: { issueType?: string; category?: { id?: string } }
}

const kindOf = (m: Match): GrammarIssue['kind'] =>
  m.rule.issueType === 'misspelling' ? 'spelling' : m.rule.issueType === 'style' || m.rule.category?.id === 'STYLE' || m.rule.category?.id === 'TYPOGRAPHY' ? 'style' : 'grammar'

export async function checkGrammar(text: string, language: TargetLanguage): Promise<GrammarIssue[]> {
  if (text.length > GRAMMAR_MAX) throw new GrammarError(`Denetim bir seferde en fazla ${GRAMMAR_MAX.toLocaleString('tr-TR')} karakter.`)
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ text, language: CODE[language] }),
    signal: AbortSignal.timeout(15_000),
  }).catch(() => {
    throw new GrammarError('Denetim için internet gerekiyor.')
  })
  if (res.status === 429) throw new GrammarError('LanguageTool şu an yoğun; bir dakika sonra yeniden dene.')
  if (!res.ok) throw new GrammarError('Denetim şu an yapılamadı.')
  const body = (await res.json()) as { matches?: Match[] }
  return (body.matches ?? []).map((m) => ({
    offset: m.offset,
    length: m.length,
    message: m.message,
    replacements: m.replacements.slice(0, 4).map((r) => r.value),
    kind: kindOf(m),
  }))
}
