import type { LabLanguage } from './labShared'

/**
 * Lower case, no punctuation, single spaces. Accents stay: they are heard (parlé / parle, habló /
 * hablo), and recognisers write them.
 */
const plain = (s: string, language: LabLanguage) =>
  s
    .toLocaleLowerCase(language)
    .normalize('NFC')
    .replace(/[^\p{L}' ]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/**
 * French spells apart what sounds the same (parle, parles, parlent; fini, finis, finit): the silent
 * endings are dropped on both sides, so a recogniser's guess at the spelling isn't held against the
 * speaker. Endings that are heard (-ons, -ez, -ait…) still count.
 */
const sound = (word: string, language: LabLanguage) => (language === 'fr' ? word.replace(/(ent|es|e|s|t|x)$/, '') : word)

const words = (s: string, language: LabLanguage) => plain(s, language).replace(/'/g, "' ").split(' ').filter(Boolean).map((w) => sound(w, language))

/**
 * Whether one of the recogniser's alternatives says the expected form: the form's words in order,
 * with or without the subject before them ("nous avons parlé" or "avons parlé").
 */
export function saidForm(alternatives: readonly string[], expected: string, language: LabLanguage): boolean {
  const want = words(expected, language)
  if (!want.length) return false
  return alternatives.some((alt) => {
    const got = words(alt, language)
    for (let i = 0; i + want.length <= got.length; i++) if (want.every((w, j) => got[i + j] === w)) return true
    return false
  })
}
