import { normalize, stripDiacritics } from './answerCheck'

/**
 * Word-by-word comparison of a dictation with the original: which words were right, which
 * were missed, which were written differently. Small alignment (LCS) over words.
 */
export type DiffPart = { word: string; status: 'ok' | 'accent' | 'missed' | 'extra' }

const clean = (w: string) => normalize(w).replace(/[^\p{L}\p{N}']/gu, '')

export function wordDiff(given: string, expected: string): DiffPart[] {
  const a = given.split(/\s+/).filter(Boolean)
  const b = expected.split(/\s+/).filter(Boolean)
  const same = (x: string, y: string) => stripDiacritics(clean(x)) === stripDiacritics(clean(y))
  const n = a.length
  const m = b.length
  const L = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = same(a[i], b[j]) ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1])
  const out: DiffPart[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (same(a[i], b[j])) {
      out.push({ word: b[j], status: clean(a[i]) === clean(b[j]) ? 'ok' : 'accent' })
      i++
      j++
    } else if (L[i + 1][j] >= L[i][j + 1]) out.push({ word: a[i++], status: 'extra' })
    else out.push({ word: b[j++], status: 'missed' })
  }
  while (j < m) out.push({ word: b[j++], status: 'missed' })
  while (i < n) out.push({ word: a[i++], status: 'extra' })
  return out
}
