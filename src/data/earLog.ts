import { recordDictation } from '../engine/earMisses'
import type { TargetLanguage } from '../engine/types'
import type { DiffPart } from '../engine/wordDiff'
import { db } from './instance'

/** One write at a time: answers in quick succession must not overwrite each other. */
let writing: Promise<unknown> = Promise.resolve()

/** Notes a dictated sentence in the ear log (the words missed, and those written right again). */
export function noteDictation(language: TargetLanguage, sentence: string, parts: readonly DiffPart[]) {
  writing = writing.then(async () => db.saveEarLog(recordDictation(await db.getEarLog(), language, sentence, parts, new Date()))).catch(() => undefined)
  return writing
}
