import '../lazy.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import { buildIndex, fold, search, wordOfTheDay } from '../data/dictionary'
import { loadTenses } from '../data/tenseData'
import { loadPack } from '../data/wordpack'
import { translationReady } from '../data/translate'
import type { Pack } from '../data/wordpackBuild'
import { db } from '../data/instance'
import { addEntry, emptyNotes, findAdded, noteLookup, removeEntry, setFix, type DictionaryNotes } from '../engine/dictionaryNotes'
import { normalize, splitArticle } from '../engine/answerCheck'
import { verbFormsOf } from '../engine/verbLookup'
import type { Example, Gender, PartOfSpeech, TargetLanguage, VocabularyEntry } from '../engine/types'
import { SearchIcon } from './icons'
import { LANGUAGE_NAME } from './labels'
import { createEntry } from '../data/wordInput'
import { formIn } from '../engine/inflection'
import { placeNew } from './listMemory'
import { showToast } from './toastFeed'
import { PageHeader } from './PageHeader'
import { daySeed } from '../appNav'
import { WordCard } from './DictionaryCard'
import { NotFound } from './DictionaryNotFound'
import { SavedCard, DayWord, SavedList } from './DictionarySaved'

/**
 * Any word, in the list or not: what it means in Turkish, how it sounds, where it comes from and
 * what it is in the other two languages, from the word pack (offline once downloaded). Typing
 * Turkish finds the foreign words for it. A word not in the list is one tap from the add form,
 * its meaning already filled in.
 */
interface Props {
  language: TargetLanguage
  vocabulary: VocabularyEntry[]
  initialQuery?: string
  onOpenWord: (id: string) => void
  onAdd: (word: string, meaning: string) => void
  /** After a word was added here in one tap (the screen's word list reloads). */
  onAdded?: () => void
  onOpenLab?: (verb: string) => void
  onSwitchLanguage?: (lang: TargetLanguage, query?: string) => void
}

const RECENT_KEY = (l: TargetLanguage) => `kelime-koc:dictionary:${l}`
const RECENT_MAX = 8

function loadRecent(language: TargetLanguage): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY(language)) ?? '[]')
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  } catch {
    return []
  }
}

function saveRecent(language: TargetLanguage, word: string): string[] {
  const next = [word, ...loadRecent(language).filter((w) => w !== word)].slice(0, RECENT_MAX)
  try {
    localStorage.setItem(RECENT_KEY(language), JSON.stringify(next))
  } catch {
    // Private window or blocked storage: the list just isn't kept.
  }
  return next
}

/** The word the learner already has, matched without its article and accents. */
const ownEntry = (vocabulary: readonly VocabularyEntry[], word: string, language: TargetLanguage) => {
  const key = fold(splitArticle(normalize(word).toLocaleLowerCase(language), language).rest)
  return vocabulary.find((v) => fold(splitArticle(normalize(v.lemma).toLocaleLowerCase(language), language).rest) === key)
}

