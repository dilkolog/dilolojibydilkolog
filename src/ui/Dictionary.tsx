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
import type { Example, Gender, PartOfSpeech, TargetLanguage, VocabularyEntry, WordList } from '../engine/types'
import { CheckIcon, ChevronDownIcon, MicIcon, SearchIcon, TagIcon, TargetIcon } from './icons'
import { MenuItem, Popover } from './Popover'
import { LANGUAGE_NAME } from './labels'
import { createEntry } from '../data/wordInput'
import { formIn } from '../engine/inflection'
import { defaultPlacement, lastPlacement, rememberPlacement } from './listMemory'
import { parsePlacement } from './listOptions'
import { canListen, listen, type Listening } from './speechInput'
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
  lists?: readonly WordList[]
  initialQuery?: string
  onOpenWord: (id: string) => void
  onAdd: (word: string, meaning: string) => void
  /** After a word was added here in one tap (the screen's word list reloads). */
  onAdded?: () => void
  onOpenLab?: (verb: string) => void
  onSwitchLanguage?: (lang: TargetLanguage, query?: string) => void
  onOpenList?: (listId: string) => void
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

export function DictionaryScreen({ language, vocabulary, lists: propLists, initialQuery = '', onOpenWord, onAdd: openForm, onAdded, onOpenLab, onSwitchLanguage, onOpenList }: Props) {
  const [query, setQuery] = useState(initialQuery)
  // Saying the word instead of typing it: the heard word goes into the search box.
  const [hearing, setHearing] = useState(false)
  const hearer = useRef<Listening | null>(null)
  useEffect(() => () => hearer.current?.(), [])
  useEffect(() => {
    hearer.current?.()
    setHearing(false)
  }, [language])
  const dictate = () => {
    if (hearing) return hearer.current?.finish()
    setHearing(true)
    hearer.current = listen(language, {
      onInterim: (t) => setQuery(t),
      onFinal: (alts) => setQuery((alts[0] ?? '').replace(/[.,!?¡¿]+$/g, '').toLocaleLowerCase(language)),
      onError: (m) => showToast(m, undefined, 5000, 'info'),
      onEnd: () => setHearing(false),
    })
  }
  const [pack, setPack] = useState<Pack | null | undefined>(undefined)
  const [recent, setRecent] = useState(() => loadRecent(language))
  const [notes, setNotes] = useState<DictionaryNotes>(emptyNotes)
  const notesRef = useRef(notes)
  const [deeplOn, setDeeplOn] = useState(false)
  const [lists, setLists] = useState<readonly WordList[]>(propLists ?? [])
  const [targetPlacement, setTargetPlacement] = useState<string>(() => lastPlacement(language))

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

  useEffect(() => {
    let live = true
    void Promise.all([db.getLists(language), db.getSettings()]).then(([allLists, s]) => {
      if (!live) return
      setLists(allLists)
      const initial = defaultPlacement(language, allLists, s?.focusList?.[language])
      setTargetPlacement((prev) => {
        if (!prev) return initial
        const valid = new Set(['__none', ...allLists.flatMap((l) => [l.id, ...(l.levels ?? []).map((lv) => `${l.id}|${lv.id}`)])])
        return valid.has(prev) ? prev : initial
      })
    })
    return () => {
      live = false
    }
  }, [language, propLists])

  const currentPlacementInfo = useMemo(() => {
    if (!targetPlacement || targetPlacement === '__none') {
      return { listId: null, label: 'Listesiz (Genel havuz)', name: 'Listesiz' }
    }
    const { listId, levelId } = parsePlacement(targetPlacement)
    const list = lists.find((l) => l.id === listId)
    if (!list) return { listId: null, label: 'Listesiz (Genel havuz)', name: 'Listesiz' }
    if (levelId) {
      const level = list.levels?.find((lv) => lv.id === levelId)
      if (level) return { listId: list.id, label: `${list.name} › ${level.name}`, name: list.name }
    }
    return { listId: list.id, label: list.name, name: list.name }
  }, [targetPlacement, lists])

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
   * Adds a word in one tap, with its meaning and the sentences shown for it, into the chosen
   * target list (or unlisted if selected); no detour through the word form. A word that would not make a
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
      const { listId, levelId } = parsePlacement(targetPlacement)
      const list = lists.find((l) => l.id === listId)
      const placedEntry: VocabularyEntry = {
        ...entry,
        ...(list ? { listId: list.id, ...(levelId ? { levelId } : {}) } : { listId: undefined, levelId: undefined }),
      }
      await db.vocabulary.put(placedEntry)
      setRecent(saveRecent(language, entry.lemma))
      onAdded?.()
      showToast(list ? `“${written}” “${list.name}” listesine eklendi.` : `“${written}” kelimelerine eklendi.`, { label: 'Aç', run: () => onOpenWord(entry.id) }, 5000, 'success')
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
  const targetListName = currentPlacementInfo.listId ? currentPlacementInfo.label : 'Listesiz'
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
      targetListName={targetListName}
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
          {canListen() && (
            <button type="button" className={`search-mic${hearing ? ' is-on' : ''}`} onClick={dictate} aria-pressed={hearing} aria-label={hearing ? 'Dinlemeyi bitir' : `Sesle ara: kelimeyi ${LANGUAGE_NAME[language]} söyle`}>
              <MicIcon size={18} />
            </button>
          )}
        </form>
        <div className="dict-target-bar">
          <span className="dict-target-title">
            <TargetIcon size={14} className="inline-icon" />
            <span>Hedef liste:</span>
          </span>
          <Popover
            kind="menu"
            align="start"
            label="Yeni kelimelerin ekleneceği liste"
            buttonClassName="dict-target-btn"
            buttonProps={{ 'aria-label': `Hedef liste: ${currentPlacementInfo.label}` }}
            button={
              <>
                <span className="dict-target-btn-text">{currentPlacementInfo.label}</span>
                <ChevronDownIcon size={13} className="dict-target-chev" />
              </>
            }
          >
            {(close) => (
              <>
                <MenuItem
                  icon={targetPlacement === '__none' ? <CheckIcon size={16} /> : <span className="lab-tick-gap" />}
                  selected={targetPlacement === '__none'}
                  title="Listesiz (Genel havuz)"
                  hint="Herhangi bir listeye bağlı olmadan ekle"
                  onSelect={() => {
                    setTargetPlacement('__none')
                    rememberPlacement(language, '__none')
                    close()
                  }}
                />
                {lists.length > 0 && <div className="popover-rule" role="separator" />}
                {lists.map((l) => {
                  const isSelected = targetPlacement === l.id
                  return (
                    <div key={l.id}>
                      <MenuItem
                        icon={isSelected ? <CheckIcon size={16} /> : <span className="lab-tick-gap" />}
                        selected={isSelected}
                        title={l.name}
                        hint={l.levels?.length ? `${l.levels.length} alt seviye` : undefined}
                        onSelect={() => {
                          setTargetPlacement(l.id)
                          rememberPlacement(language, l.id)
                          close()
                        }}
                      />
                      {l.levels?.map((lv) => {
                        const val = `${l.id}|${lv.id}`
                        const isLevelSelected = targetPlacement === val
                        return (
                          <MenuItem
                            key={val}
                            className="dict-target-subitem"
                            icon={isLevelSelected ? <CheckIcon size={16} /> : <span className="lab-tick-gap" />}
                            selected={isLevelSelected}
                            title={`↳ ${lv.name}`}
                            hint={l.name}
                            onSelect={() => {
                              setTargetPlacement(val)
                              rememberPlacement(language, val)
                              close()
                            }}
                          />
                        )
                      })}
                    </div>
                  )
                })}
                {onOpenList && currentPlacementInfo.listId && (
                  <>
                    <div className="popover-rule" role="separator" />
                    <MenuItem
                      icon={<TagIcon size={16} />}
                      title={`“${currentPlacementInfo.name}” listesini aç`}
                      hint="Listeyi görüntüle ve yönet"
                      onSelect={() => {
                        close()
                        onOpenList(currentPlacementInfo.listId!)
                      }}
                    />
                  </>
                )}
              </>
            )}
          </Popover>
        </div>
        <div aria-live="polite">
          {index === undefined && <p className="small muted">Sözlük açılıyor…</p>}
          {index === null && <p className="small muted">Sözlük henüz bu cihaza inmedi; internete bağlanınca bir kez iner, sonra internetsiz de çalışır.</p>}
        </div>
      </section>

      {!typed && today && <DayWord language={language} hit={today} targetListName={targetListName} onOpen={() => pick(today.word)} onAdd={onAdd} />}

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
              targetListName={targetListName}
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
              targetListName={targetListName}
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
