/**
 * Word-level difference between what was written and its correction, for showing a correction in
 * place: kept words, removed words (struck through) and added words (highlighted). Whitespace is
 * kept with the word before it, so joining all parts gives back either text.
 */
export type CorrectionPart = { kind: 'same' | 'removed' | 'added'; text: string }

const tokens = (s: string) => s.match(/\S+\s*/g) ?? []
const norm = (t: string) => t.trim()

export function correctionDiff(before: string, after: string): CorrectionPart[] {
  const a = tokens(before)
  const b = tokens(after)
  // Longest common subsequence table over words (texts here are a few sentences).
  const lcs: number[][] = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0))
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--) lcs[i][j] = norm(a[i]) === norm(b[j]) ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1])
  const out: CorrectionPart[] = []
  const push = (kind: CorrectionPart['kind'], text: string) => {
    const last = out.at(-1)
    if (last && last.kind === kind) last.text += text
    else out.push({ kind, text })
  }
  let i = 0
  let j = 0
  while (i < a.length && j < b.length) {
    if (norm(a[i]) === norm(b[j])) {
      push('same', b[j])
      i++
      j++
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) push('removed', a[i++])
    else push('added', b[j++])
  }
  while (i < a.length) push('removed', a[i++])
  while (j < b.length) push('added', b[j++])
  return out
}
