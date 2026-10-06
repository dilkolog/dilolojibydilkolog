import type { TargetLanguage } from './types.js'

/**
 * Is `token` an inflected form of `lemma` (decide → decided, decidir → decidió), not merely a
 * related word (reluctant → reluctantly, dépaysement → dépaysé)? The search behind the corpus
 * matches word families loosely, so this is stricter than matching a shared prefix.
 */
export function isInflection(token: string, lemma: string, language: TargetLanguage): boolean {
  const t = token.toLocaleLowerCase()
  const l = lemma.toLocaleLowerCase()
  if (t === l) return true
  const rest = t.startsWith(l) ? t.slice(l.length) : null
  if (language === 'en') {
    if (rest !== null && ['s', 'es', 'ed', 'ing', "'s"].includes(rest)) return true
    if (l.endsWith('e') && rest === 'd') return true
    const cut = l.slice(0, -1)
    if (l.endsWith('e') && t.startsWith(cut) && ['ing', 'ed'].includes(t.slice(cut.length))) return true
    if (l.endsWith('y') && t.startsWith(cut) && ['ies', 'ied'].includes(t.slice(cut.length))) return true
    // Doubled final consonant: stop → stopped, stopping.
    return rest !== null && rest.length > 1 && rest[0] === l.at(-1) && ['ed', 'ing'].includes(rest.slice(1))
  }
  if (rest !== null && (language === 'fr' ? ['s', 'e', 'es', 'x'] : ['s', 'es']).includes(rest)) return true
  // Regular verbs: any ending on the stem (décider → décidez, décida; aprovechar → aprovechó).
  const verb = language === 'fr' ? /(er|ir|re)$/ : /(ar|er|ir)$/
  if (!verb.test(l)) return false
  const stem = l.slice(0, -2)
  return stem.length >= 3 && t.startsWith(stem) && t.length - stem.length <= 6 && !/(tion|sion|ción|sión|ment|miento|ance|ancia|eur|dor|able|ible)$/.test(t)
}

/** The word's form inside the sentence, or undefined when it can't be found reliably. */
export function formIn(text: string, lemma: string, language: TargetLanguage): string | undefined {
  const target = lemma.trim()
  if (/\s/.test(target)) {
    const i = text.toLocaleLowerCase().indexOf(target.toLocaleLowerCase())
    return i < 0 ? undefined : text.slice(i, i + target.length)
  }
  // Apostrophes split tokens so elided articles (l', d', j') don't stick to the word.
  return (text.match(/[\p{L}-]+/gu) ?? []).find((t) => isInflection(t, target, language))
}
