import { describe, expect, it } from 'vitest'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { shardOf, type ContentManifest, type PublishedGrammar, type PublishedReading } from '../engine/contentTypes'
import { checkGrammar, TOPIC_NAME } from '../engine/grammar'

/**
 * What the build wrote (public/content/<lang>/, `npm run content -- build`) is what the app fetches: the manifest must
 * describe its files exactly, every id must find its file, and nothing published may break the app's own rules.
 */
const langs = (['fr', 'es'] as const).filter((l) => existsSync(`public/content/${l}/manifest.json`))

describe.each(langs)('published content (%s)', (lang) => {
  const dir = `public/content/${lang}`
  const m = JSON.parse(readFileSync(`${dir}/manifest.json`, 'utf8')) as ContentManifest
  const read = <T>(path: string) => JSON.parse(readFileSync(`${dir}/${path}`, 'utf8')) as T[]
  const readingShards = Object.values(m.reading).flat()
  const grammarShards = Object.values(m.grammar).flat()

  it('the manifest describes its files: counts, sizes and no file left over', () => {
    const listed = new Set([...readingShards, ...grammarShards].map((s) => s.path))
    const onDisk = (sub: string) => (existsSync(`${dir}/${sub}`) ? readdirSync(`${dir}/${sub}`, { recursive: true }).filter((f) => String(f).endsWith('.json')).map((f) => `${sub}/${String(f)}`) : [])
    expect(new Set([...onDisk('reading'), ...onDisk('grammar')])).toEqual(listed)
    for (const s of [...readingShards, ...grammarShards]) {
      const text = readFileSync(`${dir}/${s.path}`, 'utf8')
      expect(JSON.parse(text).length, s.path).toBe(s.count)
      expect(Buffer.byteLength(text), s.path).toBe(s.bytes)
      expect(Math.abs(gzipSync(text).length - s.gzip), s.path).toBeLessThan(64)
    }
    expect(readingShards.reduce((n, s) => n + s.count, 0)).toBe(m.counts.reading.total)
    expect(grammarShards.reduce((n, s) => n + s.count, 0)).toBe(m.counts.grammar.total)
  })

  it('every id is once, finds its own file, and no retired id is published', () => {
    const seen = new Set<string>()
    for (const [kind, shards] of [['reading', readingShards], ['grammar', grammarShards]] as const) {
      for (const s of shards) {
        for (const item of read<{ id: string }>(s.path)) {
          expect(seen.has(item.id), item.id).toBe(false)
          seen.add(item.id)
          expect(shardOf(shards, item.id)?.path, `${kind} ${item.id}`).toBe(s.path)
          expect(m.retired).not.toContain(item.id)
        }
      }
    }
  })

  it('texts carry their Turkish, words and questions; questions keep the app’s rules', () => {
    for (const s of readingShards) {
      for (const r of read<PublishedReading>(s.path)) {
        expect(r.tr.length, r.id).toBe(r.paragraphs.length)
        expect(r.questions.length, r.id).toBeGreaterThanOrEqual(3)
        for (const q of r.questions) expect(q.options[q.answer], r.id).toBeTruthy()
      }
    }
    for (const [topic, shards] of Object.entries(m.grammar)) {
      expect(TOPIC_NAME[topic], topic).toBeTruthy()
      for (const s of shards) {
        for (const q of read<PublishedGrammar>(s.path)) {
          expect(q.topic).toBe(topic)
          if (q.type !== 'error') expect(checkGrammar(q, q.answer), q.id).toBe('correct')
          if (q.type === 'choice') expect(q.options!.filter((o) => checkGrammar(q, o) !== 'wrong'), q.id).toHaveLength(1)
        }
      }
    }
  })
})

it('there is published content in both languages', () => {
  expect(langs).toEqual(['fr', 'es'])
})
