import { useState } from 'react'
import { wiktionaryUrl } from '../data/dictionary'
import { parseMeanings } from '../engine/dictionaryNotes'
import type { TargetLanguage, VocabularyEntry } from '../engine/types'
import { BookIcon, CheckIcon, PlusIcon, TagIcon } from './icons'
import { OtherLanguageVerb } from './DictionaryCard'
import { MeaningLookupButtons } from './MeaningLookupButtons'
import { useMeaningLookup } from './useMeaningLookup'

export function NotFound({
  language,
  word,
  own,
  targetListName,
  onOpenWord,
  onAdd,
  onSave,
  deeplOn,
  hasOthers,
  hasSimilar,
}: {
  language: TargetLanguage
  word: string
  own?: VocabularyEntry
  /** Name of the list the word will go to when added. */
  targetListName?: string
  onOpenWord: (id: string) => void
  onAdd: (word: string, meaning: string) => void
  /** Keeps the word in the dictionary for good (not in the study list). */
  onSave: (word: string, meanings: string[], from: 'deepl' | 'own') => void
  /** Whether the server can translate (asked once by the screen, not on every letter typed). */
  deeplOn: boolean
  /** Matches of the Turkish typed, or saved words: they are listed below and make the card unnecessary. */
  hasOthers: boolean
  /** Pack words that start like the query: listed below, but the word itself is still missing (it can be saved). */
  hasSimilar?: boolean
}) {
  const { apiKey, busy, error, askDeepl: lookUpDeepl, askAi: lookUpAi } = useMeaningLookup(language, word)
  const [ai, setAi] = useState<{ lemma: string; meanings: string[] } | null>(null)
  const [customMeaning, setCustomMeaning] = useState('')
  // DeepL (through the app's server): offered when it is there; its answer is a guess for one word, so it is shown as such.
  const [deepl, setDeepl] = useState<string | null>(null)

  if (own) {
    return (
      <section className="section card stack">
        <p>
          <strong lang={language}>{own.lemma}</strong> sözlük paketinde yok ama listende: {own.senses[0].gloss}
        </p>
        <div>
          <button className="btn btn-sm btn-quiet" onClick={() => onOpenWord(own.id)}>
            <CheckIcon size={15} /> Kelime sayfasını aç
          </button>
        </div>
      </section>
    )
  }

  // A Turkish word with matches below needs no "not found" card above them.
  if (hasOthers && !ai && deepl === null) return null

  const askDeepl = async () => {
    const out = await lookUpDeepl()
    if (out) setDeepl(out)
  }

  const askAi = async () => {
    const found = await lookUpAi()
    if (found) setAi(found)
  }

  return (
    <section className="section card stack">
      <OtherLanguageVerb language={language} word={word} />
      {deepl !== null && !ai ? (
        <>
          <p>
            <strong lang={language}>{word}</strong>: {deepl} <span className="small muted">(DeepL)</span>
          </p>
          <p className="small muted">Tek kelimede çeviri yanılabilir. “Sözlüğe kaydet” kelimeyi sözlükte hep bulunsun diye saklar (çalışma listene girmez); “Kelimelerime ekle” onu çalışma kartı yapar. Yanlışsa anlamı düzeltip kaydet.</p>
          <input type="text" className="input" placeholder={deepl} value={customMeaning} onChange={(e) => setCustomMeaning(e.target.value)} aria-label="Türkçe anlamı" />
          <div className="row gap-xs items-center">
            <button type="button" className="btn btn-sm" onClick={() => onSave(word, parseMeanings(customMeaning.trim() || deepl), customMeaning.trim() ? 'own' : 'deepl')}>
              <BookIcon size={15} /> Sözlüğe kaydet
            </button>
            <div className="word-hero-add-wrap">
              <button type="button" className="btn btn-sm btn-quiet" onClick={() => onAdd(word, (customMeaning.trim() || deepl).trim())}>
                <PlusIcon size={15} /> Kelimelerime ekle
              </button>
              {targetListName && (
                <span className="word-hero-target-tag" title={`Bu kelime “${targetListName}” listesine eklenecek`}>
                  <TagIcon size={12} className="inline-icon" />
                  {targetListName}
                </span>
              )}
            </div>
          </div>
        </>
      ) : ai ? (
        <>
          <p>
            <strong lang={language}>{ai.lemma}</strong>: {ai.meanings.join(', ')} <span className="small muted">(YZ)</span>
          </p>
          <div className="word-hero-add-wrap">
            <button className="btn btn-sm" onClick={() => onAdd(ai.lemma, ai.meanings.slice(0, 2).join(', '))}>
              <PlusIcon size={15} /> Kelimelerime ekle
            </button>
            {targetListName && (
              <span className="word-hero-target-tag" title={`Bu kelime “${targetListName}” listesine eklenecek`}>
                <TagIcon size={12} className="inline-icon" />
                {targetListName}
              </span>
            )}
          </div>
        </>
      ) : (
        <>
          <p>
            “<span lang={language}>{word}</span>” sözlük paketinde veya kelimelerinde henüz yok{hasSimilar ? ' (benzerleri aşağıda)' : ''}. Anlamını biliyorsan yazıp kaydedebilirsin:
          </p>
          <form
            className="row gap-xs items-center"
            onSubmit={(e) => {
              e.preventDefault()
              const m = customMeaning.trim()
              if (m) {
                onAdd(word, m)
                setCustomMeaning('')
              }
            }}
          >
            <input
              type="text"
              className="input"
              placeholder="Türkçe anlamını yaz…"
              value={customMeaning}
              onChange={(e) => setCustomMeaning(e.target.value)}
              aria-label="Türkçe anlamı"
            />
            <div className="word-hero-add-wrap">
              <button type="submit" className="btn btn-sm" disabled={!customMeaning.trim()}>
                <PlusIcon size={15} /> Kelimelerime ekle
              </button>
              {targetListName && (
                <span className="word-hero-target-tag" title={`Bu kelime “${targetListName}” listesine eklenecek`}>
                  <TagIcon size={12} className="inline-icon" />
                  {targetListName}
                </span>
              )}
            </div>
            <button
              type="button"
              className="btn btn-sm btn-quiet"
              disabled={!customMeaning.trim()}
              onClick={() => {
                onSave(word, parseMeanings(customMeaning), 'own')
                setCustomMeaning('')
              }}
            >
              <BookIcon size={15} /> Sözlüğe kaydet
            </button>
          </form>
          <div className="row gap-xs">
            <MeaningLookupButtons deeplOn={deeplOn} aiOn={!!apiKey} busy={busy} onDeepl={() => void askDeepl()} onAi={() => void askAi()} />
            <a className="btn btn-sm btn-quiet" href={wiktionaryUrl(word, language)} target="_blank" rel="noreferrer">
              <BookIcon size={15} /> Vikisözlük'te ara
            </a>
          </div>
        </>
      )}
      {error && <p className="error small">{error}</p>}
    </section>
  )
}

/** A word the learner saved to the dictionary (the pack lacks it): its meanings, and what can be done with it. */
