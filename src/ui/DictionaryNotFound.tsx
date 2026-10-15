import { useState } from 'react'
import { AiError, enrichWords } from '../ai'
import { wiktionaryUrl } from '../data/dictionary'
import { translate } from '../data/translate'
import { parseMeanings } from '../engine/dictionaryNotes'
import { normalize } from '../engine/answerCheck'
import type { TargetLanguage, VocabularyEntry } from '../engine/types'
import { useAi } from './aiContext'
import { BookIcon, CheckIcon, PlusIcon, WandIcon } from './icons'
import { OtherLanguageVerb } from './DictionaryCard'

export function NotFound({
  language,
  word,
  own,
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
  const { apiKey } = useAi()
  const [ai, setAi] = useState<{ lemma: string; meanings: string[] } | null>(null)
  const [customMeaning, setCustomMeaning] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
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
    setBusy(true)
    setError('')
    try {
      const out = (await translate(word, language, 'tr')).trim()
      if (!out || normalize(out) === normalize(word)) setError('DeepL bu kelime için bir karşılık bulamadı.')
      else setDeepl(out)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Çeviri şu an alınamadı.')
    } finally {
      setBusy(false)
    }
  }

  const askAi = async () => {
    if (!apiKey) return
    setBusy(true)
    setError('')
    try {
      const found = await enrichWords(apiKey, language, [{ word }])
      const info = found.get(word.toLocaleLowerCase()) ?? [...found.values()][0]
      if (info) setAi({ lemma: info.lemma, meanings: info.meanings })
      else setError('YZ bu kelimeyi tanımadı.')
    } catch (e) {
      setError(e instanceof AiError ? e.message : 'YZ şu an cevap vermedi.')
    } finally {
      setBusy(false)
    }
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
          <div className="row gap-xs">
            <button type="button" className="btn btn-sm" onClick={() => onSave(word, parseMeanings(customMeaning.trim() || deepl), customMeaning.trim() ? 'own' : 'deepl')}>
              <BookIcon size={15} /> Sözlüğe kaydet
            </button>
            <button type="button" className="btn btn-sm btn-quiet" onClick={() => onAdd(word, (customMeaning.trim() || deepl).trim())}>
              <PlusIcon size={15} /> Kelimelerime ekle
            </button>
          </div>
        </>
      ) : ai ? (
        <>
          <p>
            <strong lang={language}>{ai.lemma}</strong>: {ai.meanings.join(', ')} <span className="small muted">(YZ)</span>
          </p>
          <div>
            <button className="btn btn-sm" onClick={() => onAdd(ai.lemma, ai.meanings.slice(0, 2).join(', '))}>
              <PlusIcon size={15} /> Kelimelerime ekle
            </button>
          </div>
        </>
      ) : (
        <>
          <p>
            “<span lang={language}>{word}</span>” sözlük paketinde veya kelimelerinde henüz yok{hasSimilar ? ' (benzerleri aşağıda)' : ''}. Anlamını biliyorsan yazıp kaydedebilirsin:
          </p>
          <form
            className="row gap-xs"
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
            <button type="submit" className="btn btn-sm" disabled={!customMeaning.trim()}>
              <PlusIcon size={15} /> Kelimelerime ekle
            </button>
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
            {deeplOn && (
              <button type="button" className="btn btn-sm btn-quiet" onClick={askDeepl} disabled={busy}>
                <WandIcon size={15} /> {busy ? 'Soruluyor…' : 'DeepL ile çevir'}
              </button>
            )}
            {apiKey && (
              <button type="button" className="btn btn-sm btn-quiet" onClick={askAi} disabled={busy}>
                <WandIcon size={15} /> {busy ? 'Soruluyor…' : 'YZ ile anlamını bul'}
              </button>
            )}
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
