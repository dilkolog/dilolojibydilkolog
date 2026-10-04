import type { TargetLanguage } from './types'

/** Letters a Turkish keyboard can't type directly, per language, for the on-screen bar. */
export const ACCENT_KEYS: Record<TargetLanguage, string[]> = {
  en: [],
  fr: ['é', 'è', 'ê', 'ë', 'à', 'â', 'î', 'ï', 'ô', 'û', 'ù', 'ü', 'ç', 'œ'],
  es: ['á', 'é', 'í', 'ó', 'ú', 'ü', 'ñ', '¿', '¡'],
}

/**
 * Typing shortcuts: a letter followed by a mark becomes the accented letter (e' → é, e` → è,
 * e^ → ê, e" → ë, n~ → ñ). Only pairs that can't occur in normal text of that language are used,
 * so "l'eau" or "qu'il" are left alone (the mark comes before the letter there), and ç has no
 * shortcut because "c," appears in ordinary sentences.
 */
const SHORTCUTS: Record<TargetLanguage, [string, string][]> = {
  en: [],
  fr: [
    ["e'", 'é'],
    ['e`', 'è'],
    ['a`', 'à'],
    ['u`', 'ù'],
    ['e^', 'ê'],
    ['a^', 'â'],
    ['i^', 'î'],
    ['o^', 'ô'],
    ['u^', 'û'],
    ['e"', 'ë'],
    ['i"', 'ï'],
    ['u"', 'ü'],
  ],
  es: [
    ["a'", 'á'],
    ["e'", 'é'],
    ["i'", 'í'],
    ["o'", 'ó'],
    ["u'", 'ú'],
    ['u"', 'ü'],
    ['n~', 'ñ'],
  ],
}

export function applyAccentShortcuts(text: string, language: TargetLanguage): string {
  let out = text
  for (const [from, to] of SHORTCUTS[language]) {
    out = out.split(from).join(to).split(from.toUpperCase()).join(to.toUpperCase())
  }
  return out
}

/** Shortcut list for the help text, e.g. "e' → é". */
export const shortcutHelp = (language: TargetLanguage) => SHORTCUTS[language].slice(0, 6).map(([a, b]) => `${a} → ${b}`)

// ---------------------------------------------------------------------------
// Accent drill
// ---------------------------------------------------------------------------

/** Whether a word carries an accent or other diacritic (é, ç, ñ, ü…). */
export const hasAccent = (word: string) => /\p{M}/u.test(word.normalize('NFD'))

export interface AccentAnswer {
  verdict: 'correct' | 'accent' | 'wrong'
  /** Each letter of the right answer, marked when it carries an accent. */
  letters: { ch: string; accent: boolean; missed: boolean }[]
}

/**
 * Grades a typed answer in the accent drill: right, right letters with wrong or missing accents,
 * or a different word. Letters of the answer that carry an accent are marked, and the ones the
 * learner got wrong among them flagged, so the feedback points at the exact letter.
 */
export function gradeAccents(typed: string, answer: string): AccentAnswer {
  const clean = (s: string) => s.normalize('NFC').trim().toLowerCase().replace(/[’`´]/g, "'").replace(/\s+/g, ' ')
  const plain = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').normalize('NFC')
  const t = [...clean(typed)]
  const a = [...clean(answer)]
  const sameLetters = plain(t.join('')) === plain(a.join(''))
  const letters = [...answer.normalize('NFC').trim()].map((ch, i) => {
    const accent = hasAccent(ch)
    return { ch, accent, missed: accent && sameLetters && t[i] !== a[i] }
  })
  const verdict = t.join('') === a.join('') ? 'correct' : sameLetters ? 'accent' : 'wrong'
  return { verdict, letters }
}

/**
 * Words for a round: only ones with an accent, those with past accent mistakes first, then the
 * rest shuffled.
 */
export function accentRound<T extends { id: string; word: string }>(words: readonly T[], troubleIds: ReadonlySet<string>, size: number, rng: () => number): T[] {
  const withAccent = words.filter((w) => hasAccent(w.word))
  const shuffled = [...withAccent].sort(() => rng() - 0.5)
  const trouble = shuffled.filter((w) => troubleIds.has(w.id))
  const rest = shuffled.filter((w) => !troubleIds.has(w.id))
  return [...trouble.slice(0, Math.ceil(size / 2)), ...rest, ...trouble.slice(Math.ceil(size / 2))].slice(0, size)
}
