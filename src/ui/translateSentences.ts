/** Most characters translated in one go: a paragraph or two, so one tap can't empty the month. */
export const MAX_TOTAL = 3000

/** A text cut into sentences (lines kept apart), each short enough for one request. */
export function sentencesOf(text: string): string[] {
  return text
    .split(/\n+/)
    .flatMap((line) => line.split(/(?<=[.!?…])\s+/))
    .map((s) => s.trim())
    .filter(Boolean)
    .flatMap((s) => (s.length <= 600 ? [s] : (s.match(/.{1,600}(\s|$)/g) ?? [s]).map((x) => x.trim())))
}

/** A label pasted in front of a sentence ("Örnek: …", "Example: …") is no part of it. */
export function stripLabel(sentence: string): string {
  return sentence.replace(/^\s*(örnek|ornek|example|exemple|ejemplo)\s*:\s*/i, '').trim()
}

const squash = (s: string) =>
  stripLabel(s)
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '')

/**
 * The memory's entries without repeats: a sentence translated both ways, or twice with a different
 * full stop or a pasted "Örnek:" label, is one pair. The newest of each stays, in order.
 */
export function uniquePairs<T extends { text: string; translation: string }>(entries: readonly T[]): T[] {
  const seen = new Set<string>()
  const out: T[] = []
  for (const e of entries) {
    const key = [squash(e.text), squash(e.translation)].sort().join('|')
    if (seen.has(key)) continue
    seen.add(key)
    out.push(e)
  }
  return out
}
