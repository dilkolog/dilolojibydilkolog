export interface Correction {
  /** The corrected sentence, in the language being learned. */
  sentence: string
  /** Why it was wrong, in Turkish (may be empty). */
  reason: string
}

const LINE = /^[\s*_>-]*(?:✏️?\s*)?\*{0,2}düzeltme\*{0,2}\s*[:：]\s*(.+)$/imu
const QUOTED = /^[“"«„'‘]\s*([^”"»“’']+?)\s*[”"»“’']\s*(?:[—–:-]\s*|\(\s*)?(.*?)\)?$/u
const SPLIT = /\s+[—–-]\s+|\s*\(\s*/u

const unmark = (s: string) => s.replace(/\*\*|__|(?<![\p{L}\p{N}])_|_(?![\p{L}\p{N}])/gu, '').trim()

/**
 * The correction Monki wrote on a "✏️ Düzeltme:" line: the corrected sentence (in quotes, or the text before
 * a dash or a bracket) and the reason that follows. null when the message has no such line.
 */
export function parseCorrection(text: string): Correction | null {
  const line = LINE.exec(text)?.[1]?.trim()
  if (!line) return null
  const plain = unmark(line)
  const quoted = QUOTED.exec(plain)
  if (quoted) {
    const sentence = quoted[1].trim()
    return sentence ? { sentence, reason: quoted[2].trim().replace(/^[—–:-]\s*/, '') } : null
  }
  const [sentence, ...rest] = plain.split(SPLIT)
  const clean = sentence.trim().replace(/[.:]$/, (m) => (m === '.' ? '.' : ''))
  return clean ? { sentence: clean, reason: rest.join(' ').replace(/\)\s*$/, '').trim() } : null
}

const WORD = /[\p{L}]+(?:['’-][\p{L}]+)*/gu
const words = (s: string) => [...s.matchAll(WORD)].map((m) => m[0])

/**
 * The word the learner got wrong: the first word of the corrected sentence that was not in what they wrote
 * (the longest of them, when several changed). undefined when nothing differs or the original is unknown.
 */
export function changedWord(corrected: string, original: string | undefined): string | undefined {
  if (!original) return undefined
  const had = new Set(words(original).map((w) => w.toLocaleLowerCase()))
  const fresh = words(corrected).filter((w) => !had.has(w.toLocaleLowerCase()) && w.length > 2)
  return [...fresh].sort((a, b) => b.length - a.length)[0]
}
