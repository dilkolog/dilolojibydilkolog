import type { ErrorType, Gender, TargetLanguage, Verdict } from './types'

export interface CheckResult {
  verdict: Verdict
  errorType?: ErrorType
}

export interface TypedCheckOptions {
  language: TargetLanguage
  /** Needed to judge "le arbre" vs "l'arbre": same gender is a spelling slip, other gender is an error. */
  gender?: Gender
  /** Lemmas of confusable words (affect/effect): typing one is a confusion error, not a random miss. */
  confusables?: string[]
  /** Other members of the word family: typing one is a form error. */
  familyForms?: string[]
}

export function normalize(s: string): string {
  return s
    .normalize('NFC')
    .toLowerCase()
    .replace(/[’`´]/g, "'")
    .replace(/[.!?¡¿,;:"«»]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*'\s*/g, "'")
    .trim()
}

export function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').normalize('NFC')
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    prev = cur
  }
  return prev[b.length]
}

/** Typo tolerance grows with word length; short words must be exact (cat/car are different words). */
function typoBudget(expected: string): number {
  if (expected.length >= 8) return 2
  if (expected.length >= 4) return 1
  return 0
}

type ArticleGender = 'm' | 'f' | 'neutral'

const ARTICLES: Record<TargetLanguage, Record<string, ArticleGender>> = {
  en: { a: 'neutral', an: 'neutral', the: 'neutral', to: 'neutral' },
  fr: { le: 'm', un: 'm', la: 'f', une: 'f', "l'": 'neutral', les: 'neutral', des: 'neutral' },
  es: { el: 'm', un: 'm', unos: 'm', los: 'm', la: 'f', una: 'f', unas: 'f', las: 'f' },
}

export function splitArticle(s: string, language: TargetLanguage): { article?: string; rest: string } {
  if (s.startsWith("l'") && language === 'fr') return { article: "l'", rest: s.slice(2) }
  const space = s.indexOf(' ')
  if (space > 0) {
    const head = s.slice(0, space)
    if (head in ARTICLES[language]) return { article: head, rest: s.slice(space + 1) }
  }
  return { rest: s }
}

/** The gender an article shows (le/la, el/la); undefined for l', les, English and anything unknown. */
export function genderOfArticle(article: string | undefined, language: TargetLanguage): 'm' | 'f' | undefined {
  const g = article ? ARTICLES[language][article] : undefined
  return g === 'm' || g === 'f' ? g : undefined
}

function articleGender(article: string, language: TargetLanguage, fallback?: Gender): ArticleGender {
  const g = ARTICLES[language][article] ?? 'neutral'
  if (g === 'neutral' && fallback && fallback !== 'mf') return fallback
  return g
}

function compareOne(given: string, expected: string, opts: TypedCheckOptions): CheckResult | null {
  if (given === expected) return { verdict: 'correct' }

  const g = splitArticle(given, opts.language)
  const e = splitArticle(expected, opts.language)

  let restError: ErrorType | undefined
  if (g.rest !== e.rest) {
    if (stripDiacritics(g.rest) === stripDiacritics(e.rest)) restError = 'accent'
    else if (levenshtein(g.rest, e.rest) <= typoBudget(e.rest)) restError = 'typo'
    else return null
  }

  // English articles / infinitive "to" carry no information worth testing here.
  if (opts.language !== 'en' && e.article) {
    if (g.article) {
      const ga = articleGender(g.article, opts.language, opts.gender)
      const ea = articleGender(e.article, opts.language, opts.gender)
      if (ga !== 'neutral' && ea !== 'neutral' && ga !== ea && opts.gender !== 'mf') {
        return { verdict: 'wrong', errorType: 'gender' }
      }
      // Same gender, different article (la/une, le/l'): the word and its gender are known.
    } else if (!restError) {
      return { verdict: 'near', errorType: 'article' }
    }
  }

  return restError ? { verdict: 'near', errorType: restError } : { verdict: 'correct' }
}

const words = (s: string) =>
  normalize(s)
    .replace(/[-–—]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)

/**
 * Whole-sentence check for dictation, word by word: every word right → correct; only small slips
 * (accents, a typo in a word) → near; any missing, extra or different word → wrong.
 */
export function checkSentence(givenRaw: string, expectedRaw: string, language: TargetLanguage): CheckResult & { wrongWords: number } {
  const g = words(givenRaw)
  const e = words(expectedRaw)
  if (!g.length) return { verdict: 'wrong', errorType: 'meaning', wrongWords: e.length }
  // Longest common subsequence of near-equal words, so one missing word doesn't shift all others.
  const same = (a: string, b: string) => compareOne(a, b, { language }) !== null
  const dp = Array.from({ length: g.length + 1 }, () => new Array<number>(e.length + 1).fill(0))
  for (let i = 1; i <= g.length; i++)
    for (let j = 1; j <= e.length; j++) dp[i][j] = same(g[i - 1], e[j - 1]) ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1])
  const matched = dp[g.length][e.length]
  const wrongWords = Math.max(e.length, g.length) - matched
  if (wrongWords > 0) return { verdict: 'wrong', errorType: 'meaning', wrongWords }
  const exact = g.length === e.length && g.every((w, i) => w === e[i])
  if (exact) return { verdict: 'correct', wrongWords: 0 }
  const accentOnly = g.every((w, i) => stripDiacritics(w) === stripDiacritics(e[i]))
  return { verdict: 'near', errorType: accentOnly ? 'accent' : 'typo', wrongWords: 0 }
}

/**
 * Checks a typed answer against all accepted answers. Returns the most favourable result.
 * Order of evaluation encodes how forgiving we are: exact > article/gender > accent > typo.
 */
export function checkTyped(givenRaw: string, accepted: string[], opts: TypedCheckOptions): CheckResult {
  const given = normalize(givenRaw)
  if (!given) return { verdict: 'wrong', errorType: 'meaning' }

  let near: CheckResult | null = null
  for (const a of accepted) {
    const r = compareOne(given, normalize(a), opts)
    if (r?.verdict === 'correct') return r
    if (r && !near) near = r
  }

  // A real word the learner confused with the target is checked before typo tolerance:
  // "effect" for "affect" is one letter away but is a confusion, not a slip of the finger.
  const givenCore = splitArticle(given, opts.language).rest
  const matches = (list?: string[]) =>
    list?.some((w) => splitArticle(normalize(w), opts.language).rest === givenCore) ?? false
  if (matches(opts.confusables)) return { verdict: 'wrong', errorType: 'confusion' }
  if (matches(opts.familyForms)) return { verdict: 'wrong', errorType: 'form' }
  return near ?? { verdict: 'wrong', errorType: 'meaning' }
}
