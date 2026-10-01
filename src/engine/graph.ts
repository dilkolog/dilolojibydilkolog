import { stem } from './extract'
import type { VocabularyEntry } from './types'

export type LinkKind = 'confusable' | 'synonym' | 'antonym' | 'related' | 'family' | 'root' | 'tag'

export interface GraphLink {
  source: string
  target: string
  kind: LinkKind
}

/**
 * The learner's personal vocabulary graph: explicit relations, word-family links, shared roots
 * (same stem) and shared tags. Tag groups are chained rather than fully connected so a big tag
 * doesn't turn the picture into a hairball.
 */
export function buildWordGraph(entries: readonly VocabularyEntry[]): GraphLink[] {
  const ids = new Set(entries.map((e) => e.id))
  const links = new Map<string, GraphLink>()
  const add = (a: string, b: string, kind: LinkKind) => {
    if (a === b || !ids.has(a) || !ids.has(b)) return
    const key = [a, b].sort().join('|')
    if (!links.has(key)) links.set(key, { source: a, target: b, kind })
  }
  for (const e of entries) {
    for (const r of e.relations) add(e.id, r.targetId, r.type)
    for (const m of e.wordFamily) if (m.entryId) add(e.id, m.entryId, 'family')
  }
  const byStem = new Map<string, string[]>()
  for (const e of entries) {
    const k = `${e.language}:${stem(e.lemma, e.language)}`
    byStem.set(k, [...(byStem.get(k) ?? []), e.id])
  }
  for (const group of byStem.values()) for (let i = 1; i < group.length; i++) add(group[0], group[i], 'root')
  const byTag = new Map<string, string[]>()
  for (const e of entries) for (const t of e.tags) byTag.set(t, [...(byTag.get(t) ?? []), e.id])
  for (const group of byTag.values()) for (let i = 1; i < group.length; i++) add(group[i - 1], group[i], 'tag')
  return [...links.values()]
}
