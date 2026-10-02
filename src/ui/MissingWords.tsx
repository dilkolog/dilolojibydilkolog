import { useEffect, useMemo, useState } from 'react'
import { missingFrequent } from '../engine/reading'
import type { TargetLanguage, VocabularyEntry } from '../engine/types'
import type { KelimeDB } from '../data/db'
import { frequencyWords } from '../data/frequency'
import { wordKeys } from '../data/wordInput'
import { WordForm } from './Words'

const RANGES = [1000, 3000, 10000] as const
const PAGE = 15

/**
 * Frequent words that are neither in the list nor known yet. Marking "I know it" grows the
 * known-word set (used by reading mode too); "Add" puts the word into study.
 */
export function MissingWords({ db, language, vocabulary, onAdded }: { db: KelimeDB; language: TargetLanguage; vocabulary: VocabularyEntry[]; onAdded: () => void }) {
  const [open, setOpen] = useState(false)
  const [list, setList] = useState<string[] | null>(null)
  const [known, setKnown] = useState<Set<string>>(new Set())
  const [range, setRange] = useState<(typeof RANGES)[number]>(3000)
  const [shown, setShown] = useState(PAGE)
  const [adding, setAdding] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    Promise.all([frequencyWords(language), db.getKnownWords(language)]).then(([l, k]) => {
      setList(l)
      setKnown(k)
    })
  }, [open, language, db])

  const missing = useMemo(() => (list ? missingFrequent(list, language, vocabulary, known, range) : []), [list, language, vocabulary, known, range])
  const page = missing.slice(0, shown)
  const existing = useMemo(() => wordKeys(vocabulary), [vocabulary])

  const markKnown = async (keys: string[]) => {
    await db.addKnownWords(language, keys)
    setKnown((k) => new Set([...k, ...keys]))
  }

  return (
    <details className="card" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>Eksik sık kelimeler</summary>
      {open && list && (
        <div className="stack">
          <p className="small muted">
            Sıklık listesinde üst sıralarda olup ne listende ne de bildiğin kelimeler arasında olanlar. Sık kelimeler en çok işe yarar; bildiklerini
            işaretle, bilmediklerini ekle. Okuma modunda ve kelime testinde bildiğin kelimeler buradan otomatik düşer.
          </p>
          <div className="choice-row">
            {RANGES.map((r) => (
              <button key={r} className="chip chip-sm" aria-pressed={range === r} onClick={() => (setRange(r), setShown(PAGE))}>
                İlk {r.toLocaleString('tr-TR')}
              </button>
            ))}
            <span className="small muted">{missing.length} eksik kelime</span>
          </div>
          {missing.length === 0 ? (
            <p className="notice">İlk {range.toLocaleString('tr-TR')} kelimenin hepsini biliyor ya da çalışıyorsun. 🎉</p>
          ) : (
            <>
              <ul className="missing-list">
                {page.map((m) => (
                  <li key={m.key}>
                    <span className="missing-word" lang={language}>
                      {m.word}
                    </span>
                    <span className="small muted">#{m.rank}</span>
                    <span className="row" style={{ gap: '0.5rem', marginLeft: 'auto' }}>
                      <button className="btn btn-quiet btn-sm" onClick={() => markKnown([m.key])}>
                        Biliyorum
                      </button>
                      <button className="btn btn-sm" onClick={() => setAdding(m.word)}>
                        Ekle
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
              <div className="row">
                <button className="link small" onClick={() => markKnown(page.map((m) => m.key))}>
                  Bu {page.length} kelimenin hepsini biliyorum
                </button>
                {missing.length > shown && (
                  <button className="link small" onClick={() => setShown((n) => n + PAGE)}>
                    Daha fazla göster
                  </button>
                )}
              </div>
            </>
          )}
          {adding && (
            <section className="card stack">
              <h3 className="section-title">“{adding}” ekle</h3>
              <WordForm
                db={db}
                language={language}
                existing={existing}
                initial={{ word: adding, meaning: '', example: '', exampleTranslation: '' }}
                onSaved={() => {
                  setAdding(null)
                  onAdded()
                }}
                onCancel={() => setAdding(null)}
              />
            </section>
          )}
        </div>
      )}
    </details>
  )
}
