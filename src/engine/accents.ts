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
