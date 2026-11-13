import { LESSON_TENSE } from '../../../src/data/guide/tenseTopics'
import { CONTENT_LEVELS, type ContentGrammar, type ReadingItem } from '../../../src/engine/contentTypes'
import { checkGrammar, sentenceTokens, TOPIC_NAME } from '../../../src/engine/grammar'
import { topicPattern } from '../../../src/engine/lessonExamples'
import { analyzeText, readingKey, type ReadingAnalysis } from '../../../src/engine/reading'
import { analyzeForm } from '../../../src/engine/tenses'
import { textForms } from '../../../src/engine/textForms'
import { cleanToken, STOP } from '../../../src/engine/extract'
import { levelRank, type CheckContext } from './context'
import { firstStepErrors } from './firstSteps'
import type { SimilarityIndex } from './similarity'
import type { ContentJob } from './types'

/**
 * The automatic checks of docs/ICERIK-FABRIKASI.md §5.1, one item at a time. An error refuses the item; a
 * warning is reported for the reader of the batch and does not.
 */
export interface Verdict {
  errors: string[]
  warnings: string[]
}

/** The share of a text's words at or below its level the check asks for (§5.1, 2). */
export const LEVEL_FIT = 0.92
/** Texts more alike than this (5-gram Jaccard) are the same text twice. */
export const READING_SIMILAR = 0.4
/** Questions more alike than this (3-gram Jaccard) repeat a pattern. */
export const GRAMMAR_SIMILAR = 0.7

export const READING_ID = /^(fr|es)-r-\d{6}$/
/** A written question, or one made from a text's sentence (fr-r-000123-c04). */
export const GRAMMAR_ID = /^(fr|es)-(g-\d{6}|r-\d{6}-c\d{2})$/
const SOURCE = 'Diloloji (özgün)'

const numberOf = (id: string) => Number(id.slice(-6))

/** A word's CEFR level: as written, then as a verb form's infinitive, then the pack's dictionary form, then its stem. */
export function wordLevel(word: string, ctx: CheckContext): string | undefined {
  const w = cleanToken(word, ctx.language).toLocaleLowerCase(ctx.language).replace(/’/g, "'")
  // Every reading of the word counts and the lowest level wins: "la" is an article before it is a note.
  const found: (string | undefined)[] = [ctx.cefr.get(w)]
  for (const f of analyzeForm(ctx.language, w)) found.push(ctx.cefr.get(f.lemma))
  const base = ctx.forms[w]
  if (base) found.push(ctx.cefr.get(base))
  // Feminine and plural of adjectives and nouns: contente → content, pequeñas → pequeño.
  for (const v of variants(w, ctx.language)) found.push(ctx.cefr.get(v))
  found.push(ctx.stemLevel.get(readingKey(w, ctx.language)))
  // Function words (sa, leur, del) are the first words of every level.
  if (STOP[ctx.language].has(w)) found.push('A1')
  const levels = found.filter((l): l is string => !!l)
  return levels.length ? levels.reduce((a, b) => (levelRank(a) <= levelRank(b) ? a : b)) : undefined
}

function variants(w: string, language: CheckContext['language']): string[] {
  const out = new Set<string>()
  const cut = (re: RegExp, to = '') => re.test(w) && out.add(w.replace(re, to))
  if (language === 'fr') {
    cut(/es$/)
    cut(/s$/)
    cut(/e$/)
    cut(/x$/)
    cut(/aux$/, 'al')
    cut(/ive?s?$/, 'if')
    cut(/euse?s?$/, 'eux')
    cut(/elle?s?$/, 'el')
    cut(/enne?s?$/, 'en')
  } else {
    // Question words carry an accent the list writes without: cómo, qué, dónde.
    out.add(w.normalize('NFD').replace(/\p{M}/gu, '').normalize('NFC'))
    cut(/as$/, 'o')
    cut(/a$/, 'o')
    cut(/os$/, 'o')
    cut(/es$/)
    cut(/s$/)
    cut(/ces$/, 'z')
  }
  return [...out]
}

const analyse = (text: string, ctx: CheckContext) => analyzeText(text, ctx.language, [], [], new Set())

