/**
 * Sync tombstones: what was deleted (words, sentences, reading texts) and when, so another
 * device's copy doesn't bring it back. Each id keeps its latest mark, and a mark can also say
 * "alive again" (undo). Something created after its deletion (the same word added again) is
 * not dead: only copies at least as old as the deletion are.
 *
 * Older versions stored bare ids; those count as deleted at the time of the snapshot they came
 * from, which is no earlier than the deletion itself.
 */
export type Tombstone = string | { id: string; at: string; alive?: boolean }

export interface Mark {
  at: number
  alive: boolean
}

const time = (d: Date | string | number | undefined) => (d === undefined ? NaN : typeof d === 'number' ? d : new Date(d).getTime())

export function tombMap(list: readonly Tombstone[] | undefined, legacyAt: number): Map<string, Mark> {
  const map = new Map<string, Mark>()
  for (const t of list ?? []) {
    const [id, mark] = typeof t === 'string' ? [t, { at: legacyAt, alive: false }] : [t.id, { at: time(t.at), alive: !!t.alive }]
    if (!Number.isFinite(mark.at)) continue
    keepLatest(map, id, mark)
  }
  return map
}

/** The later mark wins; on a tie, deleted wins. */
function keepLatest(map: Map<string, Mark>, id: string, mark: Mark) {
  const old = map.get(id)
  if (!old || mark.at > old.at || (mark.at === old.at && !mark.alive)) map.set(id, mark)
}

export function mergeTombs(...maps: Map<string, Mark>[]): Map<string, Mark> {
  const out = new Map<string, Mark>()
  for (const m of maps) for (const [id, mark] of m) keepLatest(out, id, mark)
  return out
}

export function tombList(map: Map<string, Mark>): Tombstone[] {
  return [...map].map(([id, m]) => (m.alive ? { id, at: new Date(m.at).toISOString(), alive: true } : { id, at: new Date(m.at).toISOString() }))
}

/** Whether a copy of `id` created at `createdAt` (unknown = old) was deleted. */
export function isDead(map: Map<string, Mark>, id: string, createdAt?: Date | string | number): boolean {
  const m = map.get(id)
  if (!m || m.alive) return false
  const created = time(createdAt)
  return !(Number.isFinite(created) && created > m.at)
}

/** Ids currently deleted, whatever their copies' age. */
export function deadIds(list: readonly Tombstone[] | undefined): Set<string> {
  return new Set([...tombMap(list, 0)].filter(([, m]) => !m.alive).map(([id]) => id))
}
