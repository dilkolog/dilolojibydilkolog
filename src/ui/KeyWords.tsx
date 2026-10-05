import { useEffect, useMemo, useState } from 'react'
import { CheckIcon, PlusIcon } from './icons'
import type { KelimeDB } from '../data/db'
import { loadFrequency } from '../data/frequency'
import { englishHints } from '../data/wordInfo'
import { markWord } from '../data/wordInput'
import { keyUnknownWords, type ReadingAnalysis } from '../engine/reading'
import type { TargetLanguage, VocabularyEntry } from '../engine/types'
import { WordForm } from './Words'

/**
 * Before reading: the few unknown words that unlock most of the text (pre-teaching). Mark the
 * ones you know, add the others, learn them right away, then read with them in mind.
 */
export function KeyWordsCard({
  db,
  language,
  analysis,
  existing,
  onKnown,
  onChanged,
  onStudy,
}: {
  db: KelimeDB
  language: TargetLanguage
  analysis: ReadingAnalysis
  existing: Set<string>
  onKnown: (key: string) => void
  onChanged: () => void
  onStudy?: (entries: VocabularyEntry[]) => void
}) {
  const [frequency, setFrequency] = useState<Map<string, number> | null>(null)
  const [hints, setHints] = useState<Map<string, { lemma: string; hint: string }>>(new Map())
  const [adding, setAdding] = useState<string | null>(null)
  const [added, setAdded] = useState<VocabularyEntry[]>([])
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    void loadFrequency(language).then(setFrequency)
  }, [language])
  const words = useMemo(
    () => (frequency ? keyUnknownWords(analysis, language, (w) => frequency.get(w) ?? 99_999) : []),
    [analysis, language, frequency],
  )
  const wanted = words.map((w) => w.word).filter((w) => !hints.has(w)).join('|')
  useEffect(() => {
    if (!wanted || !navigator.onLine) return
    let live = true
    void englishHints(wanted.split('|'), language).then((h) => live && setHints((old) => new Map([...old, ...h])))
    return () => {
      live = false
    }
  }, [wanted, language])

  if (hidden || (!words.length && !added.length)) return null
  return (
    <section className="card stack key-words">
      <div className="row justify-between">
        <h2 className="section-title">Okumadan önce: anahtar kelimeler</h2>
        <button className="link small" onClick={() => setHidden(true)}>
          Gizle
        </button>
      </div>
      <p className="small muted">Bu metinde en çok işine yarayacak bilinmeyen kelimeler: bildiklerini ✓ ile işaretle, gerisini + ile ekleyip okumadan önce çalış.</p>
      <ul className="key-list">
        {words.map((w) => {
          const h = hints.get(w.word)
          return (
            <li key={w.key} className={adding === w.word ? 'is-open' : undefined}>
              {/* A compact tile: the word, how often it occurs, and two small actions. */}
              <div className="key-head">
                <span className="key-word">
                  <strong lang={language}>{w.word}</strong>
                  {w.count > 1 && <span className="key-count">×{w.count}</span>}
                </span>
                {h && (
                  <span className="small muted key-hint" lang="en">
                    {h.lemma !== w.word && <em lang={language}>{h.lemma}: </em>}
                    {h.hint}
                  </span>
                )}
                <span className="key-actions">
                  <button className="icon-btn key-known" onClick={() => onKnown(w.key)} aria-label={`${w.word}: biliyorum`} title="Biliyorum">
                    <CheckIcon size={16} />
                  </button>
                  <button className="icon-btn key-add" onClick={() => setAdding(adding === w.word ? null : w.word)} aria-label={`${w.word}: listeye ekle`} aria-expanded={adding === w.word} title="Listeye ekle">
                    <PlusIcon size={16} />
                  </button>
                </span>
              </div>
              {adding === w.word && (
                <WordForm
                  db={db}
                  language={language}
                  existing={existing}
                  initial={{ word: h?.lemma ?? w.word, meaning: '', example: markWord(w.sentence, w.word), exampleTranslation: '' }}
                  onSaved={(entry) => {
                    setAdding(null)
                    setAdded((a) => [...a, entry])
                    onChanged()
                  }}
                  onCancel={() => setAdding(null)}
                />
              )}
            </li>
          )
        })}
      </ul>
      {added.length > 0 && onStudy && (
        <div className="row">
          <button className="btn" onClick={() => onStudy(added)}>
            Eklediklerimi şimdi öğren ({added.length})
          </button>
          <span className="small muted">Bitince Okuma’ya dönünce metin kaldığı yerde açılır.</span>
        </div>
      )}
    </section>
  )
}
