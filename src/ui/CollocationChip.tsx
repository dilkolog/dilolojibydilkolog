import { collocationsOf } from '../engine/collocations'
import type { TargetLanguage } from '../engine/types'
import { collocations } from '../data/collocations'

/** What a word goes with ("décider de + infinitif"), as chips in the word's info list; the title has an example. */
export function CollocationChip({ language, lemma }: { language: TargetLanguage; lemma: string }) {
  return (
    <>
      {collocationsOf(collocations, language, lemma).map((c) => (
        <li key={c.id} className="colloc-chip" lang={language} title={`${c.example} (${c.tr})`}>
          {c.pattern}
        </li>
      ))}
    </>
  )
}
