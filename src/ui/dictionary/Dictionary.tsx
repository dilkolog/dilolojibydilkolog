import { DictionaryQuickReview } from './DictionaryQuickReview'
import { dictionaryForms } from '../../data/dictionaryForms'
import { saveDictionarySentence } from '../../data/dictionarySentence'
import { POS_CODE, genderOfCode } from '../../data/wordpackBuild'
import type { Tense } from '../../engine/tenses'
import '../../lazy.css'
import { useEffect, useMemo, useRef, useState } from 'react'
import { buildIndex, fold, search, wordOfTheDay } from '../../data/dictionary'
import { loadTenses } from '../../data/tenseData'
import { loadPack } from '../../data/wordpack'
import { translationReady } from '../../data/translate'
import type { Pack } from '../../data/wordpackBuild'
import { db } from '../../data/instance'
import { addEntry, emptyNotes, findAdded, noteLookup, removeEntry, setFix, type DictionaryNotes } from '../../engine/dictionaryNotes'
import { normalize, splitArticle } from '../../engine/answerCheck'
import type { Example, Gender, PartOfSpeech, TargetLanguage, UserWordState, VocabularyEntry, WordList } from '../../engine/types'
import { CheckIcon, ChevronDownIcon, MicIcon, SearchIcon, TagIcon, TargetIcon } from '../shared/icons'
import { MenuItem, Popover } from '../shared/Popover'
import { LANGUAGE_NAME } from '../shared/labels'
import { createEntry } from '../../data/wordInput'
import { formIn } from '../../engine/inflection'
import { defaultPlacement, lastPlacement, rememberPlacement } from '../words/listMemory'
import { parsePlacement } from '../words/listOptions'
import { canListen, listen, type Listening } from '../shared/speechInput'
import { showToast } from '../shared/toastFeed'
import { PageHeader } from '../shared/PageHeader'
import { daySeed } from '../../appNav'
import { WordCard } from './DictionaryCard'
import { NotFound } from './DictionaryNotFound'
import { SavedCard, DayWord, SavedList } from './DictionarySaved'
import { sentencesNow } from './dictSentences'
import { findIdioms, loadIdioms, type Idiom } from '../../data/idioms'
import { idiomItems } from '../words/idiomItems'
import { keyEntries } from '../reading/keyWordsList'
import { IdiomCard, IdiomList } from './DictionaryIdioms'

/**
 * Any word, in the list or not: what it means in Turkish, how it sounds, where it comes from and
 * what it is in the other two languages, from the word pack (offline once downloaded). Typing
 * Turkish finds the foreign words for it. A word not in the list is one tap from the add form,
 * its meaning already filled in.
 */
