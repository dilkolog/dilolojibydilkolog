import { diagnose, ERROR_TEXT } from '../../engine/formDiagnosis'
import type { Tense } from '../../engine/tenses'
import { ExplainMistake } from './ExplainMistake'
import { verbEntry, type LabLanguage } from './labShared'

/** After a wrong answer: what kind of slip it was, said by name (and, with an AI key, explained on request). */
export function Diagnosis({ language, verb, tense, person, typed }: { language: LabLanguage; verb: string; tense: Tense; person: number; typed: string }) {
  if (!typed.trim()) return null
  const kind = diagnose(verbEntry(language, verb), tense, person, typed)
  return (
    <>
      <p className="small lab-diagnosis">
        <strong>{ERROR_TEXT[kind].name}.</strong> {ERROR_TEXT[kind].hint}
      </p>
      <ExplainMistake key={`${verb}|${tense}|${person}|${typed}`} language={language} verb={verb} tense={tense} person={person} typed={typed} />
    </>
  )
}