export function DictionaryScreen({ language, vocabulary, initialQuery = '', onOpenWord, onAdd: openForm, onAdded, onOpenLab, onSwitchLanguage }: Props) {
  const [query, setQuery] = useState(initialQuery)
  const [pack, setPack] = useState<Pack | null | undefined>(undefined)
  const [recent, setRecent] = useState(() => loadRecent(language))
  const [notes, setNotes] = useState<DictionaryNotes>(emptyNotes)
  const notesRef = useRef(notes)
  const [deeplOn, setDeeplOn] = useState(false)
  useEffect(() => {
    let live = true
    void translationReady().then((yes) => live && setDeeplOn(yes))
    return () => {
      live = false
    }
  }, [])

  useEffect(() => {
    let live = true
    setPack(undefined)
    setRecent(loadRecent(language))
    void loadPack(language).then((p) => live && setPack(p ?? null))
    void db.getDictionaryNotes(language).then((n) => {
      if (!live) return
      notesRef.current = n
      setNotes(n)
    })
    return () => {
      live = false
    }
  }, [language])

  const index = useMemo(() => {
    if (!pack) return pack
    return buildIndex(pack, language, vocabulary)
  }, [pack, language, vocabulary])

  /**
   * Changes the learner's notes: shown at once, saved as a change to what is stored (a sync may
   * have merged words in while the screen was open), then the stored result is shown.
   */
  const updateNotes = (change: (n: DictionaryNotes) => DictionaryNotes) => {
    notesRef.current = change(notesRef.current)
    setNotes(notesRef.current)
    void db.updateDictionaryNotes(language, change).then((stored) => {
      notesRef.current = stored
      setNotes(stored)
    })
  }

  /**
   * Adds a word in one tap, with its meaning and the sentences shown for it, where new words go
   * (the list last used or opened); no detour through the word form. A word that would not make a
   * card (no meaning) opens the form instead.
   */
  const onAdd = async (written: string, meaning: string, extra: { pos?: PartOfSpeech; gender?: Gender; examples?: Example[] } = {}) => {
    try {
      const entry = createEntry({ word: written, meaning, partOfSpeech: extra.pos, gender: extra.gender }, language, new Date())
      const there = await db.vocabulary.get(entry.id)
      if (there) return onOpenWord(there.id)
      const examples = (extra.examples ?? []).flatMap((x) => {
        const form = x.form || formIn(x.text, entry.lemma, language) || ''
        return x.text ? [{ ...x, form }] : []
      })
      // The sentences that show the word first: those are the ones the questions can use.
      entry.senses[0].examples = [...examples.filter((x) => x.form), ...examples.filter((x) => !x.form)].slice(0, 3)
      const placed = await placeNew(db, language, [entry])
      await db.vocabulary.put(placed.entries[0])
      setRecent(saveRecent(language, entry.lemma))
      onAdded?.()
      showToast(placed.listName ? `“${written}” “${placed.listName}” listesine eklendi.` : `“${written}” kelimelerine eklendi.`, { label: 'Aç', run: () => onOpenWord(entry.id) }, 5000, 'success')
    } catch {
      openForm(written, meaning)
    }
  }

  // The verb tables find the infinitive of a conjugated form the pack doesn't list (renuncio → renunciar).
  const [tables, setTables] = useState(false)
  useEffect(() => {
    let live = true
    setTables(false)
    if (language !== 'en') void loadTenses(language).then(() => live && setTables(true))
    return () => {
      live = false
    }
  }, [language])
  const result = useMemo(() => (index ? search(index, query, tables ? (w) => verbFormsOf(language, w) : undefined) : { similar: [], fromTurkish: [] }), [index, query, tables, language])
  // The day's word stays the same all day; once added it gives way to the next one.
  const today = useMemo(() => (index ? wordOfTheDay(index, daySeed(new Date())) : undefined), [index])
  const typed = query.trim()
  const exactWord = result.exact?.word
  const own = typed ? ownEntry(vocabulary, exactWord ?? typed, language) : undefined
  const saved = useMemo(() => findAdded(notes, typed, language), [notes, typed, language])
  const savedExact = result.exact ? undefined : saved.find((e) => e.exact)
  const savedOthers = saved.filter((e) => e !== savedExact)
  const savedCard = savedExact ? (
    <SavedCard
      key={savedExact.word}
      language={language}
      word={savedExact.word}
      meanings={savedExact.t}
      from={notes.added?.[savedExact.word]?.from}
      own={own}
      onOpenWord={onOpenWord}
      onAdd={onAdd}
      onRemove={() => updateNotes((n) => removeEntry(n, savedExact.word))}
    />
  ) : null
  const save = (word: string, meanings: string[], from: 'deepl' | 'own') => updateNotes((n) => addEntry(n, word, meanings, new Date().toISOString(), from, language))

  // A word whose card stays up a moment was really looked up (not just passed while typing): once a visit.
  const counted = useRef(new Set<string>())
  useEffect(() => {
    if (!exactWord || counted.current.has(exactWord)) return
    const t = setTimeout(() => {
      counted.current.add(exactWord)
      updateNotes((n) => noteLookup(n, exactWord, new Date().toISOString()))
    }, 1500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exactWord])

  /** Look a word up, as if typed, and remember it. */
  const pick = (word: string) => {
    setQuery(word)
    setRecent(saveRecent(language, word))
  }

  return (
    <div>
      <section className="section stack">
        <PageHeader art="dictionary" title="Sözlük" sub={`${LANGUAGE_NAME[language]} bir kelime ya da Türkçe karşılığını yaz; listende olmasa da bulur.`} />
        <form
          className="search"
          role="search"
          onSubmit={(e) => {
            e.preventDefault()
            const first = exactWord ?? result.similar[0]?.word ?? result.fromTurkish[0]?.word
            if (first) pick(first)
          }}
        >
          <SearchIcon size={18} />
          <input
            type="search"
            enterKeyHint="search"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            autoFocus
            className="input"
            lang={language}
            placeholder={language === 'fr' ? 'maison, décider… ya da “ev”' : language === 'es' ? 'casa, decidir… ya da “ev”' : 'house, decide… ya da “ev”'}
            aria-label="Sözlükte ara"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </form>
        <div aria-live="polite">
          {index === undefined && <p className="small muted">Sözlük açılıyor…</p>}
          {index === null && <p className="small muted">Sözlük henüz bu cihaza inmedi; internete bağlanınca bir kez iner, sonra internetsiz de çalışır.</p>}
        </div>
      </section>

      {!typed && today && <DayWord language={language} hit={today} onOpen={() => pick(today.word)} onAdd={onAdd} />}

      {!typed && Object.keys(notes.added ?? {}).length > 0 && (
        <SavedList
          language={language}
          list={Object.entries(notes.added ?? {}).map(([word, e]) => ({ word, t: e.t, exact: false }))}
          onPick={pick}
          onRemove={(w) => updateNotes((n) => removeEntry(n, w))}
        />
      )}

      {!typed && recent.length > 0 && (
        <section className="section stack">
          <h2 className="section-title">Son baktıkların</h2>
          <div className="choice-row" role="group" aria-label="Son baktıkların">
            {recent.map((w) => (
              <button key={w} type="button" className="chip chip-sm" lang={language} onClick={() => pick(w)}>
                {w}
              </button>
            ))}
          </div>
        </section>
      )}

      {typed && !index && (savedCard || savedOthers.length > 0) && (
        <>
          {savedCard}
          {savedOthers.length > 0 && <SavedList language={language} list={savedOthers} onPick={pick} onRemove={(w) => updateNotes((n) => removeEntry(n, w))} />}
        </>
      )}

      {typed && index && (
        <>
          {result.exact ? (
            <WordCard
              key={result.exact.word}
              form={result.form}
              formNote={result.formNote}
              alsoFormOf={result.alsoFormOf}
              language={language}
              word={result.exact.word}
              rec={result.exact.rec}
              rank={result.exact.rank}
              own={own}
              fix={notes.fixes[result.exact.word]?.t}
              onFix={(meanings) => updateNotes((n) => setFix(n, result.exact!.word, meanings, new Date().toISOString()))}
              onOpenWord={onOpenWord}
              onAdd={(written, meaning, extra) => {
                setRecent(saveRecent(language, result.exact!.word))
                void onAdd(written, meaning, extra)
              }}
              onOpenLab={onOpenLab}
              onPick={pick}
              onSwitchLanguage={onSwitchLanguage}
            />
          ) : savedCard ?? (
            <NotFound
              key={typed}
              language={language}
              word={typed}
              own={own}
              onOpenWord={onOpenWord}
              onAdd={onAdd}
              onSave={save}
              deeplOn={deeplOn}
              hasOthers={result.fromTurkish.length > 0}
              hasSimilar={result.similar.length > 0}
            />
          )}

          {savedOthers.length > 0 && <SavedList language={language} list={savedOthers} onPick={pick} onRemove={(w) => updateNotes((n) => removeEntry(n, w))} />}

          {result.fromTurkish.length > 0 && (
            <section className="section stack">
              <h2 className="section-title">Türkçesi “{result.turkishAs ?? typed}” olanlar</h2>
              {result.turkishAs && (
                <p className="small muted">
                  “{typed}” → {result.turkishAs}
                </p>
              )}
              <ul className="word-list">
                {result.fromTurkish.map((h) => (
                  <li key={h.word}>
                    <button type="button" className="word-row" onClick={() => pick(h.word)}>
                      <span className="word-row-text">
                        <span className="w" lang={language}>
                          {h.word}
                          {h.isOwn && (
                            <span className="pill stage-5 dict-own">Kelimelerinde</span>
                          )}
                        </span>
                        <span className="meta">{h.rec.t?.join(', ')}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {result.similar.length > 0 && (
            <section className="section stack">
              <h2 className="section-title">Böyle başlayanlar</h2>
              <div className="choice-row" role="group" aria-label="Böyle başlayan kelimeler">
                {result.similar.map((h) => (
                  <button key={h.word} type="button" className="chip chip-sm" lang={language} onClick={() => pick(h.word)} title={h.rec.t?.join(', ')}>
                    {h.word}
                  </button>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {index && (
        <section className="section">
          <p className="small muted">
            Kaynak: <a href="https://en.wiktionary.org" target="_blank" rel="noreferrer">Vikisözlük</a> (CC BY-SA), her dilde en sık 14–27 bin kelime. Türkçe karşılıklar Türkçe Vikisözlük’ten ve İngilizce üzerinden gelir; emin olmadığında Vikisözlük sayfasına bak ya da “Anlamı düzelt”.
            {vocabulary.filter((v) => v.language === language).length > 0 && (
              <> Metin okurken ve toplu aktarımla eklediğin <strong>{vocabulary.filter((v) => v.language === language).length} kişisel kelime</strong> de bu sözlükte aranır.</>
            )}
          </p>
        </section>
      )}
    </div>
  )
}

/** The pack's word: the word-page header, made for a word that may not be in the list. */