const wordTokens = (a: ReadingAnalysis) => a.paragraphs.flat().flatMap((s) => s.tokens.filter((t) => t.key && t.status !== 'name' && !/\d/.test(t.text)))

/** A capitalised word no list knows is a name (Léa, Lille), left out of the level count. */
const isName = (text: string, ctx: CheckContext) => /^\p{Lu}/u.test(text) && !wordLevel(text, ctx)

export interface LevelFit {
  share: number
  total: number
  /** The words above the level (or in no list), each once. */
  above: string[]
}

/** How much of a text is at or below a level, names and the listed new words aside. */
export function levelFit(text: string, level: string, ctx: CheckContext, exclude: readonly string[] = []): LevelFit {
  const skip = new Set(exclude.flatMap((w) => [w.toLocaleLowerCase(ctx.language), readingKey(w, ctx.language)]))
  const tokens = wordTokens(analyse(text, ctx)).filter((t) => !isName(t.text, ctx) && !skip.has(t.text.toLocaleLowerCase(ctx.language)) && !skip.has(t.key!))
  const above = new Set<string>()
  let fit = 0
  for (const t of tokens) {
    if (levelRank(wordLevel(t.text, ctx)) <= levelRank(level)) fit++
    else above.add(t.text.toLocaleLowerCase(ctx.language))
  }
  return { share: tokens.length ? fit / tokens.length : 1, total: tokens.length, above: [...above] }
}

/** How often a text uses a grammar topic: forms of its tense, or matches of its pattern; undefined when it can't be seen. */
export function topicUses(text: string, topic: string, ctx: CheckContext): number | undefined {
  const tense = LESSON_TENSE[topic]
  if (tense) return textForms(ctx.language, analyse(text, ctx)).filter((f) => f.tense === tense).length
  const pattern = topicPattern(topic)
  if (pattern) return [...text.replace(/’/g, "'").matchAll(new RegExp(pattern.source, 'giu'))].length
  return undefined
}

/** The fewest uses of a target topic a text of the level must show. */
export const topicMinimum = (level: string, tense: boolean) => (tense ? (levelRank(level) <= 2 ? 3 : 5) : 2)

const hasBanned = (text: string, ctx: CheckContext) => {
  const lower = text.toLocaleLowerCase(ctx.language).replace(/’/g, "'")
  return ctx.banned.filter((b) => new RegExp(`(?<![\\p{L}])${b.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}])`, 'u').test(lower))
}

const filled = (s: unknown): s is string => typeof s === 'string' && s.trim().length > 0

function jobChecks(id: string, batch: string, numberRe: RegExp, job: ContentJob | undefined, errors: string[]) {
  if (!numberRe.test(id)) errors.push(`id "${id}" has the wrong shape`)
  if (!job) return
  if (batch !== job.id) errors.push(`batch "${batch}" is not the job "${job.id}"`)
  const n = numberOf(id)
  if (n < job.ids.from || n > job.ids.to) errors.push(`id ${id} is outside the job's range ${job.ids.from}–${job.ids.to}`)
}

export interface ReadingOptions {
  job?: ContentJob
  /** The other texts, for the near-duplicate check. */
  index?: SimilarityIndex
}

