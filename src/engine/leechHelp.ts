import { isLeech } from './listHealth'
import { needsIntervention } from './review'
import type { UserWordState, VocabularyEntry } from './types'

/** What a word that keeps failing is offered right after a wrong answer. */
export type LeechHelp = 'mnemonic' | 'relearn'

/**
 * Help for a word that does not stick, at the moment it fails again (the list check-up finds the same words, but
 * nobody opens it mid-session):
 * - three wrong in a row: a memory hook, every time, as before;
 * - a chronic leech (half of its answers wrong, many lapses… `isLeech`) that has no note yet: a memory hook, once a session;
 * - a chronic leech that already has a note, so the hook did not help: starting it over, once a session.
 * `offered` is what this session has already offered, so a word is not nagged on every miss.
 */
export function leechHelp(state: UserWordState, entry: Pick<VocabularyEntry, 'notes'>, offered: ReadonlySet<string>): LeechHelp | null {
  if (needsIntervention(state)) return 'mnemonic'
  if (!isLeech(state) || offered.has(state.entryId)) return null
  return entry.notes?.trim() ? 'relearn' : 'mnemonic'
}
