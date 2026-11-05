import { createHash } from 'node:crypto'
import { gzipSync } from 'node:zlib'
import { CONTENT_LEVELS, type ContentGrammar, type ContentLanguage, type ContentManifest, type PublishedGrammar, type PublishedReading, type ReadingItem, type ShardInfo } from '../../../src/engine/contentTypes'

/**
 * The published form of accepted content (docs/ICERIK-FABRIKASI.md §6.1): reading texts by level and grammar
 * questions by topic, cut into files of a fixed number of items, each named by its content so a browser may keep it
 * for ever. The manifest says which ids each file holds, as runs in id order.
 */
export const READING_PER_SHARD = 100
export const GRAMMAR_PER_SHARD = 300

const digest = (text: string, n = 8) => createHash('sha256').update(text).digest('hex').slice(0, n)

/** Ids of one file as runs: consecutive in the order of all ids of the kind, so the runs of different files never overlap. */
export function idRanges(ids: readonly string[], all: readonly string[]): [string, string][] {
  const mine = new Set(ids)
  const runs: [string, string][] = []
  let start: string | undefined
  let last: string | undefined
  for (const id of all) {
    if (mine.has(id)) {
      start ??= id
      last = id
    } else if (start) {
      runs.push([start, last!])
      start = undefined
    }
  }
  if (start) runs.push([start, last!])
  return runs
}

const chunk = <T>(list: readonly T[], size: number) => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, (i + 1) * size))

const byId = (a: { id: string }, b: { id: string }) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)

const publishReading = ({ batch: _b, source: _s, ...rest }: ReadingItem): PublishedReading => rest
const publishGrammar = ({ batch: _b, ...rest }: ContentGrammar): PublishedGrammar => rest

const tally = (values: readonly string[]) => values.reduce<Record<string, number>>((m, v) => ((m[v] = (m[v] ?? 0) + 1), m), {})

export interface BuiltContent {
  manifest: ContentManifest
  /** Paths under public/content/<lang>/ → file text. */
  files: Map<string, string>
}

export function buildContent(language: ContentLanguage, reading: readonly ReadingItem[], grammar: readonly ContentGrammar[], retired: readonly string[] = []): BuiltContent {
  const out = new Set(retired)
  const texts = reading.filter((r) => !out.has(r.id)).sort(byId)
  const questions = grammar.filter((g) => !out.has(g.id)).sort(byId)
  const files = new Map<string, string>()
  const shard = (dir: string, n: number, items: { id: string }[], all: string[], body: unknown[]): ShardInfo => {
    const text = JSON.stringify(body)
    const path = `${dir}/${n}-${digest(text)}.json`
    files.set(path, text)
    return { path, count: items.length, bytes: Buffer.byteLength(text), gzip: gzipSync(text).length, ranges: idRanges(items.map((i) => i.id), all) }
  }
  const allTexts = texts.map((t) => t.id)
  const readingShards: ContentManifest['reading'] = {}
  for (const level of CONTENT_LEVELS) {
    const at = texts.filter((t) => t.level === level)
    if (at.length) readingShards[level] = chunk(at, READING_PER_SHARD).map((part, i) => shard(`reading/${level}`, i + 1, part, allTexts, part.map(publishReading)))
  }
  const allQuestions = questions.map((q) => q.id)
  const grammarShards: ContentManifest['grammar'] = {}
  for (const topic of [...new Set(questions.map((q) => q.topic))].sort()) {
    const at = questions.filter((q) => q.topic === topic)
    grammarShards[topic] = chunk(at, GRAMMAR_PER_SHARD).map((part, i) => shard(`grammar/${topic}`, i + 1, part, allQuestions, part.map(publishGrammar)))
  }
  const manifest: ContentManifest = {
    language,
    version: digest([...files.keys()].sort().join('|') + [...out].sort().join('|'), 12),
    counts: {
      reading: { total: texts.length, byLevel: tally(texts.map((t) => t.level)), byTheme: tally(texts.map((t) => t.theme)), byGenre: tally(texts.map((t) => t.genre)) },
      grammar: { total: questions.length, byTopic: tally(questions.map((q) => q.topic)), byLevel: tally(questions.map((q) => q.level)) },
    },
    reading: readingShards,
    grammar: grammarShards,
    retired: [...out].sort(),
  }
  files.set('manifest.json', JSON.stringify(manifest))
  return { manifest, files }
}

/** Files of a build larger than the aim (§6.1: 50–150 KB gzipped). */
export const oversized = (m: ContentManifest, limit = 150 * 1024) => [...Object.values(m.reading).flat(), ...Object.values(m.grammar).flat()].filter((s) => s!.gzip > limit)
