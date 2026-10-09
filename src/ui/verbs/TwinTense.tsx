import { useEffect, useState } from 'react'
import { loadPack, packRecord } from '../../data/wordpack'
import { withSubject, type Tense } from '../../engine/tenses'
import { useTenses } from '../tenseGroups'
import { LANGUAGE_NAME } from '../labels'
import { tenseName, type LabLanguage } from './labShared'
import { otherLab, twinOf } from './tenseTwin'

/** The pack's translations of the verb into the other lab language, best first. */
function useTwinCandidates(language: LabLanguage, verb: string): string[] | null {
  const [words, setWords] = useState<string[] | null>(null)
  useEffect(() => {
    let live = true
    void loadPack(language).then((pack) => live && setWords(packRecord(pack, verb, language)?.x?.[otherLab(language)] ?? []))
    return () => {
      live = false
    }
  }, [language, verb])
  return words
}

/**
 * The same verb in the same tense in the other language (décider → decidir), for a learner of
 * both: the forms side by side in one's head, and a note where French and Spanish use the tense
 * differently or build it with another auxiliary.
 */
export function TwinTense({ language, verb, tense }: { language: LabLanguage; verb: string; tense: Tense }) {
  const other = otherLab(language)
  const ready = useTenses(other)
  const candidates = useTwinCandidates(language, verb)
  const twin = ready && candidates ? twinOf(language, verb, tense, candidates) : null
  if (!twin) return null
  return (
    <details className="conj-how lab-twin">
      <summary>
        <span className="lab-twin-kicker">{LANGUAGE_NAME[other]}da</span>{' '}
        <strong lang={other}>{twin.verb}</strong> · <span lang={other}>{tenseName(twin.tense)}</span>
      </summary>
      <div className="stack gap-2">
        <ul className="lab-twin-forms" lang={other}>
          {twin.forms.map((form, person) =>
            form ? (
              <li key={person}>{withSubject(other, twin.tense, person, form)}</li>
            ) : null,
          )}
        </ul>
        {twin.notes.map((note) => (
          <p key={note} className="small lab-bridge-trap">
            {note}
          </p>
        ))}
      </div>
    </details>
  )
}
