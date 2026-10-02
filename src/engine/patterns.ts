import { stem } from './extract'
import type { TargetLanguage } from './types'

/**
 * Collocation mining: the word's most frequent neighbours across many real sentences ("make a
 * decision", "decision to", "prendre une décision"). Collocations are what make a word sound
 * native, and they are hard to guess: frequency in real text is the honest guide.
 */

/**
 * Function words: a pattern made only of these and the word teaches nothing. Narrower than the
 * reading stop list, which also holds frequent content words (good, time) that do make patterns.
 */
const words = (s: string) => new Set(s.split(' '))
const FUNCTION: Record<TargetLanguage, Set<string>> = {
  en: words('a an the this that these those my your his her its our their some any no every each and or but so if as than then it i you he she we they me him us them is are was were be been being am will would can could should shall may might must not there here what which who whom whose when where why how all both just very too also'),
  fr: words("c'est le la les l un une des du ce cet cette ces mon ma mes ton ta tes son sa ses notre nos votre vos leur leurs et ou mais donc que qu qui quoi dont il elle ils elles je j tu nous vous on me m te t se s lui y ne n pas est sont était être été suis es sommes êtes c ça cela ceci très plus aussi"),
  es: words('el la los las lo un una unos unas este esta estos estas ese esa esos esas mi mis tu tus su sus nuestro nuestra y o pero que quien cual él ella ellos ellas yo tú nosotros vosotros me te se le les nos os es son era fue ser estar está están estaba ha he han había no muy más también hay'),
}

/** Prepositions are worth a pattern on their own (depend on, decision to); articles aren't. */
const PREPOSITIONS: Record<TargetLanguage, Set<string>> = {
  en: new Set(['to', 'on', 'in', 'of', 'for', 'with', 'about', 'at', 'from', 'into', 'by', 'up', 'out', 'off']),
  fr: new Set(['de', 'à', 'sur', 'pour', 'avec', 'dans', 'en', 'par', 'contre', 'sans', 'chez', 'vers']),
  es: new Set(['de', 'a', 'en', 'con', 'por', 'para', 'sobre', 'contra', 'sin', 'hacia', 'desde']),
}

export interface Pattern {
  /** Display form, as most often written: "make a decision", "making decisions". */
  phrase: string
  /** Sentences it was found in. */
  count: number
  example: string
}

