import type { KelimeDB } from './db'
import { isDead, tombMap } from './tombstones'
import { isFinished, type Session } from '../engine/session'
import type { SessionDraft } from './sessionDraft'

export const learningResetKey = (id: string) => `reset-word:${id}`

/** Remove only this list's work from a mixed, paused round. */
function withoutWords(s: Session, ids: ReadonlySet<string>): Session {
  const omit = <T>(record: Record<string, T> | undefined) => Object.fromEntries(Object.entries(record ?? {}).filter(([id]) => !ids.has(id)))
  return {
    ...s,
    index: s.items.slice(0, s.index).filter((it) => !ids.has(it.entryId)).length,
    items: s.items.filter((it) => !ids.has(it.entryId)),
    log: s.log.filter((l) => !ids.has(l.entryId)),
    retries: omit(s.retries), relearn: omit(s.relearn), relearnSkills: omit(s.relearnSkills),
    followUps: omit(s.followUps), followUpTargets: omit(s.followUpTargets),
    pendingLearning: s.pendingLearning?.filter((id) => !ids.has(id)),
  }
}

/** A reset affects learning history, never vocabulary, levels or the list itself. */
export async function resetListLearning(db: KelimeDB, listId: string, at = Date.now()) {
  return db.transaction('rw', [db.vocabulary, db.wordStates, db.events, db.mistakes, db.meta], async () => {
    const words = await db.vocabulary.filter((w) => w.listId === listId).toArray()
    const ids = words.map((w) => w.id)
    const selected = new Set(ids)
    const marks = ids.map(learningResetKey)
    const snapshot = {
      wordStates: (await db.wordStates.bulkGet(ids)).filter((s) => !!s),
      events: await db.events.where('entryId').anyOf(ids).toArray(),
      mistakes: await db.mistakes.where('entryId').anyOf(ids).toArray(),
    }
    const drafts: { key: string; before: SessionDraft; after?: SessionDraft }[] = []
    for (const row of await db.meta.where('key').startsWith('study-session:').toArray()) {
      const draft = row.value as SessionDraft
      if (!draft?.session?.items?.some((it) => selected.has(it.entryId))) continue
      const session = withoutWords(draft.session, selected)
      const after = isFinished(session) ? undefined : { ...draft, savedAt: new Date(at).toISOString(), session }
      drafts.push({ key: row.key, before: draft, after })
      if (after) await db.meta.put({ key: row.key, value: after })
      else await db.meta.delete(row.key)
    }
    await db.wordStates.bulkDelete(ids)
    await db.events.where('entryId').anyOf(ids).delete()
    await db.mistakes.where('entryId').anyOf(ids).delete()
    await db.addDeleted(marks, at)
    return { ids, marks, at, snapshot, drafts }
  })
}

/** Undo only before new learning starts; do not overwrite newer work or another reset. */
export async function undoListLearningReset(db: KelimeDB, reset: Awaited<ReturnType<typeof resetListLearning>>) {
  return db.transaction('rw', [db.vocabulary, db.wordStates, db.events, db.mistakes, db.meta], async () => {
    const marks = tombMap(await db.getDeleted(), Date.now())
    if (reset.marks.some((id) => marks.get(id)?.at !== reset.at || !isDead(marks, id))) return false
    if ((await db.wordStates.bulkGet(reset.ids)).some(Boolean) || (await db.vocabulary.bulkGet(reset.ids)).some((w) => !w)) return false
    await db.wordStates.bulkPut(reset.snapshot.wordStates)
    await db.events.bulkPut(reset.snapshot.events)
    await db.mistakes.bulkPut(reset.snapshot.mistakes)
    await db.reviveDeleted(reset.marks, Math.max(Date.now(), reset.at + 1))
    for (const draft of reset.drafts) {
      const current = (await db.meta.get(draft.key))?.value
      if (JSON.stringify(current) === JSON.stringify(draft.after)) await db.meta.put({ key: draft.key, value: draft.before })
    }
    return true
  })
}
