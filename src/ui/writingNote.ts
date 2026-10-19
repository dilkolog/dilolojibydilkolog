import { db } from '../data/instance'
import type { GrammarIssue } from '../engine/grammarIssues'
import type { TargetLanguage } from '../engine/types'
import { recordWriting, type WritingLog } from '../engine/writingErrors'

/** One at a time: two checks in quick succession must not overwrite each other's read-modify-write. */
let writing: Promise<unknown> = Promise.resolve()

/** Adds what a check found to the writing error notebook, after the ones before it; resolves to the log as saved (null if it could not be saved). */
export function noteWriting(language: TargetLanguage, text: string, issues: readonly GrammarIssue[], now = new Date()): Promise<WritingLog | null> {
  const run = writing
    .then(async () => {
      const next = recordWriting(await db.getWritingLog(), language, text, issues, now.toISOString().slice(0, 10))
      await db.saveWritingLog(next)
      return next
    })
    .catch(() => null)
  writing = run
  return run
}
