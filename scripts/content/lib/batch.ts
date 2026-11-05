import type { ContentGrammar, ReadingItem } from '../../../src/engine/contentTypes'
import type { CheckContext } from './context'
import { checkGrammarItem, checkReading } from './rules'
import { SimilarityIndex } from './similarity'
import type { CheckIssue, ContentJob, ContentKind } from './types'

export interface BatchResult {
  accepted: string[]
  rejected: CheckIssue[]
  warnings: CheckIssue[]
}

const textOf = (kind: ContentKind, item: ReadingItem | ContentGrammar) => (kind === 'reading' ? (item as ReadingItem).paragraphs?.join('\n\n') ?? '' : (item as ContentGrammar).prompt ?? '')

/**
 * Checks a batch against the rules and against everything else of its kind (`others`: accepted content of
 * other batches). Items of the batch are compared with each other in order too, so the second of two twins fails.
 */
export function checkBatch(kind: ContentKind, items: readonly (ReadingItem | ContentGrammar)[], ctx: CheckContext, opts: { job?: ContentJob; others?: readonly (ReadingItem | ContentGrammar)[] } = {}): BatchResult {
  const index = kind === 'reading' ? new SimilarityIndex(5, 32) : new SimilarityIndex(3, 16)
  const ids = new Set<string>()
  for (const o of opts.others ?? []) {
    index.add(o.id, textOf(kind, o))
    ids.add(o.id)
  }
  const out: BatchResult = { accepted: [], rejected: [], warnings: [] }
  for (const item of items) {
    const v =
      kind === 'reading'
        ? checkReading(item as ReadingItem, ctx, { job: opts.job, index })
        : checkGrammarItem(item as ContentGrammar, ctx, { job: opts.job, index })
    if (ids.has(item.id)) v.errors.unshift(`id ${item.id} is used twice`)
    if (v.errors.length) out.rejected.push({ id: item.id, reasons: v.errors })
    else {
      out.accepted.push(item.id)
      index.add(item.id, textOf(kind, item))
    }
    ids.add(item.id)
    if (v.warnings.length) out.warnings.push({ id: item.id, reasons: v.warnings })
  }
  return out
}
