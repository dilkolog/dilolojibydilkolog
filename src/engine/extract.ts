import { normalize, stripDiacritics } from './answerCheck'
import type { TargetLanguage, VocabularyEntry } from './types'

/**
 * Learning from real content: pull candidate words out of a pasted text, skipping function words,
 * names and words the learner already has, and keep the sentence each came from as its example.
 *
 * There is no dictionary here, so lemmatisation is approximate (suffix stripping). It is only used
 * to group inflections and to recognise known words; the user confirms the base form before adding.
 */

export interface Candidate {
  /** Most frequent surface form seen, e.g. "decided". */
  surface: string
  /** All forms seen, most frequent first. */
  forms: string[]
  count: number
  /** First sentence the word appeared in. */
  context: string
}

// Function words, pronouns, auxiliaries and the most frequent verbs/adverbs per language.
const STOPWORDS: Record<TargetLanguage, string> = {
  en: `a about above after again against all also am an and any are aren as at be because been before being below
    between both but by can cannot could did do does doing down during each even ever every few for from further
    get gets got had has have having he her here hers herself him himself his how however i if in into is it its
    itself just let like many may me might more most much must my myself never no nor not now of off often on once
    one only or other our ours ourselves out over own per quite rather really said same say says see she should
    since so some still such than that the their theirs them themselves then there these they this those though
    through to too under until up upon us very was we well were what when where whether which while who whom whose
    why will with within without would yes yet you your yours yourself yourselves don doesn didn isn wasn weren
    won wouldn shouldn couldn ll ve re go goes went going make made take took come came know think want thing things
    something anything nothing someone everyone people time way day year back new old good first last long little
    get also`,
  fr: `a à au aux avec ce ces cet cette ceci cela ça chez comme dans de des du elle elles en entre et être eu
    eux il ils je la le les leur leurs lui ma mais me même mes moi mon ne ni nos notre nous on ou où par pas
    pour qu que quel quelle quels quelles qui sa sans se ses si son sous sur ta te tes toi ton tu un une vos votre
    vous y est sont était étaient été suis es sommes êtes serait seront fut ai as avons avez ont avait avaient
    aura avoir fait faire fais faut peut peux pouvez pouvons veut veux vais va vont allez aller dit dire très
    plus moins bien aussi alors donc car puis encore déjà toujours jamais rien tout tous toute toutes autre
    autres même mêmes quand comment pourquoi ici là oui non leur cet celle celui ceux celles dont lequel laquelle
    lesquels avant après depuis pendant vers contre sinon chaque quelque quelques beaucoup peu trop assez`,
  es: `a al algo algún alguna algunas alguno algunos ante antes aquel aquella aquellas aquellos aquí así aún
    bajo bien cada como con contra cual cuales cuando de del desde donde dos e el él ella ellas ellos en entre
    era eran es esa esas ese eso esos esta estaba estaban estado están estar este esto estos fue fueron ha hace
    hacer han has hasta hay he la las le les lo los más me mi mis mucho muchos muy nada ni no nos nosotros nuestra
    nuestro o os otra otras otro otros para pero poco por porque que qué quien quién se sea ser si sí sido sin
    sobre son su sus también tan tanto te tengo tiene tienen todo todos tu tus tú un una uno unos usted ustedes
    va vamos van voy y ya yo soy eres somos estoy está estás estamos fui hecho dice dijo puede pueden ahora
    siempre nunca entonces después luego mientras cuál cómo dónde`,
}

const STOP: Record<TargetLanguage, Set<string>> = {
  en: new Set(STOPWORDS.en.split(/\s+/).filter(Boolean)),
  fr: new Set(STOPWORDS.fr.split(/\s+/).filter(Boolean)),
  es: new Set(STOPWORDS.es.split(/\s+/).filter(Boolean)),
}

// Longest suffixes first. Rough on purpose: the goal is grouping, not linguistics.
const SUFFIXES: Record<TargetLanguage, string[]> = {
  en: ['ations', 'ation', 'ments', 'ment', 'ings', 'ing', 'ied', 'ies', 'ed', 'es', 'ly', 's', 'e'],
  fr: ['issements', 'issement', 'eraient', 'eront', 'erons', 'aient', 'ement', 'ances', 'ance', 'ions', 'ées', 'ait', 'ant', 'ent', 'ons', 'ez', 'er', 'ée', 'és', 'es', 'é', 'e', 's', 'x'],
  es: ['amientos', 'imientos', 'amiento', 'imiento', 'aciones', 'ación', 'iendo', 'ando', 'aron', 'ieron', 'ados', 'idas', 'idos', 'adas', 'ado', 'ada', 'ido', 'ida', 'aba', 'ar', 'er', 'ir', 'es', 'os', 'as', 'o', 'a', 's', 'e'],
}

