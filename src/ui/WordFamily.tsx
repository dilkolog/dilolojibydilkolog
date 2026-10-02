import { useEffect, useState } from 'react'
import type { KelimeDB } from '../data/db'
import { fillEntries } from '../data/wordInfo'
import { createEntry, WordInputError } from '../data/wordInput'
import type { VocabularyEntry } from '../engine/types'

/**
 * Relatives of the word (décider → décision, indécis, décideur), most frequent first. Learning
 * a family together is cheap: one stem, a few suffixes. Added members are linked both ways, so
 * the "right suffix" exercise can use them.
 */
export function WordFamilySection({ db, entry, vocabulary, onChanged }: { db: KelimeDB; entry: VocabularyEntry; vocabulary: VocabularyEntry[]; onChanged: () => void }) {
  const [open, setOpen] = useState<string | null>(null)
  const [meaning, setMeaning] = useState('')
  const [error, setError] = useState('')

  // Not looked up yet (just added): do it now rather than waiting for the background run.
  useEffect(() => {
    if (entry.wiktAt || entry.source === 'sample' || !navigator.onLine) return
    let live = true
    void fillEntries(db, [entry], entry.language).then(() => live && onChanged())
    return () => {
      live = false
    }
  }, [entry.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const candidates = entry.familyCandidates ?? []
  if (!candidates.length) return null
  const inList = new Map(vocabulary.filter((v) => v.language === entry.language).map((v) => [v.lemma.toLocaleLowerCase(), v]))

  const add = async (word: string) => {
    setError('')
    try {
      const fresh = (await db.vocabulary.get(entry.id)) ?? entry
      const next = createEntry({ word, meaning }, entry.language, new Date())
      const member = { ...next, wordFamily: [...next.wordFamily, { lemma: fresh.lemma, partOfSpeech: fresh.partOfSpeech, gloss: fresh.senses[0].gloss, entryId: fresh.id }] }
      await db.vocabulary.put(member)
      await db.vocabulary.update(fresh.id, {
        wordFamily: [...fresh.wordFamily, { lemma: next.lemma, partOfSpeech: next.partOfSpeech, gloss: next.senses[0].gloss, entryId: next.id }],
      })
      setOpen(null)
      setMeaning('')
      onChanged()
    } catch (e) {
      setError(e instanceof WordInputError ? e.message : 'Eklenemedi.')
    }
  }

  return (
    <section className="section stack">
      <h2 className="section-title">Kelime ailesi</h2>
      <p className="small muted">Aynı kökten, sık kullanılan kelimeler. Eklediklerin bu kelimeye bağlanır; alıştırmalarda doğru eki seçmen istenir.</p>
      <ul className="family-list">
        {candidates.map((w) => {
          const listed = inList.get(w.toLocaleLowerCase())
          return (
            <li key={w}>
              <span className="family-word" lang={entry.language}>
                {w}
              </span>
              {listed ? (
                <span className="small muted">listende: {listed.senses[0].gloss}</span>
              ) : open === w ? (
                <form
                  className="row"
                  onSubmit={(e) => {
                    e.preventDefault()
                    void add(w)
                  }}
                >
                  <input className="input" style={{ width: '12rem' }} value={meaning} onChange={(e) => setMeaning(e.target.value)} placeholder="Türkçe anlamı" aria-label={`${w} Türkçe anlamı`} autoFocus />
                  <button className="btn btn-sm" type="submit" disabled={!meaning.trim()}>
                    Ekle
                  </button>
                  <a className="link small" href={`https://translate.google.com/?sl=${entry.language}&tl=tr&text=${encodeURIComponent(w)}`} target="_blank" rel="noreferrer">
                    Çeviri
                  </a>
                </form>
              ) : (
                <button
                  className="link small"
                  onClick={() => {
                    setOpen(w)
                    setMeaning('')
                  }}
                >
                  + Ekle
                </button>
              )}
            </li>
          )
        })}
      </ul>
      {error && <p className="error small">{error}</p>}
      <p className="small muted">
        Kaynak: <a href="https://wiktionary.org" target="_blank" rel="noreferrer">Wiktionary</a> (CC BY-SA).
      </p>
    </section>
  )
}
