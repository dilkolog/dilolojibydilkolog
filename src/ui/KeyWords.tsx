import { useEffect, useMemo, useState } from 'react'
import { CheckIcon, PlusIcon } from './icons'
import type { KelimeDB } from '../data/db'
import { loadFrequency } from '../data/frequency'
import { englishHints } from '../data/wordInfo'
import { baseForm, loadPack, packRecord } from '../data/wordpack'
import { genderOfCode, POS_CODE, type Pack } from '../data/wordpackBuild'
import { markWord } from '../data/wordInput'
import { keyUnknownWords, type ReadingAnalysis } from '../engine/reading'
import type { TargetLanguage, VocabularyEntry } from '../engine/types'
import { WordForm } from './Words'
import { PreReadingLesson, type LessonItem } from './PreReadingLesson'
import { addKeyList, type KeyItem } from './keyWordsList'
import { showToast } from './toastFeed'

/**
 * Before reading: the few unknown words that unlock most of the text (pre-teaching). Mark the
 * ones you know, add the others, learn them right away, then read with them in mind. Meanings
 * come in Turkish from the word pack (offline); Wiktionary's English gloss is the fallback, and also
 * turns a form in the text into its dictionary form (allons → aller) for the pack to find.
 */
export function KeyWordsCard({
  db,
  language,
  analysis,
  existing,
  onKnown,
  onChanged,
  onStudy,
  title,
}: {
  db: KelimeDB
  language: TargetLanguage
  analysis: ReadingAnalysis
  existing: Set<string>
  onKnown: (key: string) => void
  onChanged: () => void
  onStudy?: (entries: VocabularyEntry[]) => void
  /** The text's title: the key words can become a list of that name. */
  title?: string
}) {
  const [frequency, setFrequency] = useState<Map<string, number> | null>(null)
  const [hints, setHints] = useState<Map<string, { lemma: string; hint: string }>>(new Map())
  const [adding, setAdding] = useState<string | null>(null)
  const [added, setAdded] = useState<VocabularyEntry[]>([])
  const [hidden, setHidden] = useState(false)
  const [lesson, setLesson] = useState(false)
  const [pack, setPack] = useState<Pack | undefined>()
  const [listing, setListing] = useState(false)

  useEffect(() => {
    void loadFrequency(language).then(setFrequency)
    void loadPack(language).then(setPack)
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

  /** A word of the text as the dictionary has it (aller for "allons"), and its Turkish meaning from the pack. */
  const lookUp = (word: string) => {
    const lemma = hints.get(word)?.lemma ?? baseForm(pack, word, language) ?? word
    const rec = packRecord(pack, lemma, language) ?? packRecord(pack, word, language)
    return { lemma, turkish: rec?.t ?? [], pos: rec?.p ? POS_CODE[rec.p] : undefined, gender: genderOfCode(rec?.g) }
  }
  // The pre-reading lesson: the key words that have a meaning to learn, up to six.
  const lessonWords = words
    .map((w) => ({ w, ...lookUp(w.word) }))
    .filter((x) => x.turkish.length)
    .slice(0, 6)
  const lessonItems: LessonItem[] = lessonWords.map((x) => ({ word: x.lemma, meaning: x.turkish.slice(0, 2).join(', ') }))

  // The key words not added yet that have a meaning: the ones a list can be made of.
  const listable: KeyItem[] = words
    .map((w) => ({ word: w.word, sentence: w.sentence, ...lookUp(w.word) }))
    .filter((x) => x.turkish.length && !added.some((e) => e.lemma === x.lemma))
  const makeList = async () => {
    if (!title) return
    setListing(true)
    try {
      const { list, added: fresh } = await addKeyList(db, language, title, listable)
      setAdded((a) => [...a, ...fresh])
      onChanged()
      showToast(
        fresh.length ? `${fresh.length} kelime “${list.name}” listesine eklendi. Okurken eklediklerin de bu listeye gider.` : `Bu kelimeler zaten kelimelerinde. Okurken eklediklerin “${list.name}” listesine gider.`,
        undefined,
        5000,
        'success',
      )
    } catch {
      showToast('Liste kurulamadı.', undefined, 4000, 'info')
    } finally {
      setListing(false)
    }
  }

  if (hidden || (!words.length && !added.length)) return null
  if (lesson)
    return (
      <section className="card stack key-words">
        <div className="row justify-between">
          <h2 className="section-title">Okumadan önce: kısa ders</h2>
          <button className="link small" onClick={() => setLesson(false)}>
            Kapat
          </button>
        </div>
        <PreReadingLesson
          language={language}
          items={lessonItems}
          onAdd={(lemma) => {
            const x = lessonWords.find((l) => l.lemma === lemma)
            setLesson(false)
            if (x) setAdding(x.w.word)
          }}
          onClose={() => setLesson(false)}
        />
      </section>
    )
  return (
    <section className="card stack key-words">
      <div className="row justify-between">
        <h2 className="section-title">Okumadan önce: anahtar kelimeler</h2>
        <button className="link small" onClick={() => setHidden(true)}>
          Gizle
        </button>
      </div>
      <p className="small muted">Bu metinde en çok işine yarayacak bilinmeyen kelimeler: bildiklerini ✓ ile işaretle, gerisini + ile ekleyip okumadan önce çalış.</p>
      {(lessonItems.length >= 3 || (title && listable.length >= 3)) && (
        <div className="row">
          {lessonItems.length >= 3 && (
            <button type="button" className="btn btn-sm" onClick={() => setLesson(true)}>
              2 dakikalık ön ders (en önemli {lessonItems.length} kelime)
            </button>
          )}
          {title && listable.length >= 3 && (
            <button type="button" className="btn btn-sm btn-quiet" onClick={() => void makeList()} disabled={listing} title="Anlamı bulunan anahtar kelimeler, bu metnin adıyla bir listeye">
              {listing ? 'Liste kuruluyor…' : `Bu metnin listesini kur (${listable.length} kelime)`}
            </button>
          )}
        </div>
      )}
      <ul className="key-list">
        {words.map((w) => {
          const h = hints.get(w.word)
          // Offline, the pack's own form table finds the dictionary form (allons → aller) that Wiktionary gives online.
          const { lemma, turkish } = lookUp(w.word)
          return (
            <li key={w.key} className={adding === w.word ? 'is-open' : undefined}>
              {/* A compact tile: the word, how often it occurs, and two small actions. */}
              <div className="key-head">
                <span className="key-word">
                  <strong lang={language}>{w.word}</strong>
                  {w.count > 1 && <span className="key-count">×{w.count}</span>}
                </span>
                {(turkish.length > 0 || h) && (
                  <span className="small muted key-hint" lang={turkish.length ? 'tr' : 'en'}>
                    {lemma !== w.word && <em lang={language}>{lemma}: </em>}
                    {turkish.length ? turkish.slice(0, 3).join(', ') : h!.hint}
                  </span>
                )}
                <span className="key-actions">
                  <button className="icon-btn key-known" onClick={() => onKnown(w.key)} aria-label={`${w.word}: biliyorum`} title="Biliyorum">
                    <CheckIcon size={16} />
                  </button>
                  <button className="icon-btn key-add" onClick={() => setAdding(adding === w.word ? null : w.word)} aria-label={`${w.word}: kelimelerime ekle`} aria-expanded={adding === w.word} title="Kelimelerime ekle">
                    <PlusIcon size={16} />
                  </button>
                </span>
              </div>
              {adding === w.word && (
                <WordForm
                  db={db}
                  language={language}
                  existing={existing}
                  initial={{ word: lemma, meaning: turkish.slice(0, 2).join(', '), example: markWord(w.sentence, w.word), exampleTranslation: '' }}
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
