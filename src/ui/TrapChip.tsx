import { trapOf } from '../engine/traps'
import type { TargetLanguage } from '../engine/types'
import { trapWords } from '../data/traps'
import { AlertIcon } from './icons'

/** A word that looks like another one and means something else: "not X, but Y", as a chip in the word's info list. */
export function TrapChip({ language, lemma }: { language: TargetLanguage; lemma: string }) {
  const trap = trapOf(trapWords, language, lemma)
  if (!trap) return null
  return (
    <li className="trap-chip" title={`“${trap.looks}” gibi göründüğü için yanlış anlaşılır. Örnek: ${trap.text} (${trap.tr})`}>
      <AlertIcon size={14} className="inline-icon" /> Tuzak kelime: “{trap.trap}” değil, “{trap.meaning}”
    </li>
  )
}
