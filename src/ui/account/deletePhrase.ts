/** What the person types to confirm deleting the account: short, in their own words, and not their e-mail (nothing personal on screen). */
export const DELETE_PHRASE = 'hesabımı sil'

/** Case, spacing and the Turkish dotted/dotless i do not matter: "HESABIMI SIL" counts as typed. */
const fold = (s: string) => s.trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr').replaceAll('ı', 'i')
export const phraseMatches = (typed: string) => fold(typed) === fold(DELETE_PHRASE)