interface Props {
  language: TargetLanguage
  vocabulary: VocabularyEntry[]
  states?: UserWordState[]
  lists?: readonly WordList[]
  initialQuery?: string
  onOpenWord: (id: string) => void
  onAdd: (word: string, meaning: string) => void
  /** After a word was added here in one tap (the screen's word list reloads). */
  onAdded?: () => void
  onOpenLab?: (verb: string, tense?: Tense) => void
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

export function DictionaryScreen({ language, vocabulary, states = [], lists: propLists, initialQuery = '', onOpenWord, onAdd: openForm, onAdded, onOpenLab, onSwitchLanguage, onOpenList }: Props) {
  const [query, setQuery] = useState(initialQuery)
  const [reviewing, setReviewing] = useState(false)
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
  const [idioms, setIdioms] = useState<readonly Idiom[]>([])
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
    setReviewing(false)
    setRecent(loadRecent(language))
    void loadPack(language).then((p) => live && setPack(p ?? null))
    setIdioms([])
    void loadIdioms(language).then((l) => live && setIdioms(l))
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
    if (language === 'en') setTables(true)
    else void loadTenses(language).then(() => live && setTables(true))
    return () => {
      live = false
    }
  }, [language])
  const result = useMemo(() => (index ? search(index, query, tables ? (w) => dictionaryForms(language, w) : undefined) : { similar: [], fromTurkish: [] }), [index, query, tables, language])
  // The day's word stays the same all day; once added it gives way to the next one.
  const today = useMemo(() => (index ? wordOfTheDay(index, daySeed(new Date())) : undefined), [index])
  const typed = query.trim()
  const exactWord = result.exact?.word
  const own = typed ? ownEntry(vocabulary, exactWord ?? typed, language) : undefined
  const saved = useMemo(() => findAdded(notes, typed, language), [notes, typed, language])
  const analyses = useMemo(() => tables ? dictionaryForms(language, query).filter(f => !index || index.keys.includes(f.lemma)) : [], [tables, language, query, index])
  const reviewWords = useMemo(() => recent.flatMap(word => {
    if (!index) return []
    const hit = search(index, word).exact
    const mine = ownEntry(vocabulary, hit?.word ?? word, language)
    const meaning = mine?.senses[0]?.gloss || notes.fixes[word]?.t[0] || hit?.rec.t?.[0] || notes.added?.[word]?.t[0]
    return meaning ? [{ word: hit?.word ?? word, meaning }] : []
  }).filter((w, i, all) => all.findIndex(x => x.word === w.word) === i).slice(0, RECENT_MAX), [recent, index, vocabulary, language, notes])
  /** One example sentence for a saved word: the learner's own card first, else the fetched or bundled ones. */
  const sentenceOf = (word: string): string | undefined => {
    const mine = ownEntry(vocabulary, word, language)?.senses.flatMap((x) => x.examples).find((x) => x.text.trim())
    if (mine) return mine.text
    if (!index) return undefined
    const hit = search(index, word).exact
    return sentencesNow(language, hit?.word ?? word, hit?.rec.c)[0]?.text
  }
  const targetListName = currentPlacementInfo.listId ? currentPlacementInfo.label : 'Listesiz'
  // The idiom pack: an idiom typed whole gets its own card; a word shows the idioms it is in.
  const idiomHit = useMemo(() => findIdioms(idioms, typed, 8, tables ? language : undefined), [idioms, typed, language, tables])
  const idiomEntry = useMemo(() => (idiomHit.exact ? keyEntries(idiomItems([idiomHit.exact]), language, new Date(), '')[0] : undefined), [idiomHit.exact, language])
  const idiomOwn = idiomEntry ? vocabulary.find((v) => v.id === idiomEntry.id) : undefined
  const addIdiom = async () => {
    if (!idiomEntry) return
    const { listId, levelId } = parsePlacement(targetPlacement)
    const list = lists.find((l) => l.id === listId)
    await db.vocabulary.put({ ...idiomEntry, addedAt: new Date(), ...(list ? { listId: list.id, ...(levelId ? { levelId } : {}) } : {}) })
    setRecent(saveRecent(language, idiomEntry.lemma))
    onAdded?.()
    showToast(list ? `“${idiomEntry.lemma}” “${list.name}” listesine eklendi.` : `“${idiomEntry.lemma}” kelimelerine eklendi.`, { label: 'Aç', run: () => onOpenWord(idiomEntry.id) }, 5000, 'success')
  }
  // An idiom whose card stays up a moment was looked up: it joins the recent searches like a word.
  const idiomShown = !result.exact ? idiomHit.exact?.w : undefined
  useEffect(() => {
    if (!idiomShown) return
    const t = setTimeout(() => setRecent(saveRecent(language, idiomShown)), 1500)
    return () => clearTimeout(t)
  }, [idiomShown, language])
  const idiomCard = idiomHit.exact && !result.exact ? <IdiomCard key={idiomHit.exact.w} language={language} idiom={idiomHit.exact} own={idiomOwn} targetListName={targetListName} onOpenWord={onOpenWord} onAdd={() => void addIdiom()} /> : null
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
    if (!exactWord || counted.current.has(`${language}:${exactWord}`)) return
    const t = setTimeout(() => {
      counted.current.add(`${language}:${exactWord}`)
      setRecent(saveRecent(language, exactWord))
      updateNotes((n) => noteLookup(n, exactWord, new Date().toISOString()))
    }, 1500)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exactWord, language])

  /** Look a word up, as if typed, and remember it. */
  const pick = (word: string) => {
    setQuery(word)
    setRecent(saveRecent(language, word))
  }

  if (reviewing) return <DictionaryQuickReview key={language} words={reviewWords} language={language} onDone={() => setReviewing(false)} />

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
          sentenceOf={sentenceOf}
          onPick={pick}
          onRemove={(w) => updateNotes((n) => removeEntry(n, w))}
        />
      )}

      {!typed && recent.length > 0 && (
        <section className="section stack">
          <h2 className="section-title">Son baktıkların</h2>
          {new Set(reviewWords.map(w => w.meaning)).size >= 2 && <button type="button" className="btn" onClick={() => setReviewing(true)}>Son aradığın {reviewWords.length} kelimeyi test et</button>}
          <p className="small muted">Anlamı bulunan son kelimelerle serbest pratik; tekrar takvimini değiştirmez.</p>
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
          {savedOthers.length > 0 && <SavedList language={language} list={savedOthers} sentenceOf={sentenceOf} onPick={pick} onRemove={(w) => updateNotes((n) => removeEntry(n, w))} />}
        </>
      )}

      {typed && index && (
        <>
          {(result.correction || result.suggestions?.length) && <section className="note dict-spelling" aria-label="Yazım önerileri">
            <strong>Bunu mu demek istedin?</strong>{' '}
            {(result.suggestions ?? (result.exact ? [result.exact] : [])).map(h => <button key={h.word} type="button" className="chip chip-sm" lang={language} onClick={() => pick(h.word)}>{h.word}</button>)}
          </section>}
          {analyses.length > 0 && <section className="section stack dict-form-analysis" aria-label="Çekimli biçim çözümlemesi">
            <h2 className="section-title">Bu biçim ne anlatıyor?</h2>
            <ul className="plain stack gap-2">{analyses.slice(0, 8).map((a, i) => <li key={`${a.lemma}:${a.note}:${i}`}>
              <button type="button" className="link" lang={language} onClick={() => pick(a.lemma)}>{a.lemma}</button>{' · '}{a.note}
              {a.pronouns && <p className="small"><span lang={language}>{typed} → {a.stem} + {a.pronouns.join(' + ')}</span> · bitişik zamirler</p>}
              {onOpenLab && <button type="button" className="chip chip-sm" onClick={() => onOpenLab(a.lemma, a.tense)}>Zaman kartını aç</button>}
            </li>)}</ul>
            {analyses.length > 1 && <p className="small muted">Bu yazım birden fazla çekime karşılık geliyor; cümlenin bağlamına göre seç.</p>}
          </section>}
          {/* With no word of that spelling, the idioms it touches are the answer: they come first. */}
          {!result.exact && <IdiomList language={language} typed={typed} idioms={idiomHit.others} onPick={pick} />}
          {result.exact ? (
            <WordCard
              key={result.exact.word}
              form={result.form}
              formNote={result.formNote}
              alsoFormOf={result.alsoFormOf}
              baseOf={result.baseOf}
              language={language}
              word={result.exact.word}
              rec={result.exact.rec}
              rank={result.exact.rank}
              own={own}
              state={own ? states.find(st => st.entryId === own.id) : undefined}
              onSaveSentence={async text => {
                const hit = result.exact!
                const meaning = notes.fixes[hit.word]?.t[0] || hit.rec.t?.[0]
                if (!own && !meaning) throw new Error('Önce kelimenin Türkçe anlamını eklemelisin.')
                const candidate = own ?? createEntry({ word: hit.word, meaning: meaning!, partOfSpeech: hit.rec.p ? POS_CODE[hit.rec.p] : undefined, gender: genderOfCode(hit.rec.g) }, language, new Date())
                if (!own) {
                  const placement = parsePlacement(targetPlacement)
                  if (lists.some(l => l.id === placement.listId)) { candidate.listId = placement.listId ?? undefined; candidate.levelId = placement.levelId ?? undefined }
                }
                await saveDictionarySentence(db, candidate, text)
                setRecent(saveRecent(language, hit.word))
                onAdded?.()
              }}
              listOnly={!!index.extra?.has(result.exact.word)}
              fix={notes.fixes[result.exact.word]?.t}
              deeplOn={deeplOn}
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
          ) : idiomCard ?? savedCard ?? (
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
              hasOthers={result.fromTurkish.length > 0 || idiomHit.others.length > 0}
              hasSimilar={result.similar.length > 0}
            />
          )}

          {result.exact && <IdiomList language={language} typed={typed} idioms={idiomHit.others} onPick={pick} />}

          {savedOthers.length > 0 && <SavedList language={language} list={savedOthers} sentenceOf={sentenceOf} onPick={pick} onRemove={(w) => updateNotes((n) => removeEntry(n, w))} />}

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