export function checkReading(item: ReadingItem, ctx: CheckContext, opts: ReadingOptions = {}): Verdict {
  const errors: string[] = []
  const warnings: string[] = []
  const plan = ctx.plan
  jobChecks(item.id, item.batch, READING_ID, opts.job, errors)
  if (item.language !== ctx.language) errors.push(`language "${item.language}"`)
  if (!CONTENT_LEVELS.includes(item.level)) {
    errors.push(`level "${item.level}"`)
    return { errors, warnings }
  }
  if (opts.job && (item.level !== opts.job.level || (opts.job.theme && item.theme !== opts.job.theme) || (opts.job.genre && item.genre !== opts.job.genre))) errors.push('level, theme or genre differs from the job')
  if (!plan.themes.some((t) => t.id === item.theme)) errors.push(`unknown theme "${item.theme}"`)
  if (!plan.genres.some((g) => g.id === item.genre)) errors.push(`unknown genre "${item.genre}"`)
  if (!Array.isArray(item.grammar) || !item.grammar.length) errors.push('no grammar target')
  for (const t of item.grammar ?? []) if (!TOPIC_NAME[t]) errors.push(`unknown grammar topic "${t}"`)
  if (item.source !== SOURCE) errors.push(`source must be "${SOURCE}"`)
  if (!filled(item.title) || item.title.length > 80) errors.push('title missing or longer than 80')
  const paras = Array.isArray(item.paragraphs) ? item.paragraphs : []
  if (!paras.length || paras.length > 12 || !paras.every(filled)) errors.push('1–12 filled paragraphs')
  if (!Array.isArray(item.tr) || item.tr.length !== paras.length || !item.tr.every(filled)) errors.push('the Turkish needs one filled paragraph per paragraph')
  if (errors.length) return { errors, warnings }

  const text = paras.join('\n\n')
  const lower = text.toLocaleLowerCase(ctx.language).replace(/’/g, "'")
  const voc = Array.isArray(item.vocabulary) ? item.vocabulary : []
  if (item.firstStep) {
    errors.push(...firstStepErrors(item, ctx))
  } else if (voc.length < 6 || voc.length > 12) errors.push(`vocabulary needs 6–12 words, has ${voc.length}`)
  const vw = new Set<string>()
  for (const v of voc) {
    if (!filled(v?.word) || !filled(v?.lemma) || !filled(v?.tr)) {
      errors.push('a vocabulary entry is missing its word, lemma or Turkish')
      continue
    }
    const w = v.word.toLocaleLowerCase(ctx.language).replace(/’/g, "'")
    if (vw.has(w)) errors.push(`"${v.word}" is twice in the vocabulary`)
    vw.add(w)
    if (!new RegExp(`(?<![\\p{L}])${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}])`, 'u').test(lower)) errors.push(`vocabulary word "${v.word}" is not in the text as written`)
  }
  const qs = Array.isArray(item.questions) ? item.questions : []
  if (qs.length < 3 || qs.length > 5) errors.push(`3–5 questions, has ${qs.length}`)
  for (const [i, q] of qs.entries()) {
    const opts2 = Array.isArray(q?.options) ? q.options : []
    if (!filled(q?.q) || !filled(q?.why)) errors.push(`question ${i + 1}: needs its question and why`)
    if (opts2.length < 3 || opts2.length > 4 || new Set(opts2.map((o) => o.trim().toLocaleLowerCase('tr'))).size !== opts2.length || !opts2.every(filled))
      errors.push(`question ${i + 1}: 3–4 different options`)
    if (!Number.isInteger(q?.answer) || q.answer < 0 || q.answer >= opts2.length) errors.push(`question ${i + 1}: the answer is no option`)
    if (opts2.some((o) => /^(hepsi|hiçbiri)/i.test(o.trim()))) errors.push(`question ${i + 1}: no "hepsi / hiçbiri" option`)
  }

  const level = plan.levels[item.level]
  const analysis = analyse(text, ctx)
  const tokens = wordTokens(analysis)
  const count = analysis.paragraphs.flat().reduce((n, s) => n + s.tokens.filter((t) => t.key).length, 0)
  const bounds = item.firstStep ? [40, 80] : level.words
  if (count < bounds[0] || count > bounds[1]) errors.push(`${count} words, ${item.level} asks ${bounds[0]}–${bounds[1]}`)
  const sentences = analysis.paragraphs.flat().filter((s) => s.tokens.some((t) => t.key))
  const average = sentences.length ? count / sentences.length : 0
  if (average > level.sentenceWords) errors.push(`sentences average ${average.toFixed(1)} words, ${item.level} asks at most ${level.sentenceWords}`)
  const fit = levelFit(text, item.level, ctx, voc.map((v) => v.word))
  if (fit.share < LEVEL_FIT) errors.push(`only ${Math.round(fit.share * 100)} % of the words are ${item.level} or below (needs ${LEVEL_FIT * 100} %); above: ${fit.above.slice(0, 15).join(', ')}`)
  else if (fit.above.length) warnings.push(`above ${item.level} or unlisted: ${fit.above.slice(0, 20).join(', ')}`)
  for (const t of item.grammar) {
    const uses = topicUses(text, t, ctx)
    if (uses === undefined) {
      warnings.push(`grammar target "${t}" cannot be counted automatically`)
      continue
    }
    const min = topicMinimum(item.level, !!LESSON_TENSE[t])
    if (uses < min) errors.push(`grammar target "${t}" is used ${uses} times, needs ${min}`)
  }
  const unknown = [...new Set(tokens.filter((t) => !isName(t.text, ctx) && !wordLevel(t.text, ctx) && !vw.has(t.text.toLocaleLowerCase(ctx.language))).map((t) => t.text))]
  if (unknown.length) warnings.push(`in no list (typo?): ${unknown.slice(0, 15).join(', ')}`)
  const banned = hasBanned(`${item.title}\n${text}`, ctx)
  if (banned.length) errors.push(`banned words: ${banned.join(', ')}`)
  const near = opts.index?.closest(item.id, text, READING_SIMILAR)
  if (near) errors.push(`${Math.round(near.score * 100)} % like ${near.id}`)
  return { errors, warnings }
}

