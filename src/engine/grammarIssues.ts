/**
 * Writing checked by a grammar checker (LanguageTool): the issues found, the text in parts with
 * the flagged stretches marked, and a suggestion applied with the remaining issues kept in place.
 */
export interface GrammarIssue {
  offset: number
  length: number
  message: string
  /** Suggested replacements, best first (may be empty). */
  replacements: string[]
  kind: 'spelling' | 'grammar' | 'style'
  /** The checker's rule and category ids (LanguageTool), for sorting a finding into a kind of mistake (engine/writingErrors). */
  ruleId?: string
  category?: string
}

export type TextPart = { text: string; issue?: GrammarIssue }

/** The text cut into plain and flagged stretches, in order (overlapping issues: the first wins). */
export function markIssues(text: string, issues: readonly GrammarIssue[]): TextPart[] {
  const parts: TextPart[] = []
  let at = 0
  for (const issue of [...issues].sort((a, b) => a.offset - b.offset)) {
    if (issue.offset < at || issue.offset + issue.length > text.length) continue
    if (issue.offset > at) parts.push({ text: text.slice(at, issue.offset) })
    parts.push({ text: text.slice(issue.offset, issue.offset + issue.length), issue })
    at = issue.offset + issue.length
  }
  if (at < text.length) parts.push({ text: text.slice(at) })
  return parts
}

/** The text with one issue's stretch replaced, and the other issues moved along with the text. */
export function applyFix(text: string, issues: readonly GrammarIssue[], issue: GrammarIssue, replacement: string): { text: string; issues: GrammarIssue[] } {
  const shift = replacement.length - issue.length
  const end = issue.offset + issue.length
  return {
    text: text.slice(0, issue.offset) + replacement + text.slice(end),
    issues: issues
      .filter((i) => i !== issue && (i.offset >= end || i.offset + i.length <= issue.offset))
      .map((i) => (i.offset >= end ? { ...i, offset: i.offset + shift } : i)),
  }
}
