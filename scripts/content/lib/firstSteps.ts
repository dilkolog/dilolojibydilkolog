import { readFileSync } from 'node:fs'
import type { ReadingItem } from '../../../src/engine/contentTypes'
import { analyzeForm } from '../../../src/engine/tenses'
import { analyzeText } from '../../../src/engine/reading'
import { textForms } from '../../../src/engine/textForms'
import type { CheckContext } from './context'

/** Surface words only: examples and Turkish translations never extend the beginner lexicon. */
export const words = (text: string): string[] => text.toLowerCase().normalize('NFC').replace(/\b(?:j|l|d|n|s|c|m|t|qu)[’']/gu, '').match(/\p{L}+/gu) ?? []
const lexicons = new Map<string, Set<string>>()
export function beginnerLexicon(language: CheckContext['language']): Set<string> {
  const cached = lexicons.get(language)
  if (cached) return cached
  const frequency = readFileSync(`src/data/frequency/${language}.txt`, 'utf8').trim().split('\n').slice(0, 300)
  const starter = JSON.parse(readFileSync(`src/data/starterLists/${language}.json`, 'utf8')) as { lists: { items: { w: string }[] }[] }
  const set = new Set([...frequency, ...starter.lists.flatMap((list) => list.items.map((item) => item.w))].flatMap(words))
  lexicons.set(language, set)
  return set
}

/** Exact dictionary forms and known verb analyses, rather than a permissive stem match. */
export function isBeginnerWord(word: string, ctx: CheckContext): boolean {
  const allowed = beginnerLexicon(ctx.language)
  if (allowed.has(word)) return true
  if (ctx.forms[word] && allowed.has(ctx.forms[word])) return true
  if (analyzeForm(ctx.language, word).some((f) => allowed.has(f.lemma))) return true
  // Transparent regular noun/adjective agreement; no unrelated word obtained by cutting a stem.
  const candidates = ctx.language === 'fr'
    ? [word.replace(/s$/, ''), word.replace(/x$/, ''), word.replace(/aux$/, 'al'), word.replace(/es?$/, '')]
    : [word.replace(/s$/, ''), word.replace(/es$/, ''), word.replace(/ces$/, 'z'), word.replace(/as?$/, 'o')]
  return candidates.some((w) => w !== word && allowed.has(w))
}

export function outsideWords(item: ReadingItem, ctx: CheckContext): string[] {
  // Split French elisions (l'eau, j'ai) into the same component words as the allowlist.
  return [...new Set(words(item.paragraphs.join(' ')).filter((w) => !isBeginnerWord(w, ctx)))]
}

export function firstStepErrors(item: ReadingItem, ctx: CheckContext): string[] {
  const errors: string[] = []
  const sequence = item.firstStep!
  if (item.level !== 'A1') errors.push('first-step profile requires A1')
  if (!sequence.series || sequence.length !== 25 || !Number.isInteger(sequence.position) || sequence.position < 1 || sequence.position > sequence.length) errors.push('first-step needs a 25-item series and position 1–25')
  if (item.vocabulary.length > 4) errors.push('first-step vocabulary allows at most 4 words')
  for (const topic of item.grammar) if (!ctx.plan.levels.A1.topics.includes(topic)) errors.push(`first-step target is not an A1 plan topic: ${topic}`)
  const targets = new Set(item.vocabulary.flatMap((v) => words(v.word)))
  const missing = outsideWords(item, ctx).filter((w) => !targets.has(w))
  if (missing.length) errors.push(`first-step words outside top 300/starter lists need vocabulary: ${missing.join(', ')}`)
  const analysis = analyzeText(item.paragraphs.join('\n\n'), ctx.language, [], [], new Set())
  const present = ctx.language === 'fr' ? 'present' : 'presente'
  const nonPresent = textForms(ctx.language, analysis).filter((form) => form.tense !== present)
  if (nonPresent.length) errors.push(`first-step uses non-present forms: ${nonPresent.map((f) => `${f.form} (${f.tense})`).join(', ')}`)
  return errors
}

/** Every introduced target must occur in each of the following two texts, including across files. */
export function sequenceErrors(items: readonly ReadingItem[]): Map<string, string[]> {
  const result = new Map<string, string[]>()
  const series = new Map<string, ReadingItem[]>()
  for (const item of items) if (item.firstStep) series.set(item.firstStep.series, [...(series.get(item.firstStep.series) ?? []), item])
  for (const group of series.values()) {
    group.sort((a, b) => a.firstStep!.position - b.firstStep!.position)
    const targets = new Set(group.flatMap((item) => item.vocabulary.map((v) => v.word.toLowerCase())))
    const seen = new Set<string>()
    for (const [index, item] of group.entries()) {
      const errors: string[] = []
      if (group.length !== 25 || group.some((entry, i) => entry.firstStep!.position !== i + 1)) errors.push('first-step series needs all 25 unique consecutive positions')
      const body = new Set(words(item.paragraphs.join(' ')))
      for (const target of targets) {
        if (!body.has(target) || seen.has(target)) continue
        seen.add(target)
        for (let offset = 1; offset <= 2; offset++) {
          const next = group[index + offset]
          if (!next || !words(next.paragraphs.join(' ')).includes(target)) errors.push(`new target "${target}" must recur in next text ${item.firstStep!.position + offset}`)
        }
      }
      if (errors.length) result.set(item.id, errors)
    }
  }
  return result
}
