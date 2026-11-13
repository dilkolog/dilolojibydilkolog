import { existsSync, readFileSync } from 'node:fs'
import { addConjugations } from '../../../src/engine/conjugation'
import { parseCefrList, type CefrList } from '../../../src/engine/cefrLevels'
import type { ContentLanguage } from '../../../src/engine/contentTypes'
import { readingKey } from '../../../src/engine/reading'
import { addTenses, tensesLoaded } from '../../../src/engine/tenses'
import type { ContentPlan } from './types'

/** What the checks need of one language, read once from the repository (the tools run from its root). */
export interface CheckContext {
  language: ContentLanguage
  plan: ContentPlan
  cefr: CefrList
  /** CEFR level by reading key (stem): a form the list lacks still finds its word. */
  stemLevel: Map<string, string>
  /** Inflected form → dictionary form (the word pack's table). */
  forms: Record<string, string>
  banned: string[]
  /** Frequency rank (1 = most frequent) by reading key, from src/data/frequency/<lang>.txt. */
  frequency: Map<string, number>
}

const RANK: Record<string, number> = { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 }
export const levelRank = (level: string | undefined) => (level ? (RANK[level] ?? 9) : 9)

export const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T

export function loadPlan(language: ContentLanguage, root = '.'): ContentPlan {
  return readJson<ContentPlan>(`${root}/content/plan/${language}.json`)
}

/** Loads the verb tables (as the app does) once per language. */
export function loadTables(language: ContentLanguage, root = '.') {
  if (tensesLoaded(language)) return
  addTenses(language, readJson<Record<string, unknown>>(`${root}/src/data/tenses/${language}.json`))
  addConjugations(language, readFileSync(`${root}/src/data/conjugation/${language}.txt`, 'utf8'))
}

const contexts = new Map<string, CheckContext>()

export function loadContext(language: ContentLanguage, root = '.'): CheckContext {
  const key = `${root}|${language}`
  const hit = contexts.get(key)
  if (hit) return hit
  loadTables(language, root)
  const cefr = parseCefrList(readFileSync(`${root}/src/data/cefr/${language}.txt`, 'utf8'))
  const stemLevel = new Map<string, string>()
  for (const [word, level] of cefr) {
    if (word.includes(' ')) continue
    const k = readingKey(word, language)
    const old = stemLevel.get(k)
    if (!old || levelRank(level) < levelRank(old)) stemLevel.set(k, level)
  }
  const pack = readJson<{ f: Record<string, string> }>(`${root}/src/data/wordpack/${language}.json`)
  const bannedPath = `${root}/content/style/banned.json`
  const banned = existsSync(bannedPath) ? (readJson<Record<string, string[]>>(bannedPath)[language] ?? []) : []
  const frequency = new Map<string, number>()
  readFileSync(`${root}/src/data/frequency/${language}.txt`, 'utf8')
    .split('\n')
    .forEach((word, i) => {
      const w = word.trim()
      if (!w) return
      const k = readingKey(w, language)
      if (!frequency.has(k)) frequency.set(k, i + 1)
    })
  const ctx: CheckContext = { language, plan: loadPlan(language, root), cefr, stemLevel, forms: pack.f, banned, frequency }
  contexts.set(key, ctx)
  return ctx
}
