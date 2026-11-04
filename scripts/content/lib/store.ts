import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { ContentGrammar, ContentLanguage, ReadingItem } from '../../../src/engine/contentTypes'
import type { CheckReport, ContentJob, ContentKind } from './types'

/** The content/ tree on disk (docs/ICERIK-FABRIKASI.md §7). Every tool runs from the repository root. */
export const jobDir = (lang: ContentLanguage, kind: ContentKind, root = '.') => join(root, 'content', 'jobs', lang, kind)
export const rawDir = (lang: ContentLanguage, kind: ContentKind, root = '.') => join(root, 'content', 'raw', lang, kind)
export const reportPath = (job: string, root = '.') => join(root, 'content', 'reports', `${job}.json`)

export function writeFile(path: string, text: string) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, text)
}

export const writeJson = (path: string, value: unknown) => writeFile(path, `${JSON.stringify(value, null, 2)}\n`)

const files = (dir: string, ext: string) => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(ext)).sort().map((f) => join(dir, f)) : [])

export function loadJobs(lang: ContentLanguage, kind: ContentKind, root = '.'): ContentJob[] {
  return files(jobDir(lang, kind, root), '.json').map((f) => JSON.parse(readFileSync(f, 'utf8')) as ContentJob)
}

export function findJob(id: string, root = '.'): ContentJob | undefined {
  const [lang, kind] = id.split('-') as [ContentLanguage, ContentKind]
  const path = join(jobDir(lang, kind, root), `${id}.json`)
  return existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as ContentJob) : undefined
}

/** One item per line; a line that is not JSON is reported by its number, not skipped silently. */
export function readJsonl<T>(path: string): { items: T[]; broken: number[] } {
  const items: T[] = []
  const broken: number[] = []
  for (const [i, line] of readFileSync(path, 'utf8').split('\n').entries()) {
    if (!line.trim()) continue
    try {
      items.push(JSON.parse(line) as T)
    } catch {
      broken.push(i + 1)
    }
  }
  return { items, broken }
}

export const rawFiles = (lang: ContentLanguage, kind: ContentKind, root = '.') => files(rawDir(lang, kind, root), '.jsonl')

export function loadRaw(lang: ContentLanguage, kind: 'reading', root?: string): ReadingItem[]
export function loadRaw(lang: ContentLanguage, kind: 'grammar', root?: string): ContentGrammar[]
export function loadRaw(lang: ContentLanguage, kind: ContentKind, root = '.'): (ReadingItem | ContentGrammar)[] {
  return rawFiles(lang, kind, root).flatMap((f) => readJsonl<ReadingItem | ContentGrammar>(f).items)
}

export function loadReports(root = '.'): CheckReport[] {
  return files(join(root, 'content', 'reports'), '.json').map((f) => JSON.parse(readFileSync(f, 'utf8')) as CheckReport)
}

/** content/retired/<lang>.json: ids taken out of rounds (§6.4). */
export function loadRetired(lang: ContentLanguage, root = '.'): string[] {
  const path = join(root, 'content', 'retired', `${lang}.json`)
  return existsSync(path) ? (JSON.parse(readFileSync(path, 'utf8')) as string[]) : []
}
