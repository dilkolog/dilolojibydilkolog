import { shardOf, type ContentLanguage, type ContentLevel, type ContentManifest, type PublishedGrammar, type PublishedReading, type ShardInfo } from '../engine/contentTypes'
import type { GrammarExercise } from '../engine/grammar'
import type { ReadingText } from './db'

/**
 * The factory's published content (docs/ICERIK-FABRIKASI.md §6): public/content/<lang>/, fetched file by file when a
 * screen needs it, never in the first bundle. The service worker keeps the files once seen (their names change with
 * their content), so a text or topic opened once works offline; the manifest is asked anew when online.
 */
const BASE = '/content'

const manifests = new Map<ContentLanguage, Promise<ContentManifest | null>>()
const shards = new Map<string, Promise<unknown[]>>()

const isContentLanguage = (l: string): l is ContentLanguage => l === 'fr' || l === 'es'

/** The language's manifest, or null when there is none (no content yet, or offline and never fetched). */
export function loadManifest(language: string): Promise<ContentManifest | null> {
  if (!isContentLanguage(language)) return Promise.resolve(null)
  const hit = manifests.get(language)
  if (hit) return hit
  const p = fetch(`${BASE}/${language}/manifest.json`)
    .then((r) => (r.ok ? (r.json() as Promise<ContentManifest>) : null))
    .then((m) => (m && m.language === language ? m : null))
    .catch(() => null)
    .then((m) => {
      // A failure is not remembered: the next screen asks again (it may be online by then).
      if (!m) manifests.delete(language)
      return m
    })
  manifests.set(language, p)
  return p
}

/** One file of a manifest; throws when it can't be had (offline and not kept). */
export function loadShard<T>(language: ContentLanguage, shard: ShardInfo): Promise<T[]> {
  const key = `${language}/${shard.path}`
  const hit = shards.get(key)
  if (hit) return hit as Promise<T[]>
  const p = fetch(`${BASE}/${key}`)
    .then((r) => {
      if (!r.ok) throw new Error(`content ${r.status}`)
      return r.json() as Promise<T[]>
    })
    .catch((e: unknown) => {
      shards.delete(key)
      throw e
    })
  shards.set(key, p)
  return p
}

/** For tests: forget what was fetched. */
export function resetContentCache() {
  manifests.clear()
  shards.clear()
}

// Reading

export const readingShards = (m: ContentManifest, level: ContentLevel) => m.reading[level] ?? []

/** The texts of a level's file, by number (from 0). */
export async function readingPage(language: ContentLanguage, m: ContentManifest, level: ContentLevel, page = 0): Promise<PublishedReading[]> {
  const shard = readingShards(m, level)[page]
  return shard ? loadShard<PublishedReading>(language, shard) : []
}

/** The library's id of a published text: the same text opened twice is one entry (its history and marks stay). */
export const contentTextId = (id: string) => `content-${id}`

export const CONTENT_SOURCE = 'Diloloji metinleri'

/** A published text as a library text: the reader, word adding, dictation and shadowing then work as for any text. */
/** The level of one of Diloloji's own texts saved in the library ("Diloloji metinleri (A1)"), else undefined. */
export function contentLevelOf(text: Pick<ReadingText, 'source'>): string | undefined {
  const prefix = `${CONTENT_SOURCE} (`
  return text.source?.startsWith(prefix) && text.source.endsWith(')') ? text.source.slice(prefix.length, -1) : undefined
}

export function contentReadingText(r: PublishedReading, now = new Date()): ReadingText {
  return {
    id: contentTextId(r.id),
    language: r.language,
    title: r.title,
    text: r.paragraphs.join('\n\n'),
    turkish: r.tr,
    source: `${CONTENT_SOURCE} (${r.level})`,
    credit: 'Diloloji için yazılmış özgün metin',
    questions: r.questions.map((q) => ({ question: q.q, options: q.options, answer: q.answer, explanation: q.why })),
    addedAt: now.toISOString(),
    history: [],
  }
}

// Grammar

const retiredOf = (m: ContentManifest) => new Set(m.retired)
const asExercise = ({ difficulty: _d, subskill: _s, fromText: _f, ...q }: PublishedGrammar): GrammarExercise => q

/** The topics with published questions and how many. */
export const grammarTopics = (m: ContentManifest | null): Record<string, number> => (m ? m.counts.grammar.byTopic : {})

/** Every published question of a topic (retired ones left out). */
export async function grammarForTopic(language: ContentLanguage, m: ContentManifest, topic: string): Promise<GrammarExercise[]> {
  const out = retiredOf(m)
  const parts = await Promise.all((m.grammar[topic] ?? []).map((s) => loadShard<PublishedGrammar>(language, s)))
  return parts.flat().filter((q) => !out.has(q.id)).map(asExercise)
}

/**
 * The published questions among some ids (a learner's log, for review): only the files that hold them are fetched.
 * A file that can't be had is skipped (offline): its questions simply wait.
 */
export async function grammarForIds(language: ContentLanguage, m: ContentManifest, ids: Iterable<string>): Promise<GrammarExercise[]> {
  const all = Object.values(m.grammar).flat()
  const want = new Set(ids)
  const needed = new Map<string, ShardInfo>()
  for (const id of want) {
    const s = shardOf(all, id)
    if (s) needed.set(s.path, s)
  }
  const out = retiredOf(m)
  const parts = await Promise.all([...needed.values()].map((s) => loadShard<PublishedGrammar>(language, s).catch(() => [] as PublishedGrammar[])))
  return parts.flat().filter((q) => want.has(q.id) && !out.has(q.id)).map(asExercise)
}

/**
 * Where a text stands for a beginner (lower first): the first-step series in its order, then the starter texts (short
 * texts written from the most frequent words, read in any order), then the rest.
 */
export const beginnerRank = (r: Pick<PublishedReading, 'firstStep' | 'starter'>): number => (r.firstStep ? r.firstStep.position : r.starter ? 1000 : 2000)