export interface GrammarOptions {
  job?: ContentJob
  index?: SimilarityIndex
}

export function checkGrammarItem(item: ContentGrammar, ctx: CheckContext, opts: GrammarOptions = {}): Verdict {
  const errors: string[] = []
  const warnings: string[] = []
  jobChecks(item.id, item.batch, GRAMMAR_ID, opts.job, errors)
  if (item.language !== ctx.language) errors.push(`language "${item.language}"`)
  if (!CONTENT_LEVELS.includes(item.level as never)) errors.push(`level "${item.level}"`)
  if (!TOPIC_NAME[item.topic]) errors.push(`unknown topic "${item.topic}"`)
  if (opts.job && (item.topic !== opts.job.grammar[0] || item.level !== opts.job.level)) errors.push('topic or level differs from the job')
  if (opts.job?.subskills?.length && item.subskill && !opts.job.subskills.includes(item.subskill)) errors.push(`sub-skill "${item.subskill}" is not the job's`)
  if (!Number.isInteger(item.difficulty) || item.difficulty < 1 || item.difficulty > 5) errors.push('difficulty must be 1–5')
  if (!['cloze', 'choice', 'error'].includes(item.type)) errors.push(`type "${item.type}"`)
  if (!filled(item.prompt) || !filled(item.answer)) errors.push('prompt or answer missing')
  if (!filled(item.explanation) || item.explanation.length <= 20) errors.push('the rule needs more than 20 characters')
  if (item.source !== SOURCE) errors.push(`source must be "${SOURCE}"`)
  if (errors.length) return { errors, warnings }
  if (item.type === 'error') {
    if (!filled(item.fix)) errors.push('an error question needs its fix')
    else {
      if (sentenceTokens(item).filter((t) => t.wrong).length !== 1) errors.push('the wrong word must be marked once')
      if (sentenceTokens(item).filter((t) => t.word && t.text.toLowerCase() === item.answer.toLowerCase()).length !== 1) errors.push('the wrong word must stand in the sentence once')
    }
  } else {
    if ((item.prompt.match(/___/g) ?? []).length !== 1) errors.push('exactly one "___"')
    else if (checkGrammar(item, item.answer) !== 'correct') errors.push('its own answer is not taken as right')
  }
  if (item.type === 'choice') {
    const options = item.options ?? []
    if (options.length < 3 || options.length > 4) errors.push('3–4 options')
    if (!options.includes(item.answer)) errors.push('the answer is not among the options')
    else if (options.filter((o) => checkGrammar(item, o) !== 'wrong').length !== 1) errors.push('more than one option is right')
  }
  const banned = hasBanned(`${item.prompt}\n${(item.options ?? []).join(' ')}`, ctx)
  if (banned.length) errors.push(`banned words: ${banned.join(', ')}`)
  const near = opts.index?.closest(item.id, item.prompt, GRAMMAR_SIMILAR)
  if (near) errors.push(`${Math.round(near.score * 100)} % like ${near.id}`)
  return { errors, warnings }
}
