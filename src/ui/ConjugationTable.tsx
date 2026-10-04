import { useEffect, useState } from 'react'
import { PRONOUNS } from '../engine/conjugation'
import { TENSE_GUIDE } from '../engine/tenseGuide'
import { conjugateTense, irregularForms, tenseSentence, tensesLoaded, tensesOf, type Tense } from '../engine/tenses'
import type { VocabularyEntry } from '../engine/types'
import { loadTenses } from '../data/tenseData'

type Verb = Pick<VocabularyEntry, 'language' | 'lemma' | 'partOfSpeech'>

/** Re-renders once the language's tense table has arrived (it is fetched on first need). */
export function useTenses(language: VocabularyEntry['language']): boolean {
  const [ready, setReady] = useState(() => language === 'en' || tensesLoaded(language))
  useEffect(() => {
    let live = true
    if (language !== 'en') void loadTenses(language).then(() => live && setReady(tensesLoaded(language)))
    return () => {
      live = false
    }
  }, [language])
  return ready
}

/**
 * A verb's forms, one tense at a time: what the tense is for, the six forms with the irregular
 * ones marked, the time words that call for it, and how it is built.
 */
export function ConjugationTable({ entry, initial }: { entry: Verb; initial?: Tense }) {
  useTenses(entry.language)
  const tenses = tensesOf(entry)
  const [picked, setPicked] = useState<Tense | undefined>(initial)
  const tense = picked && tenses.includes(picked) ? picked : tenses[0]
  if (!tense || entry.language === 'en') return null
  const lang = entry.language
  const forms = conjugateTense(entry, tense)!
  const odd = irregularForms(entry, tense)
  const guide = TENSE_GUIDE[tense]
  const sentence = tenseSentence(entry, tense)
  return (
    <div className="stack conj">
      {tenses.length > 1 && (
        <div className="segmented tense-tabs" role="tablist" aria-label="Zaman">
          {tenses.map((t) => (
            <button key={t} role="tab" className="segmented-btn" aria-selected={t === tense} onClick={() => setPicked(t)} lang={lang}>
              {TENSE_GUIDE[t].name}
            </button>
          ))}
        </div>
      )}
      <p className="conj-lead">
        <strong>{guide.tr}.</strong> {guide.short}
      </p>
      <table className="conj-table" lang={lang}>
        <tbody>
          {forms.map((f, i) => (
            <tr key={i}>
              <th scope="row">{PRONOUNS[lang][i].slice(0, 2).join(' / ')}</th>
              <td>
                {odd[i] ? (
                  <mark className="conj-odd" title="Düzensiz">
                    {f}
                  </mark>
                ) : (
                  f
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {odd.some(Boolean) && (
        <p className="small muted">
          <mark className="conj-odd">Altı çizili</mark> biçimler kuralın dışında; bunlara ayrıca dikkat et.
        </p>
      )}
      {sentence && (
        <p className="conj-sentence">
          <span lang={lang}>
            {sentence.text.split('___')[0]}
            <strong>{sentence.form}</strong>
            {sentence.text.split('___')[1]}
          </span>
          <span className="muted small">{sentence.translation}</span>
        </p>
      )}
      <div className="conj-markers" lang={lang}>
        <span className="small muted">Sık birlikte:</span>
        {guide.markers.map((m) => (
          <span key={m} className="pill">
            {m}
          </span>
        ))}
      </div>
      <details className="conj-how">
        <summary>Nasıl kurulur?</summary>
        <div className="stack">
          <p className="small">{guide.formation}</p>
          <ul className="conj-examples">
            {guide.examples.map(([s, tr]) => (
              <li key={s}>
                <span lang={lang}>{s}</span> <span className="muted">{tr}</span>
              </li>
            ))}
          </ul>
        </div>
      </details>
    </div>
  )
}
