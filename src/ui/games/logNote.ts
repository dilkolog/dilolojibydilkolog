import { recordGrammar, type GrammarLog } from '../../engine/grammar'

/** One at a time, across every game's log: answers in quick succession must not overwrite each other's read-modify-write. */
let writing: Promise<unknown> = Promise.resolve()

/** The writer of one practice log: `(id, correct)` adds an answer to it, after the ones before it. Resolves when it is saved (a failure is dropped). */
export function noteIn(get: () => Promise<GrammarLog>, save: (log: GrammarLog) => Promise<unknown>) {
  return (id: string, correct: boolean): Promise<unknown> => {
    writing = writing.then(async () => save(recordGrammar(await get(), id, correct, new Date()))).catch(() => undefined)
    return writing
  }
}

/** Resolves once the answers noted so far are saved (read a log after this to see them). */
export const logsSaved = (): Promise<unknown> => writing