export function stem(word: string, language: TargetLanguage): string {
  let w = stripDiacritics(normalize(word))
  for (const suf of SUFFIXES[language]) {
    // Keep at least 3 letters so short words aren't collapsed together.
    if (w.endsWith(stripDiacritics(suf)) && w.length - suf.length >= 3) {
      w = w.slice(0, w.length - suf.length)
      break
    }
  }
  // A stem-final "e" is usually part of an ending (mange-ons / mang-er, decide / decid-ed).
  if (language !== 'es' && w.endsWith('e') && w.length > 3) w = w.slice(0, -1)
  return w
}

const ELISION = /^(l|d|j|m|t|s|n|c|qu|jusqu|lorsqu|puisqu)['’]/i

export function splitSentences(text: string): string[] {
  return text
    .replace(/\r/g, '')
    .split(/(?<=[.!?…])\s+|\n+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

interface Token {
  word: string
  lowercase: boolean
  /** Capitalised and not the first word of its sentence. */
  capitalisedMidSentence: boolean
}

function tokenize(sentence: string, language: TargetLanguage): Token[] {
  const raw = sentence.match(/[\p{L}][\p{L}'’-]*/gu) ?? []
  return raw.map((t, i) => {
    let word = t
    if (language === 'fr') word = word.replace(ELISION, '')
    if (language === 'en') word = word.replace(/['’]s$/i, '')
    word = word.replace(/^[-'’]+|[-'’]+$/g, '')
    const capital = /^\p{Lu}/u.test(word)
    return { word, lowercase: !capital, capitalisedMidSentence: capital && i > 0 }
  })
}

export interface ExtractOptions {
  minLength?: number
  limit?: number
}

export function extractCandidates(
  text: string,
  language: TargetLanguage,
  known: readonly VocabularyEntry[],
  { minLength = 3, limit = 80 }: ExtractOptions = {},
): Candidate[] {
  const knownStems = new Set<string>()
  for (const e of known) {
    if (e.language !== language) continue
    for (const w of [e.lemma, ...(e.alternativeForms ?? []), ...e.wordFamily.map((m) => m.lemma)]) {
      knownStems.add(stem(w, language))
    }
    for (const ex of e.senses.flatMap((s) => s.examples)) knownStems.add(stem(ex.form, language))
  }

  const groups = new Map<string, { forms: Map<string, number>; count: number; context: string; lowerSeen: boolean; capMid: boolean }>()
  for (const sentence of splitSentences(text)) {
    for (const { word, lowercase, capitalisedMidSentence } of tokenize(sentence, language)) {
      const lower = word.toLocaleLowerCase(language)
      if (lower.length < minLength || STOP[language].has(lower) || /\d/.test(lower)) continue
      const key = stem(lower, language)
      if (knownStems.has(key)) continue
      const g = groups.get(key) ?? { forms: new Map(), count: 0, context: sentence, lowerSeen: false, capMid: false }
      g.forms.set(lower, (g.forms.get(lower) ?? 0) + 1)
      g.count++
      if (lowercase) g.lowerSeen = true
      if (capitalisedMidSentence) g.capMid = true
      groups.set(key, g)
    }
  }

  return (
    [...groups.values()]
      // Never written in lowercase but capitalised mid-sentence: almost certainly a name.
      // (A word seen only at sentence starts is kept; capitalisation there says nothing.)
      .filter((g) => g.lowerSeen || !g.capMid)
      .map((g) => {
        const forms = [...g.forms.entries()].sort((a, b) => b[1] - a[1] || a[0].length - b[0].length).map(([f]) => f)
        return { surface: forms[0], forms, count: g.count, context: g.context }
      })
      // Frequent in this text first; among equals, longer words tend to be the content words.
      .sort((a, b) => b.count - a.count || b.surface.length - a.surface.length)
      .slice(0, limit)
  )
}

export interface FoundExample {
  entryId: string
  /** The sentence as it appears in the text. */
  text: string
  /** The word's surface form inside the sentence. */
  form: string
}

/**
 * Sentences in a text that contain words already in the list: free, authentic new contexts
 * for those words. One sentence per word, of a usable length, skipping ones already saved.
 */
export function findExampleSentences(text: string, language: TargetLanguage, known: readonly VocabularyEntry[]): FoundExample[] {
  const byStem = new Map<string, VocabularyEntry>()
  for (const e of known) {
    if (e.language !== language || e.partOfSpeech === 'phrase' || e.lemma.includes(' ')) continue
    byStem.set(stem(e.lemma, language), e)
  }
  const found = new Map<string, FoundExample>()
  for (const sentence of splitSentences(text)) {
    const tokens = tokenize(sentence, language)
    if (tokens.length < 4 || tokens.length > 30) continue
    for (const { word } of tokens) {
      const lower = word.toLocaleLowerCase(language)
      if (lower.length < 3) continue
      const entry = byStem.get(stem(lower, language))
      if (!entry || found.has(entry.id)) continue
      if (entry.senses[0].examples.some((ex) => normalize(ex.text) === normalize(sentence))) continue
      found.set(entry.id, { entryId: entry.id, text: sentence, form: word })
    }
  }
  return [...found.values()]
}
