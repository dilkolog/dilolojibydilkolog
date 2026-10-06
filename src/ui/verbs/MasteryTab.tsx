import { MASTERY_MAX, labKey, masteryLevel, verbMastery, type LabData, type MasteryLevel } from '../../engine/labProgress'
import type { Tense } from '../../engine/tenses'
import { tenseName, type LabLanguage } from './labShared'

const LEVEL_TEXT: Record<MasteryLevel, string> = { new: 'Yeni', learning: 'Öğreniliyor', good: 'İyi', master: 'Usta' }

/** Mastery: how well each tense of the verb is known, from the lab's own practice. */
export function MasteryTab({ language, verb, available, lab, onPractice }: { language: LabLanguage; verb: string; available: readonly Tense[]; lab: LabData; onPractice: (t: Tense) => void }) {
  const score = verbMastery(lab, verb, available)
  return (
    <div className="stack lab-mastery">
      <header className="lab-mastery-head">
        <h2 lang={language}>{verb[0].toLocaleUpperCase(language) + verb.slice(1)}</h2>
        <p className="muted">Ustalık skoru: %{score}</p>
      </header>
      <ul className="lab-mastery-list">
        {available.map((t) => {
          const rec = lab.records[labKey(verb, t)]
          const level = masteryLevel(rec)
          const points = rec?.points ?? 0
          return (
            <li key={t}>
              <button type="button" className="lab-mastery-row" onClick={() => onPractice(t)} aria-label={`${tenseName(t)}: ${LEVEL_TEXT[level]}, alıştır`}>
                <span className="lab-mastery-name" lang={language}>
                  {tenseName(t)}
                </span>
                <span className={`lab-level is-${level}`}>
                  {LEVEL_TEXT[level]} ({points}/{MASTERY_MAX})
                </span>
                <span className="lab-bar lab-mastery-bar" aria-hidden>
                  <span style={{ width: `${(points / MASTERY_MAX) * 100}%` }} />
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      <p className="small muted">Her doğru cevap 10 puan ekler, her yanlış 10 puan alır; {MASTERY_MAX} puan bir zamanda ustalık demek. Alıştırdıkça tekrarlar “Bugünün tekrarları”na düşer.</p>
    </div>
  )
}
