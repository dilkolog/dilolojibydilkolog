import type { ContentGrammar } from '../../../src/engine/contentTypes'
import { checkGrammar } from '../../../src/engine/grammar'

/**
 * content/review/<job>.solver.json: a batch solved by an agent that did not write it and never saw the key
 * (docs/ICERIK-FABRIKASI.md §5.2). For each question, the answer it found and whether it is the only right one.
 */
export interface SolverFile {
  job: string
  results: { id: string; answer: string; single: boolean; note?: string }[]
}

/** Disagreements: the solver's answer is not taken as right, or it saw a second right answer. */
export function solverDisagreements(items: readonly ContentGrammar[], file: SolverFile) {
  const byId = new Map(items.map((i) => [i.id, i]))
  return file.results.filter((r) => {
    const item = byId.get(r.id)
    if (!item) return false
    const right = item.type === 'error' ? r.answer.trim().toLowerCase() === item.answer.toLowerCase() : checkGrammar(item, r.answer) !== 'wrong'
    return !right || !r.single
  })
}

export function solverStats(items: readonly ContentGrammar[], file: SolverFile) {
  const checked = file.results.filter((r) => items.some((i) => i.id === r.id)).length
  const disagreements = solverDisagreements(items, file).length
  return { checked, disagreements, rate: checked ? disagreements / checked : 0 }
}
