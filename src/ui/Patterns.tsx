import { useState } from 'react'
import { LinesSkeleton } from './Skeleton'
import type { KelimeDB } from '../data/db'
import { wrongVariantsFor, type Pattern } from '../engine/patterns'
import { usePatterns } from './usePatterns'
import type { VocabularyEntry } from '../engine/types'

/**
 * The word's most frequent neighbours in real sentences, as candidate collocations. Adding one
 * (with its Turkish meaning) makes it part of the word's collocation practice.
 */
export function PatternsSection({ db, entry, onChanged }: { db: KelimeDB; entry: VocabularyEntry; onChanged: () => void }) {
  const patterns = usePatterns(entry)
  const [open, setOpen] = useState<string | null>(null)
  const [translation, setTranslation] = useState('')
  if (patterns === 'loading') return <LinesSkeleton lines={2} label="Sık kalıplar aranıyor" />
  if (!patterns?.length) return null

  const have = new Set(entry.collocations.map((c) => c.phrase.toLocaleLowerCase(entry.language)))
  const add = async (p: Pattern) => {
    if (!translation.trim()) return
    await db.vocabulary.update(entry.id, { collocations: [...entry.collocations, { phrase: p.phrase, translation: translation.trim(), wrongVariants: wrongVariantsFor(p.phrase, entry.language) }] })
    setOpen(null)
    setTranslation('')
    onChanged()
  }

  return (
    <section className="section stack">
      <h2 className="section-title">Sık kalıplar</h2>
      <p className="small muted">Kelimenin gerçek cümlelerde en sık birlikte kullanıldığı kelimeler. Bir kalıbı Türkçesiyle eklersen kalıp alıştırmalarına girer (fiil ya da edat içeren kalıplar için yanlış seçenekler kendiliğinden üretilir).</p>
      <ul className="pattern-list">
        {patterns.map((p) => (
          <li key={p.phrase}>
            <div className="pattern-head">
              <strong lang={entry.language}>{p.phrase}</strong>
              <span className="small muted">{p.count} cümlede</span>
              {have.has(p.phrase.toLocaleLowerCase(entry.language)) ? (
                <span className="small muted">kalıplarında</span>
              ) : (
                open !== p.phrase && (
                  <button
                    className="link small"
                    onClick={() => {
                      setOpen(p.phrase)
                      setTranslation('')
                    }}
                  >
                    + Ekle
                  </button>
                )
              )}
            </div>
            <p className="small sentence-sm" lang={entry.language}>
              {p.example}
            </p>
            {open === p.phrase && (
              <form
                className="row"
                onSubmit={(e) => {
                  e.preventDefault()
                  void add(p)
                }}
              >
                <input className="input pattern-trans-input" value={translation} onChange={(e) => setTranslation(e.target.value)} placeholder="Türkçesi: karar vermek" aria-label="Türkçesi" autoFocus />
                <button className="btn btn-sm" type="submit" disabled={!translation.trim()}>
                  Ekle
                </button>
                <button className="link small" type="button" onClick={() => setOpen(null)}>
                  Vazgeç
                </button>
              </form>
            )}
          </li>
        ))}
      </ul>
      <p className="small muted">
        Kaynak: <a href="https://tatoeba.org" target="_blank" rel="noreferrer">Tatoeba</a> cümleleri.
      </p>
    </section>
  )
}
