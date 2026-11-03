import { createRng, shuffle } from '../../engine/rng'
import { tenseSentencePool, type PooledSentence, type Tense } from '../../engine/tenses'
import { CORE_TENSES, type LabLanguage } from './labShared'

const SIZE = 8

export interface SheetRow extends PooledSentence {
  tense: Tense
}

/**
 * The rows of a worksheet: `size` sentences, each with a different verb. In one tense the chosen verb
 * comes first and then the learner's own and the most common verbs; mixed, the core tenses take turns.
 */
export function sheetRows(language: LabLanguage, verb: string, tense: Tense, mixed: boolean, verbs: readonly string[], seed: number, size = SIZE): SheetRow[] {
  const rng = createRng(seed)
  const tenses = mixed ? shuffle(CORE_TENSES[language], rng) : [tense]
  const rows: SheetRow[] = []
  const used = new Set<string>()
  const rank = new Map(verbs.map((v, i) => [v, i]))
  const pools = tenses.map((t) => ({ t, pool: tenseSentencePool(language, t) }))
  for (let i = 0; rows.length < size && i < size * 4; i++) {
    const { t, pool } = pools[i % pools.length]
    const fresh = pool.filter((s) => !used.has(s.verb))
    if (!fresh.length) continue
    // The chosen verb first (in its own tense), then verbs the learner knows, then any.
    const chosen = !mixed && rows.length === 0 ? fresh.find((s) => s.verb === verb) : undefined
    const near = fresh.filter((s) => rank.has(s.verb) && (rank.get(s.verb) as number) < 400)
    const from = chosen ? [chosen] : near.length >= 3 ? near : fresh
    const item = from[Math.floor(rng() * from.length)]
    used.add(item.verb)
    rows.push({ ...item, tense: t })
  }
  return rows
}
