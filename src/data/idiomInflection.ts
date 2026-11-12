import { irregularVerbs } from './englishVerbs'
import { dictionaryForms } from './dictionaryForms'
import type { TargetLanguage } from '../engine/types'

const lower = (s: string) => s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
const tokens = (s: string) => s.toLowerCase().replace(/[’‘]/g, "'").replace(/\b(?:someone|somebody|one)'s\b/g, 'their').match(/[\p{L}\p{N}][\p{M}\p{L}\p{N}]*/gu) ?? []
const sets = (s: string) => new Set(s.split(' '))
const PRONOUNS = {
  es: sets('yo tu el ella usted nosotros nosotras vosotros vosotras ustedes ellos ellas me te se le les lo la los las nos os'),
  fr: sets('je j tu il elle on nous vous ils elles me m te t se s lui leur le la les l en y'),
  en: sets('i you he she it we they me him her us them'),
}
const FUNCTION_WORDS = {
  es: sets('a al de del el la los las un una unos unas en con por para sin y o se'),
  fr: sets('a au aux de du des le la les un une en avec pour par sans et ou se s l'),
  en: sets('a an the to of in on at for from with without and or it my your his her our their'),
}
const POSSESSIVES = sets('my your his her its our their')

function englishVerbMatches(verb: string, part: string[]): boolean {
  const irregular = irregularVerbs.find((v) => v.base === verb)
  const stem = /[^aeiou]y$/.test(verb) ? verb.slice(0, -1) : verb
  const ing = verb === 'be' ? 'being' : /ie$/.test(verb) ? `${verb.slice(0, -2)}ying` : /[^e]e$/.test(verb) ? `${verb.slice(0, -1)}ing` : `${verb}ing`
  const past = /e$/.test(verb) ? `${verb}d` : /[^aeiou]y$/.test(verb) ? `${stem}ied` : `${verb}ed`
  const third = verb === 'have' ? 'has' : verb === 'be' ? 'is' : /[^aeiou]y$/.test(verb) ? `${stem}ies` : /(?:s|sh|ch|x|z|o)$/.test(verb) ? `${verb}es` : `${verb}s`
  const doubled = /^[^aeiou]*[aeiou][^aeiouwxy]$/.test(verb)
  const gerunds = doubled ? [`${verb}${verb.at(-1)}ing`] : [ing]
  const regularPast = doubled ? [`${verb}${verb.at(-1)}ed`] : [past]
  const pastForms = irregular?.past ?? regularPast
  const participles = irregular?.pp ?? regularPast
  if (part.length === 1) return [verb, third, ...gerunds, ...pastForms, ...participles].includes(part[0])
  if (part.length !== 2) return false
  if (/^(?:have|has|had)$/.test(part[0])) return participles.includes(part[1])
  return /^(?:am|is|are|was|were|be|been)$/.test(part[0]) && gerunds.includes(part[1])
}

/** Conservative phrase matching: inflect the first verb, keep every fixed word and its order. */
export function idiomInflectionMatcher(query: string, languages: readonly TargetLanguage[]) {
  const input = tokens(query)
  const cache = new Map<string, string[]>()
  const lemmas = (language: TargetLanguage, text: string) => {
    const key = `${language}:${text}`
    let result = cache.get(key)
    if (!result) {
      result = dictionaryForms(language, text).map((f) => lower(f.lemma).replace(/^se\s+|^s'/, '').replace(/(?<=[aei]r)se$/, ''))
      cache.set(key, result)
    }
    return result
  }
  return (phrase: string) => languages.some((language) => {
    const idiom = tokens(phrase)
    const reflexive = language === 'fr' ? ['se', 's'].includes(idiom[0]) : language === 'es' && /[aei]rse$/.test(idiom[0] ?? '')
    if (language === 'fr' && reflexive) idiom.shift()
    const head = idiom.shift()
    if (!head || !idiom.length) return false
    const verb = language === 'es' ? lower(head).replace(/(?<=[aei]r)se$/, '') : lower(head)
    // The verb counts as a content word; articles, pronouns and prepositions do not.
    if (1 + idiom.filter((w) => !FUNCTION_WORDS[language].has(lower(w))).length < 2) return false
    const tailMatches = (tail: string[]) => tail.length === idiom.length && tail.every((w, n) => {
      const expected = lower(idiom[n])
      return lower(w) === expected || (language === 'en' && expected === 'their' && POSSESSIVES.has(w))
    })
    // Only leading subject/object clitics and clitics adjoining the verb may be skipped.
    // Never drop negation, fixed articles/prepositions, reorder nouns or search inside a sentence.
    for (let start = 0; start < input.length; start++) {
      if (start && !PRONOUNS[language].has(lower(input[start - 1]))) break
      for (let size = 1; size <= 4 && start + size < input.length; size++) {
        const part = input.slice(start, start + size)
        let forms = [part.join(' ')]
        if (language === 'fr') forms = forms.map((s) => s.replace(/\b([smtlj])\s+/g, "$1'"))
        let matches = size === 1 && lower(part[0]) === verb
        if (!matches && language !== 'en') matches = forms.some((s) => lemmas(language, s).includes(verb))
        if (!matches && language === 'en') matches = englishVerbMatches(verb, part)
        if (!matches) continue
        for (let end = start + size; end < input.length; end++) {
          if (end > start + size && !PRONOUNS[language].has(lower(input[end - 1]))) break
          if (reflexive) {
            const clitics = language === 'fr' ? sets('me m te t se s nous vous') : sets('me te se nos os')
            const hasClitic = input.slice(0, end).some((w) => clitics.has(w))
              || forms.some((s) => dictionaryForms(language, s).some((f) => f.pronouns?.some((p) => clitics.has(p))))
            if (!hasClitic) continue
          }
          if (tailMatches(input.slice(end))) return true
        }
      }
    }
    return false
  })
}