const TOKEN = /[\p{L}]+(?:['’-][\p{L}]+)*/gu

interface Found {
  count: number
  example: string
  /** Surface forms of the neighbours seen, to show the most common one. */
  surfaces: Map<string, number>
}

/**
 * `isWord` says whether a token is the word itself (any inflection). Patterns are windows of
 * two or three tokens around it; neighbours are grouped by stem, so "made/make/making a
 * decision" count together and show as the most frequent spelling.
 */
export function minePatterns(
  sentences: readonly string[],
  language: TargetLanguage,
  isWord: (token: string) => boolean,
  max = 6,
  // Small samples throw up chance pairs; ask for a few percent of the sentences.
  minCount = Math.max(3, Math.round(sentences.length * 0.04)),
): Pattern[] {
  const stop = FUNCTION[language]
  const preps = PREPOSITIONS[language]
  const found = new Map<string, Found>()
  // Names (capitalised away from the start of a sentence: Tom, Mary) say nothing about usage.
  const names = new Set<string>()
  for (const sentence of sentences) {
    const tokens = [...sentence.matchAll(TOKEN)].map((m) => m[0])
    tokens.forEach((t, i) => i > 0 && /^\p{Lu}/u.test(t) && names.add(t.toLocaleLowerCase(language)))
  }
  for (const sentence of sentences) {
    const tokens = [...sentence.matchAll(TOKEN)].map((m) => m[0])
    const lower = tokens.map((t) => t.toLocaleLowerCase(language))
    const seen = new Set<string>()
    lower.forEach((_, i) => {
      if (!isWord(tokens[i])) return
      const windows: [number, number][] = [
        [i - 2, i],
        [i - 1, i],
        [i, i + 1],
        [i, i + 2],
        [i - 1, i + 1],
      ]
      for (const [a, b] of windows) {
        if (a < 0 || b >= lower.length) continue
        const others = lower.slice(a, b + 1).filter((_, k) => a + k !== i)
        if (others.some((t) => isWord(t) || names.has(t))) continue
        // Light verbs are function words elsewhere, but they are the heart of a collocation.
        const content = others.filter((t) => !stop.has(t) || lightBase(t, language))
        const prep = others.length === 1 && preps.has(others[0])
        // A pattern needs something to learn: a content word, or a lone preposition.
        if (!content.length && !prep) continue
        const weak = (j: number) => j !== i && stop.has(lower[j]) && !lightBase(lower[j], language)
        // Three-token windows must not just pad a shorter pattern with a function word at an edge.
        if (b - a === 2 && (weak(a) || weak(b))) continue
        const key = lower.slice(a, b + 1).map((t, k) => (a + k === i ? '·' : lightBase(t, language) ?? stem(t, language))).join(' ')
        if (seen.has(key)) continue
        seen.add(key)
        const surface = lower.slice(a, b + 1).join(' ')
        const f = found.get(key) ?? { count: 0, example: sentence, surfaces: new Map() }
        f.count++
        f.surfaces.set(surface, (f.surfaces.get(surface) ?? 0) + 1)
        found.set(key, f)
      }
    })
  }

  const ranked = [...found.entries()]
    .filter(([, f]) => f.count >= minCount)
    .map(([key, f]) => ({
      key,
      count: f.count,
      example: f.example,
      phrase: [...f.surfaces.entries()].sort((a, b) => b[1] - a[1])[0][0],
      // Longer patterns say more; weigh them up a little.
      score: f.count * (key.split(' ').length === 3 ? 1.3 : 1),
    }))
    .sort((a, b) => b.score - a.score)

  // Drop a pattern contained in a better-ranked one ("a difficult" inside "make a difficult …").
  const out: Pattern[] = []
  for (const r of ranked) {
    if (out.some((o) => o.phrase.includes(r.phrase) || r.phrase.includes(o.phrase))) continue
    out.push({ phrase: r.phrase, count: r.count, example: r.example })
    if (out.length >= max) break
  }
  return out
}

/**
 * Light verbs in aligned forms (same column = same tense/person), so one can stand in for
 * another: "make a decision" → "do a decision", "tomé mi decisión" → "hice mi decisión".
 * Swapping them is exactly the classic learner error in collocations.
 */
const LIGHT_VERBS: Record<TargetLanguage, string[][]> = {
  en: [
    ['make', 'makes', 'made', 'making', 'made'],
    ['do', 'does', 'did', 'doing', 'done'],
    ['take', 'takes', 'took', 'taking', 'taken'],
    ['have', 'has', 'had', 'having', 'had'],
    ['give', 'gives', 'gave', 'giving', 'given'],
    ['get', 'gets', 'got', 'getting', 'got'],
  ],
  fr: [
    ['faire', 'fait', 'fais', 'faisait', 'fait', 'faites'],
    ['prendre', 'prend', 'prends', 'prenait', 'pris', 'prenez'],
    ['avoir', 'a', 'as', 'avait', 'eu', 'avez'],
    ['donner', 'donne', 'donnes', 'donnait', 'donné', 'donnez'],
    ['mettre', 'met', 'mets', 'mettait', 'mis', 'mettez'],
  ],
  es: [
    ['hacer', 'hace', 'haces', 'hizo', 'hecho', 'hice'],
    ['tomar', 'toma', 'tomas', 'tomó', 'tomado', 'tomé'],
    ['tener', 'tiene', 'tienes', 'tuvo', 'tenido', 'tuve'],
    ['dar', 'da', 'das', 'dio', 'dado', 'di'],
    ['poner', 'pone', 'pones', 'puso', 'puesto', 'puse'],
  ],
}

/** Irregular light-verb forms count together: made / make / making → make. */
function lightBase(token: string, language: TargetLanguage): string | undefined {
  return LIGHT_VERBS[language].find((forms) => forms.includes(token))?.[0]
}

/** Plausible wrong versions of a pattern, for the collocation choice exercise (up to 3). */
export function wrongVariantsFor(phrase: string, language: TargetLanguage): string[] {
  const tokens = phrase.split(' ')
  const out: string[] = []
  tokens.forEach((t, i) => {
    const verbs = LIGHT_VERBS[language]
    const row = verbs.findIndex((forms) => forms.includes(t))
    if (row >= 0) {
      const col = verbs[row].indexOf(t)
      for (const other of verbs) if (other !== verbs[row] && other[col] !== t) out.push([...tokens.slice(0, i), other[col], ...tokens.slice(i + 1)].join(' '))
    } else if (PREPOSITIONS[language].has(t)) {
      for (const p of [...PREPOSITIONS[language]].slice(0, 6)) if (p !== t) out.push([...tokens.slice(0, i), p, ...tokens.slice(i + 1)].join(' '))
    }
  })
  return [...new Set(out)].filter((x) => x !== phrase).slice(0, 3)
}
