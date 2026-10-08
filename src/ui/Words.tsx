import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useTenses } from './ConjugationTable'
import { analyzeForm } from '../engine/tenses'
import { TENSE_GUIDE } from '../engine/tenseGuide'
import { normalize, splitArticle } from '../engine/answerCheck'
import { MASTERY_STAGES, masteryStage } from '../engine/mastery'
import { addedTime, type Gender, type Mistake, type PartOfSpeech, type TargetLanguage, type UserWordState, type VocabularyEntry, type WordList as WordListRow } from '../engine/types'
import { showToast } from './toast'
import type { KelimeDB } from '../data/db'
import { SAMPLE_WORDS } from '../data/seed'
import { loadFrequency, rankOf, UNRANKED } from '../data/frequency'
import { loadLexicon, lookUpLexicon, type LexiconEntry } from '../data/lexicon'
import { turkishMeanings, type TurkishMeanings } from '../data/wordInfo'
import { bandOf, createEntry, entryToInput, FREQUENCY_BANDS, guessPartOfSpeech, markWord, updateEntry, wordId, WordInputError, wordKeys, type WordInput } from '../data/wordInput'
import { AiError, collocationLines, enrichWords, suggestFields, wordInfoToInput, type SuggestField } from '../ai'
import { useAi } from './aiContext'
import { BoltIcon, CheckIcon, ChevronLeftIcon, GlobeIcon, ImageIcon, MicIcon, PlusIcon, SlidersIcon, SparkleIcon } from './icons'
import { ImagePicker, type PickedImage } from './ImagePicker'
import { BulkImport } from './BulkImport'
import { ConceptsView, TriLanguageCard } from './CrossLanguage'
import { ListHealthCard } from './ListHealth'
import { TranslateImport } from './TranslateImport'
import { accentChange } from './AccentBar'
import { MissingWords } from './MissingWords'
import { KindleImport } from './KindleImport'
import { GardenView, WORDS_VIEW_KEY } from './Garden'
import { Plant } from './Plant'
import { growthStage, plantHealth } from '../engine/growth'
import { scheduler } from '../data/instance'
import { deleteWordsWithUndo } from './undo'
import { Select } from './Select'
import { useMediaUrl } from './useMedia'
import { TextImport } from './TextImport'
import type { IncomingWord } from './incoming'
import { WordGraph } from './WordGraph'
import { LANGUAGE_NAME, POS_NAME, STAGE_NAME } from './labels'
import { EmptyState } from './EmptyState'
import { PageHeader } from './PageHeader'
import { nextReviewAt } from '../engine/review'
import { relativeTime } from './format'
import { getDensity, setDensity } from './density'
import { saveWordOrder } from './wordOrder'
import { WordListsView } from './WordLists'
import { placementOptions, parsePlacement } from './listOptions'
import { PosTag } from './PosTag'
import { WordLabel } from './WordLabel'
import { displayForm } from '../engine/exercises'
import { isDifficult, withDifficult } from '../engine/difficult'
import { imageCandidates, skippedImages } from '../data/imageQueue'
import { MenuItem, Popover } from './Popover'
import { ImageQueue } from './ImageQueue'

interface Props {
  db: KelimeDB
  language: TargetLanguage
  vocabulary: VocabularyEntry[]
  states: UserWordState[]
  mistakes: Mistake[]
  onChanged: () => void
  onOpen: (entryId: string) => void
  /** Study a filtered list (deck) right now. */
  onStudy: (entries: VocabularyEntry[]) => void
  /** A word sent from another site via the bookmarklet. */
  incoming?: IncomingWord | null
  onIncomingDone?: () => void
  /** Word lists of this language, and the one in focus (new words come only from it). */
  lists?: WordListRow[]
  focusListId?: string
  onFocus?: (listId: string | null) => void
}

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname
  } catch {
    return ''
  }
}

const SECTION_KEY = 'kelime-koc:words-section'

export function WordsScreen({ db, language, vocabulary, states, mistakes, onChanged, onOpen, onStudy, incoming, onIncomingDone, lists = [], focusListId, onFocus = () => {} }: Props) {
  const stateById = useMemo(() => new Map(states.map((s) => [s.entryId, s])), [states])
  const ids = useMemo(() => new Set(vocabulary.map((v) => v.id)), [vocabulary])
  const keys = useMemo(() => wordKeys(vocabulary), [vocabulary])
  const [view, setViewState] = useState<'list' | 'lists' | 'garden' | 'graph' | 'concepts'>(() => {
    try {
      const v = localStorage.getItem(WORDS_VIEW_KEY)
      return v === 'lists' || v === 'garden' || v === 'graph' || v === 'concepts' ? v : 'list'
    } catch {
      return 'list'
    }
  })
  const setView = (v: typeof view) => {
    setViewState(v)
    try {
      localStorage.setItem(WORDS_VIEW_KEY, v)
    } catch {
      // Not remembered; harmless.
    }
  }
  const [section, setSectionState] = useState<'words' | 'add' | 'import'>(() => {
    if (incoming || vocabulary.length === 0) return 'add'
    try {
      const v = localStorage.getItem(SECTION_KEY)
      return v === 'add' || v === 'import' ? v : 'words'
    } catch {
      return 'words'
    }
  })
  const setSection = (v: typeof section) => {
    setSectionState(v)
    try {
      localStorage.setItem(SECTION_KEY, v)
    } catch {
      // Not remembered; harmless.
    }
  }
  // A word sent from another site opens the add form.
  useEffect(() => {
    if (incoming) setSectionState('add')
  }, [incoming])
  const hasSamples = vocabulary.some((v) => v.source === 'sample')


  const loadSamples = async () => {
    // Dated now, so samples removed earlier and loaded again aren't taken for deleted ones on sync.
    const now = new Date()
    await db.vocabulary.bulkPut(SAMPLE_WORDS[language].filter((w) => !ids.has(w.id)).map((w) => ({ ...w, addedAt: now })))
    onChanged()
  }

  const removeSamples = async () => {
    const samples = vocabulary.filter((v) => v.source === 'sample')
    await deleteWordsWithUndo(samples.map((s) => s.id), `${samples.length} örnek kelime silindi`, onChanged)
  }

  const [suggestingImages, setSuggestingImages] = useState(false)
  // Words passed over are kept outside the word list, so closing the dialog tells the list to count again.
  const [pictureTick, setPictureTick] = useState(0)

  const goAdd = () => {
    setSection('add')
    setTimeout(() => document.getElementById('w-word')?.focus(), 60)
  }

  return (
    <div>
      {suggestingImages && (
        <ImageQueue
          db={db}
          vocabulary={vocabulary}
          onClose={() => {
            setSuggestingImages(false)
            setPictureTick((t) => t + 1)
          }}
          onChanged={onChanged}
        />
      )}
      <section className="section stack">
        <PageHeader
          inline
          title={`${LANGUAGE_NAME[language]} kelimelerin`}
          sub={vocabulary.length ? `${vocabulary.length} kelime, ${states.length} tanesi öğreniliyor.` : 'Öğrenmek istediğin kelimeleri ekle; gerisini tekrar takvimi halleder.'}
          action={
            section === 'words' && (
              <Popover
                kind="menu"
                align="end"
                label="Kelime ekle"
                buttonClassName="btn"
                button={
                  <>
                    <PlusIcon size={18} /> Ekle
                  </>
                }
              >
                {(close) => (
                  <>
                    <MenuItem
                      icon={<PlusIcon size={18} />}
                      title="Tek kelime ekle"
                      hint="Kelimeyi, anlamını ve bir örnek cümleyi yaz"
                      onSelect={() => {
                        close()
                        goAdd()
                      }}
                    />
                    <MenuItem
                      icon={<GlobeIcon size={18} />}
                      title="Birçok kelime ekle"
                      hint="Liste yapıştır, dosya, Kindle ya da metin"
                      onSelect={() => {
                        close()
                        setSection('import')
                      }}
                    />
                  </>
                )}
              </Popover>
            )
          }
        />
        {/* Adding and importing are their own pages; one way back to the words. */}
        {section !== 'words' && (
          <button type="button" className="link back-link" onClick={() => setSection('words')}>
            <ChevronLeftIcon size={16} className="inline-icon" /> Kelimelerim{vocabulary.length ? ` (${vocabulary.length})` : ''}
          </button>
        )}
      </section>

      {section === 'add' && (
        <section className="section stack">
          {incoming && (
            <div className="card stack incoming">
              {/* From the web (bookmarklet, extension); a word typed in the ⌘K palette needs no note. */}
              {(incoming.src || incoming.context || !incoming.word) && (
              <p className="small muted">
                <GlobeIcon size={16} className="inline-icon" />Web'den geldi{incoming.src && hostOf(incoming.src) && (
                  <>
                    : <a href={incoming.src} target="_blank" rel="noreferrer">{hostOf(incoming.src)}</a>
                  </>
                )}
                {!incoming.word && ' · Cümledeki öğrenmek istediğin kelimeyi yaz.'}
              </p>
              )}
              <WordForm
                key={incoming.word + incoming.context}
                db={db}
                language={language}
                existing={keys}
                initial={{
                  word: incoming.word,
                  meaning: incoming.meaning ?? '',
                  example: incoming.word ? markWord(incoming.context, incoming.word) : incoming.context,
                  exampleTranslation: '',
                  notes: incoming.src ? `Kaynak: ${incoming.src}` : '',
                }}
                onSaved={() => {
                  onChanged()
                  onIncomingDone?.()
                }}
                onCancel={onIncomingDone}
              />
            </div>
          )}
          {!incoming && (
            <div className="card stack">
              <WordForm db={db} language={language} existing={keys} onSaved={onChanged} onLearn={onStudy} preview />
            </div>
          )}
          <div className="row small">
            {hasSamples ? (
              <button className="link" onClick={removeSamples}>
                Örnek kelimeleri kaldır
              </button>
            ) : (
              <button className="link" onClick={loadSamples}>
                Denemek için {SAMPLE_WORDS[language].length} örnek kelime yükle
              </button>
            )}
          </div>
        </section>
      )}

      {section === 'import' && (
        <section className="section stack">
        <section className="card stack import-group">
          <h2 className="section-title">Başka yerden kelime aktar</h2>
          <TextImport db={db} language={language} vocabulary={vocabulary} existing={keys} onAdded={onChanged} />
          <BulkImport db={db} language={language} existing={keys} onImported={onChanged} />
          <KindleImport db={db} language={language} existing={keys} onAdded={onChanged} />
          <TranslateImport db={db} language={language} existing={keys} onAdded={onChanged} />
          <MissingWords db={db} language={language} vocabulary={vocabulary} onAdded={onChanged} />
        </section>
        </section>
      )}

      {section === 'words' && (
        <>
          <section className="section stack">
            <ListHealthCard db={db} vocabulary={vocabulary} states={states} mistakes={mistakes} onChanged={onChanged} onOpen={onOpen} />
        <div className="segmented" role="tablist" aria-label="Görünüm">
          <button role="tab" className="segmented-btn" aria-selected={view === 'list'} onClick={() => setView('list')}>
            Tümü
          </button>
          <button role="tab" className="segmented-btn" aria-selected={view === 'lists'} onClick={() => setView('lists')}>
            Listeler
          </button>
          <button role="tab" className="segmented-btn" aria-selected={view === 'garden'} onClick={() => setView('garden')}>
            Bahçe
          </button>
          <Popover
            kind="menu"
            align="end"
            label="Diğer görünümler"
            buttonClassName="segmented-btn"
            buttonProps={{ role: 'tab', 'aria-selected': view === 'graph' || view === 'concepts' }}
            button={<>{view === 'graph' ? 'Kelime ağı' : view === 'concepts' ? 'Kavramlar' : 'Daha fazla'} ▾</>}
          >
            {(close) => (
              <>
                <MenuItem
                  title="Kelime ağı"
                  hint="Kelimeler arasındaki bağlar, bir harita olarak"
                  onSelect={() => {
                    close()
                    setView('graph')
                  }}
                />
                <MenuItem
                  title="Kavramlar"
                  hint="Aynı anlam üç dilde yan yana"
                  onSelect={() => {
                    close()
                    setView('concepts')
                  }}
                />
              </>
            )}
          </Popover>
        </div>
          </section>
      {view === 'list' ? (
        <WordList
          vocabulary={vocabulary}
          stateById={stateById}
          mistakes={mistakes}
          onOpen={onOpen}
          onStudy={onStudy}
          onDelete={(ids) => deleteWordsWithUndo(ids, `${ids.length} kelime silindi`, onChanged)}
          onAdd={goAdd}
          lists={lists}
          onSuggestImages={() => setSuggestingImages(true)}
          pictureTick={pictureTick}
          onRemoveSamples={hasSamples ? removeSamples : undefined}
          onMark={async (ids, difficult) => {
            const set = new Set(ids)
            await db.vocabulary.bulkPut(vocabulary.filter((v) => set.has(v.id)).map((v) => withDifficult(v, difficult)))
            onChanged()
            showToast(difficult ? `${ids.length} kelime zor diye işaretlendi.` : `${ids.length} kelimenin zor işareti kaldırıldı.`)
          }}
          onMove={async (ids, placement) => {
            const { listId, levelId } = parsePlacement(placement)
            await db.assignList(ids, listId, levelId)
            onChanged()
            const name = placementOptions(lists).find((o) => o.value === placement && listId)?.label
            showToast(name ? `${ids.length} kelime "${name}" listesine taşındı.` : `${ids.length} kelime listeden çıkarıldı.`)
          }}
        />
      ) : view === 'lists' ? (
        <WordListsView
          db={db}
          language={language}
          lists={lists}
          vocabulary={vocabulary}
          states={states}
          focusListId={focusListId}
          onFocus={onFocus}
          onListsChanged={onChanged}
          onOpen={onOpen}
          onStudy={onStudy}
        />
      ) : view === 'garden' ? (
        <GardenView vocabulary={vocabulary} states={states} onOpen={onOpen} onWater={onStudy} />
      ) : view === 'concepts' ? (
        <ConceptsView language={language} onOpen={onOpen} />
      ) : (
        <section className="stack mt-4">
          <WordGraph vocabulary={vocabulary} states={states} onOpen={onOpen} />
        </section>
      )}
        </>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------

/** Placeholders in the language being edited, so the expected format is obvious. */
const EXAMPLES: Record<TargetLanguage, { collocation: string; confusable: string; row: string; marked: string }> = {
  en: {
    collocation: 'make a decision = karar vermek (do a decision, give a decision)',
    confusable: 'effect',
    row: 'decision\tkarar\tIt was a hard decision.\tZor bir karardı.',
    marked: 'She *abandoned* it.',
  },
  fr: {
    collocation: 'prendre une décision = karar vermek (faire une décision)',
    confusable: 'journée',
    row: 'la décision\tkarar\tC’est une décision difficile.\tBu zor bir karar.',
    marked: 'Je *sais* nager.',
  },
  es: {
    collocation: 'tomar una decisión = karar vermek (hacer una decisión)',
    confusable: 'conocer',
    row: 'la decisión\tkarar\tFue una decisión difícil.\tZor bir karardı.',
    marked: 'No *sé* nadar.',
  },
}

/** Sort key for frequency: known ranks first, then words rarer than the list, then unknown. */
const freqKey = (e: VocabularyEntry) => (e.frequencyRank > 0 ? e.frequencyRank : e.frequencyRank < 0 ? 1e6 : 2e6)

const splitTags = (s?: string) => (s ?? '').split(',').map((t) => t.trim()).filter(Boolean)

const LAST_LIST_KEY = 'kelime-koc:last-list'
const EMPTY: WordInput = { word: '', meaning: '', example: '', exampleTranslation: '', collocations: '', confusables: '' }

const POS_OPTIONS: PartOfSpeech[] = ['other', 'noun', 'verb', 'adjective', 'adverb', 'preposition', 'conjunction', 'pronoun', 'phrase']

/**
 * Adds a new word, or edits `entry` when given. `existing` holds the keys of the other words
 * (see `wordKeys`) for the duplicate check.
 */
export function WordForm({
  db,
  language,
  existing,
  entry,
  initial,
  onSaved,
  onCancel,
  onLearn,
  preview = false,
}: {
  db: KelimeDB
  language: TargetLanguage
  existing: Set<string>
  entry?: VocabularyEntry
  /** Prefilled values for a new word. */
  initial?: WordInput
  onSaved: (entry: VocabularyEntry) => void
  onCancel?: () => void
  /** Study the words just added, right away. */
  onLearn?: (entries: VocabularyEntry[]) => void
  /** Show a live preview of the word card beside the form (on wide screens). */
  preview?: boolean
}) {
  const [form, setForm] = useState<WordInput>(() => (entry ? entryToInput(entry) : (initial ?? EMPTY)))
  const [error, setError] = useState('')
  // A new word typed in a conjugated form (tuve, allions) → offer its infinitive. Present forms are
  // left out: too many are also nouns (porte, livre, marche).
  useTenses(language)
  const typed = form.word.trim()
  const conjugated =
    !entry && language !== 'en' && typed && !typed.includes(' ')
      ? analyzeForm(language, typed).find((a) => a.tense !== 'present' && a.tense !== 'presente')
      : undefined
  // Words added with this form since the last "learn now", to study them in one go.
  const [justAdded, setJustAdded] = useState<VocabularyEntry[]>([])
  // A new word goes into a list: the last one chosen here, else the one in focus.
  const [lists, setLists] = useState<WordListRow[]>([])
  const [listId, setListIdState] = useState('')
  useEffect(() => {
    if (entry) return
    let live = true
    void Promise.all([db.getLists(language), db.getSettings()]).then(([all, s]) => {
      if (!live) return
      setLists(all)
      let last = ''
      try {
        last = localStorage.getItem(`${LAST_LIST_KEY}:${language}`) ?? ''
      } catch {
        // Falls back to the focus.
      }
      const valid = new Set(placementOptions(all).map((o) => o.value))
      const pick = [last, s?.focusList?.[language] ?? ''].find((v) => valid.has(v))
      setListIdState(pick === '__none' ? '' : (pick ?? ''))
    })
    return () => {
      live = false
    }
  }, [db, language, entry])
  const setListId = (id: string) => {
    setListIdState(id)
    try {
      localStorage.setItem(`${LAST_LIST_KEY}:${language}`, id || '__none')
    } catch {
      // Not remembered; harmless.
    }
  }
  const [added, setAdded] = useState('')
  const set = (k: keyof WordInput) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const needsGender = language === 'fr' && /^l['’]/i.test(form.word.trim())
  const { apiKey } = useAi()
  const [filling, setFilling] = useState(false)
  // A picture chosen before the word is saved (new words only; existing words edit it in detail).
  const [image, setImage] = useState<(PickedImage & { url: string }) | null>(null)
  const [picking, setPicking] = useState(false)
  // Part of speech is guessed from the word (or taken from the AI) unless the user picks it.
  const [posManual, setPosManual] = useState(() => !!entry || !!initial?.partOfSpeech)
  const [aiPos, setAiPos] = useState<{ word: string; pos: PartOfSpeech } | null>(null)
  // French: part of speech and gender from Lexique, offline (see data/lexicon.ts).
  const [lexicon, setLexicon] = useState<ReadonlyMap<string, LexiconEntry>>()
  useEffect(() => {
    let live = true
    void loadLexicon(language).then((l) => live && setLexicon(l))
    return () => {
      live = false
    }
  }, [language])
  const lex = lookUpLexicon(lexicon, form.word, language)
  const typedArticle = splitArticle(normalize(form.word.trim()).toLocaleLowerCase(language), language).article
  const fromAi = !!aiPos && aiPos.word === form.word.trim()
  const fromLexicon = !fromAi && !typedArticle && !!lex?.pos.length
  const autoPos = fromAi ? aiPos!.pos : fromLexicon ? lex!.pos[0] : guessPartOfSpeech(form.word, language)
  // A gender the article doesn't show (l'asile, les gens, or no article) comes from the lexicon.
  const lexGender = (!typedArticle || /^(l['’]|les)$/.test(typedArticle)) && lex?.gender ? lex.gender : undefined
  // Turkish meanings from Wiktionary as the word is typed, offered as one-tap suggestions.
  const [trMeanings, setTrMeanings] = useState<{ word: string } & TurkishMeanings>()
  useEffect(() => {
    const word = form.word.trim()
    if (entry || word.length < 2 || (typeof navigator !== 'undefined' && !navigator.onLine)) return
    let live = true
    const t = window.setTimeout(() => {
      turkishMeanings(word, language)
        .then((r) => live && setTrMeanings({ word, ...r }))
        .catch(() => undefined)
    }, 700)
    return () => {
      live = false
      window.clearTimeout(t)
    }
  }, [form.word, language, entry])
  const meaningList = form.meaning.split(/[,/]/).map((m) => m.trim().toLocaleLowerCase('tr'))
  const meaningSuggestions = trMeanings && trMeanings.word === form.word.trim() ? trMeanings.words.filter((w) => !meaningList.includes(w.toLocaleLowerCase('tr'))) : []
  const [moreOpen, setMoreOpen] = useState(false)
  // Frequency band looked up from the bundled list as the word is typed.
  const [autoRank, setAutoRank] = useState(0)
  useEffect(() => {
    const word = form.word.trim()
    if (!word) return
    let live = true
    loadFrequency(language).then((list) => {
      if (!live) return
      const { article, rest } = splitArticle(normalize(word).toLocaleLowerCase(language), language)
      setAutoRank(rankOf({ language, lemma: article && rest ? rest : word, partOfSpeech: posManual ? (form.partOfSpeech ?? 'other') : (autoPos ?? 'other') }, list))
    })
    return () => {
      live = false
    }
  }, [form.word, form.partOfSpeech, posManual, autoPos, language])
  const autoBand = form.word.trim() ? bandOf(autoRank) : undefined
  // Which single-field AI request is running ('more' = notes + tags + collocations together).
  const [suggesting, setSuggesting] = useState<SuggestField | 'more' | null>(null)
  const [aiError, setAiError] = useState<{ at: SuggestField | 'more'; message: string } | null>(null)

  /**
   * Asks the AI for some fields. Clicking a field's button is an explicit request, so the example
   * is replaced (a second click gives a new sentence), while notes, tags and collocations are
   * added to what is already there.
   */
  const suggest = async (at: SuggestField | 'more', fields: SuggestField[]) => {
    setAiError(null)
    if (!apiKey) {
      setAiError({ at, message: 'AI önerileri için Ayarlar → AI yardımcısı bölümünden API anahtarını gir.' })
      return
    }
    if (!form.word.trim()) {
      setAiError({ at, message: 'Önce kelimeyi yaz.' })
      return
    }
    setSuggesting(at)
    try {
      const existingTags = [...new Set((await db.vocabulary.where('language').equals(language).toArray()).flatMap((v) => v.tags))]
      const out = await suggestFields(apiKey, {
        language,
        word: form.word.trim(),
        meaning: form.meaning,
        fields,
        existingTags,
        currentExample: form.example,
      })
      setForm((f) => {
        const next = { ...f }
        if (out.example) {
          next.example = out.example
          next.exampleTranslation = out.exampleTranslation ?? ''
        }
        if (out.note) next.notes = f.notes?.trim() ? `${f.notes.trim()}\n${out.note}` : out.note
        if (out.tags?.length) {
          const tags = new Set([...splitTags(f.tags), ...out.tags.map((t) => t.trim().toLocaleLowerCase('tr'))])
          next.tags = [...tags].filter(Boolean).join(', ')
        }
        if (out.collocations?.length) {
          const have = (f.collocations ?? '').split('\n').map((l) => l.trim()).filter(Boolean)
          const known = new Set(have.map((l) => l.split('=')[0].trim().toLocaleLowerCase()))
          const fresh = out.collocations.filter((c) => !known.has(c.phrase.trim().toLocaleLowerCase()))
          next.collocations = [...have, collocationLines(fresh)].filter(Boolean).join('\n')
        }
        return next
      })
    } catch (err) {
      setAiError({ at, message: err instanceof AiError ? err.message : 'AI önerisi alınamadı.' })
    } finally {
      setSuggesting(null)
    }
  }

  const aiButton = (at: SuggestField | 'more', fields: SuggestField[], label: string, busyLabel = 'Hazırlanıyor…') => (
    <button
      type="button"
      className="ai-suggest"
      onClick={() => suggest(at, fields)}
      disabled={suggesting !== null}
    >
      <SparkleIcon size={14} className="icon-star" />
      {suggesting === at ? busyLabel : label}
    </button>
  )
  const aiErrorFor = (at: SuggestField | 'more') =>
    aiError?.at === at && (
      <p className="error small" role="alert">
        {aiError.message}
      </p>
    )

  /** Asks the AI for the word's data and fills only the fields the user left empty. */
  const fillWithAi = async () => {
    if (!apiKey || !form.word.trim()) return
    setFilling(true)
    setError('')
    try {
      const result = await enrichWords(apiKey, language, [{ word: form.word.trim() }])
      const info = result.values().next().value
      if (!info) throw new WordInputError('AI bu kelime için sonuç döndürmedi.')
      const ai = wordInfoToInput(info)
      setForm((f) => ({
        ...f,
        word: ai.word || f.word,
        meaning: f.meaning?.trim() ? f.meaning : ai.meaning,
        partOfSpeech: f.partOfSpeech ?? ai.partOfSpeech,
        gender: f.gender ?? ai.gender,
        example: f.example?.trim() ? f.example : ai.example,
        exampleTranslation: f.exampleTranslation?.trim() ? f.exampleTranslation : ai.exampleTranslation,
        collocations: f.collocations?.trim() ? f.collocations : ai.collocations,
        confusables: f.confusables?.trim() ? f.confusables : ai.confusables,
        literal: f.literal?.trim() ? f.literal : ai.literal,
        // The frequency list is measured data; the AI's band is only a fallback for words it lacks.
        frequencyRank: f.frequencyRank || (autoRank === 0 || autoRank === UNRANKED ? ai.frequencyRank : 0),
      }))
      setAiPos({ word: ai.word.trim(), pos: ai.partOfSpeech })
    } catch (err) {
      setError(err instanceof AiError || err instanceof WordInputError ? err.message : 'AI ile doldurulamadı.')
    } finally {
      setFilling(false)
    }
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const withGender = form.gender || !lexGender ? form : { ...form, gender: lexGender }
      const input = posManual ? withGender : { ...withGender, partOfSpeech: autoPos }
      const saved = entry ? updateEntry(entry, input) : createEntry(input, language, new Date())
      if (!entry && listId) {
        const at = parsePlacement(listId)
        if (at.listId) saved.listId = at.listId
        if (at.levelId) saved.levelId = at.levelId
      }
      if (existing.has(wordId(language, saved.lemma)) || (!entry && existing.has(saved.id))) {
        throw new WordInputError(`"${saved.lemma}" zaten listende.`)
      }
      if (image) {
        saved.imageId = await db.addMedia('image', image.blob)
        saved.imageCredit = image.credit
      }
      await db.vocabulary.put(saved)
      if (!entry) {
        setAdded(saved.lemma)
        setJustAdded((list) => [...list, saved])
        setForm(EMPTY)
        setImage(null)
        setPosManual(false)
        setAiPos(null)
        setAiError(null)
        document.getElementById('w-word')?.focus()
      }
      onSaved(saved)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const articleHelp =
    language === 'en' ? 'Örn. decision' : language === 'fr' ? 'İsimleri artikeliyle yaz: la décision' : 'İsimleri artikeliyle yaz: el año'

  return (
    <div className={preview ? 'word-form-layout' : undefined}>
    <form className="stack" onSubmit={submit}>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="w-word">Kelime</label>
            <input id="w-word" className="input" value={form.word} onChange={accentChange(language, (word) => setForm((f) => ({ ...f, word })))} lang={language} autoComplete="off" autoCapitalize="off" autoCorrect="off" spellCheck={false} />
            {conjugated ? (
              // A conjugated form typed (tuve, allions): offer the infinitive, which is what the list keeps.
              <span className="help form-suggest">
                “{form.word.trim()}”, <strong lang={language}>{conjugated.lemma}</strong> fiilinin {TENSE_GUIDE[conjugated.tense].name} biçimi.{' '}
                <button type="button" className="link small" onClick={() => setForm((f) => ({ ...f, word: conjugated.lemma }))}>
                  {conjugated.lemma} ekle
                </button>
              </span>
            ) : (
              <span className="help">{articleHelp}</span>
            )}
          </div>
          <div className="field">
            <label htmlFor="w-meaning">Türkçe anlamı</label>
            <input id="w-meaning" className="input" value={form.meaning} onChange={set('meaning')} autoComplete="off" autoCapitalize="off" />
            {meaningSuggestions.length > 0 ? (
              <div className="meaning-suggest" aria-label="Wiktionary önerileri">
                <span className="help">{trMeanings?.via ? `Wiktionary (“${trMeanings.via}” üzerinden):` : 'Wiktionary:'}</span>
                {meaningSuggestions.map((w) => (
                  <button
                    key={w}
                    type="button"
                    className="chip chip-sm"
                    onClick={() => setForm((f) => ({ ...f, meaning: f.meaning.trim() ? `${f.meaning.trim().replace(/,$/, '')}, ${w}` : w }))}
                  >
                    + {w}
                  </button>
                ))}
              </div>
            ) : (
              <span className="help">Birden fazlaysa virgülle ayır</span>
            )}
          </div>
        </div>
        <div className="grid-2">
          <div className="field">
            <div className="field-head">
              <label htmlFor="w-pos">Tür</label>
              <button
                type="button"
                className="link small"
                onClick={() => {
                  // Switching to manual starts from the current guess, so nothing jumps.
                  if (!posManual) setForm((f) => ({ ...f, partOfSpeech: autoPos }))
                  setPosManual(!posManual)
                }}
              >
                {posManual ? 'Otomatiğe dön' : 'Elle seç'}
              </button>
            </div>
            {posManual ? (
              <Select
                id="w-pos"
                label="Tür"
                value={form.partOfSpeech ?? 'other'}
                options={POS_OPTIONS.map((p) => ({ value: p, label: p === 'other' ? 'Belirtme' : POS_NAME[p] }))}
                onChange={(v) => setForm((f) => ({ ...f, partOfSpeech: v === 'other' ? undefined : v }))}
              />
            ) : (
              <div className="pos-auto" id="w-pos" role="status" aria-live="polite">
                {autoPos ? <strong>{POS_NAME[autoPos]}</strong> : <span className="muted">{form.word.trim() ? 'Tahmin edilemedi' : 'Kelimeyi yazınca belirlenir'}</span>}
                <span className="pos-auto-tag">{fromAi ? 'AI' : fromLexicon ? 'Sözlük' : 'Otomatik'}</span>
              </div>
            )}
          </div>
          {(posManual ? form.partOfSpeech : autoPos) === 'phrase' && (
            <div className="field">
              <label htmlFor="w-literal">Kelimesi kelimesine (isteğe bağlı)</label>
              <input id="w-literal" className="input" value={form.literal ?? ''} onChange={set('literal')} placeholder="avoir le cafard → hamamböceğine sahip olmak" />
              <span className="help">Deyimin harfi harfine anlamı: tuhaf imgesi onu akılda tutmayı kolaylaştırır.</span>
            </div>
          )}
          {needsGender && (
            <div className="field">
              <label htmlFor="w-gender">Cinsiyet</label>
              <Select
                id="w-gender"
                label="Cinsiyet"
                value={form.gender ?? (lexGender === 'm' || lexGender === 'f' ? lexGender : undefined)}
                options={[
                  { value: 'm', label: 'Eril (le)' },
                  { value: 'f', label: 'Dişil (la)' },
                ]}
                onChange={(v) => setForm((f) => ({ ...f, gender: v as Gender }))}
              />
              <span className="help">{!form.gender && (lexGender === 'm' || lexGender === 'f') ? 'Sözlükten (Lexique) dolduruldu' : "l' cinsiyeti göstermediği için gerekli"}</span>
            </div>
          )}
        </div>
        <div className="form-group">
        <span className="form-group-title">Örnek cümle · isteğe bağlı</span>
        <div className="field">
          <div className="field-head">
            <label htmlFor="w-ex">Cümle</label>
            {aiButton('example', ['example'], form.example?.trim() ? 'Başka cümle getir' : 'Cümle getir', 'Cümle yazılıyor…')}
          </div>
          <input id="w-ex" className="input" value={form.example ?? ''} onChange={accentChange(language, (example) => setForm((f) => ({ ...f, example })))} lang={language} />
          <span className="help">
            Bağlam ve boşluk doldurma alıştırmalarını açar. Kelime cümlede farklı biçimdeyse yıldızla işaretle: {EXAMPLES[language].marked}
          </span>
          {aiErrorFor('example')}
        </div>
        <div className="field">
          <label htmlFor="w-ext">Türkçesi</label>
          <input id="w-ext" className="input" value={form.exampleTranslation ?? ''} onChange={set('exampleTranslation')} />
        </div>
        </div>
        {!entry && lists.length > 0 && (
          <div className="field word-form-list">
            <label htmlFor="w-list">Liste</label>
            <Select
              id="w-list"
              label="Liste"
              value={listId || '__none'}
              onChange={(v) => setListId(v === '__none' ? '' : v)}
              options={placementOptions(lists)}
            />
          </div>
        )}
        {!entry && (
          <div className="row">
            {image ? (
              <>
                <img className="thumb" src={image.url} alt="" />
                <button type="button" className="link small" onClick={() => setPicking(true)}>
                  Görseli değiştir
                </button>
                <button type="button" className="link small" onClick={() => setImage(null)}>
                  Kaldır
                </button>
              </>
            ) : (
              <button type="button" className="btn btn-quiet" onClick={() => setPicking(true)} disabled={!form.word.trim()}>
                <ImageIcon size={16} className="inline-icon" />Görsel ekle
              </button>
            )}
          </div>
        )}
        {picking && (
          <ImagePicker
            initialQuery={splitArticle(normalize(form.word), language).rest}
            suggestions={form.meaning.split(/,|\//).map((m) => m.trim()).filter(Boolean)}
            onClose={() => setPicking(false)}
            onPick={(img) => {
              setImage({ ...img, url: URL.createObjectURL(img.blob) })
              setPicking(false)
            }}
          />
        )}
        <details open={moreOpen} onToggle={(e) => setMoreOpen(e.currentTarget.open)}>
          <summary className="small">Daha fazla: not, etiketler, kalıplar ve karıştırılan kelimeler</summary>
          <div className="stack">
            <div className="ai-fill-all">
              {aiButton('more', ['notes', 'tags', 'collocations'], 'Not, etiket ve kalıpları AI ile doldur', 'Dolduruluyor…')}
              {aiErrorFor('more')}
            </div>
            <div className="field">
              <div className="field-head">
                <label htmlFor="w-note">Not / hafıza ipucu</label>
                {aiButton('notes', ['notes'], 'İpucu öner')}
              </div>
              <textarea id="w-note" className="textarea textarea-sm" value={form.notes ?? ''} onChange={set('notes')} placeholder="Nerede gördün, neye benziyor…" />
              {aiErrorFor('notes')}
            </div>
            <div className="field">
              <label htmlFor="w-freq">Sıklık</label>
              <Select
                id="w-freq"
                label="Sıklık"
                value={bandOf(form.frequencyRank)?.id ?? 'unknown'}
                options={[{ value: 'unknown', label: autoBand ? `Otomatik: ${autoBand.label}` : 'Otomatik' }, ...FREQUENCY_BANDS.map((b) => ({ value: b.id, label: b.label }))]}
                onChange={(v) => setForm((f) => ({ ...f, frequencyRank: FREQUENCY_BANDS.find((b) => b.id === v)?.rank ?? 0 }))}
              />
              <span className="help">
                Otomatik değer, alt yazılardan derlenmiş sıklık listesinden gelir (OpenSubtitles, 20.000 kelime). Sık kelimeler daha çok işe yarar; Ayarlar'dan yeni
                kelimeleri sık olanlardan başlatabilirsin.
              </span>
            </div>
            <div className="field">
              <div className="field-head">
                <label htmlFor="w-tags">Etiketler</label>
                {aiButton('tags', ['tags'], 'Etiket öner')}
              </div>
              <input id="w-tags" className="input" value={form.tags ?? ''} onChange={set('tags')} placeholder="iş, seyahat, dizi" />
              <span className="help">Virgülle ayır; kelime listesinde etikete göre filtreleyebilirsin.</span>
              {aiErrorFor('tags')}
            </div>
            <div className="field">
              <div className="field-head">
                <label htmlFor="w-col">Kalıplar (collocation)</label>
                {aiButton('collocations', ['collocations'], 'Kalıp öner')}
              </div>
              <textarea
                id="w-col"
                className="textarea"
                value={form.collocations ?? ''}
                onChange={set('collocations')}
                lang={language}
                placeholder={EXAMPLES[language].collocation}
              />
              <span className="help">Her satıra bir kalıp. Parantez içine sık yapılan yanlışları yazarsan kalıp alıştırması açılır.</span>
              {aiErrorFor('collocations')}
            </div>
            <div className="field">
              <label htmlFor="w-conf">Karıştırılan kelimeler</label>
              <input id="w-conf" className="input" value={form.confusables ?? ''} onChange={set('confusables')} lang={language} autoCapitalize="off" autoCorrect="off" placeholder={EXAMPLES[language].confusable} />
              <span className="help">Listende varsa ayırt etme alıştırması açılır ve ikisi aynı günlerde tanıtılmaz.</span>
            </div>
          </div>
        </details>
        {error && <p className="error" role="alert">{error}</p>}
        {added && !error && (
          <div className="row added-row">
            <p className="notice" role="status">
              "{added}" eklendi.{justAdded.length > 1 && ` Bu oturumda ${justAdded.length} kelime ekledin.`}
            </p>
            {onLearn && justAdded.length > 0 && (
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => {
                  onLearn(justAdded)
                  setJustAdded([])
                }}
              >
                Şimdi öğren{justAdded.length > 1 ? ` (${justAdded.length})` : ''}
              </button>
            )}
          </div>
        )}
        {added && !error && justAdded.length > 0 && <TriLanguageCard key={justAdded.at(-1)!.id} entry={justAdded.at(-1)!} compact onAdded={() => onSaved(justAdded.at(-1)!)} />}
        <div className="row">
          <button className="btn" type="submit">
            {entry ? 'Değişiklikleri kaydet' : 'Kelimeyi ekle'}
          </button>
          {apiKey && (
            <button className="btn btn-quiet" type="button" onClick={fillWithAi} disabled={filling || !form.word.trim()}>
              <SparkleIcon size={18} className="icon-star" />
              {filling ? 'Dolduruluyor…' : 'AI ile doldur'}
            </button>
          )}
          {onCancel && (
            <button className="btn btn-quiet" type="button" onClick={onCancel}>
              Vazgeç
            </button>
          )}
        </div>
    </form>
    {preview && <WordPreview language={language} word={form.word} meaning={form.meaning} pos={posManual ? form.partOfSpeech : autoPos} example={form.example ?? ''} translation={form.exampleTranslation ?? ''} image={image?.url} />}
    </div>
  )
}

/**
 * The word as it will look, filled in as you type: the seed it starts as, its kind, how it reads
 * with its article, the meaning and the example with the word marked.
 */
function WordPreview({ language, word, meaning, pos, example, translation, image }: { language: TargetLanguage; word: string; meaning: string; pos?: PartOfSpeech; example: string; translation: string; image?: string }) {
  const w = word.trim()
  const marked = example.includes('*') ? example.split(/\*([^*]+)\*/) : (() => {
    const i = w ? example.toLowerCase().indexOf(splitArticle(normalize(w).toLocaleLowerCase(language), language).rest || w.toLowerCase()) : -1
    const len = (splitArticle(normalize(w).toLocaleLowerCase(language), language).rest || w).length
    return i >= 0 ? [example.slice(0, i), example.slice(i, i + len), example.slice(i + len)] : [example]
  })()
  return (
    <aside className="word-preview" aria-label="Önizleme">
      <span className="word-preview-kicker small">Önizleme</span>
      <div className="word-preview-card">
        {image && <img className="word-preview-image" src={image} alt="" />}
        <div className="word-preview-head">
          <Plant stage={-1} size={34} />
          {pos && pos !== 'other' && <span className="chip-tag">{POS_NAME[pos]}</span>}
        </div>
        <p className={`word-preview-word${w ? '' : ' is-empty'}`} lang={language}>
          {w || (language === 'fr' ? 'la décision' : language === 'es' ? 'la decisión' : 'decision')}
        </p>
        <p className={`word-preview-meaning${meaning.trim() ? '' : ' is-empty'}`}>{meaning.trim() || 'Türkçe anlamı'}</p>
        {example.trim() && (
          <div className="word-preview-example">
            <p lang={language}>
              {marked.map((part, i) => (i % 2 === 1 ? <mark key={i}>{part}</mark> : <span key={i}>{part.replace(/\*/g, '')}</span>))}
            </p>
            {translation.trim() && <p className="small muted">{translation}</p>}
          </div>
        )}
      </div>
      <p className="small muted">Eklenince tohum olarak başlar; çalıştıkça büyür.</p>
    </aside>
  )
}

// ---------------------------------------------------------------------------

type StageFilter = 'all' | 'waiting' | 'learning' | 'strong' | 'mastered' | 'mistakes' | 'difficult' | 'review'
type Sort = 'newest' | 'alpha' | 'weakest' | 'strongest' | 'frequent' | 'due'
const VIEW_MODE_KEY = 'kelime-koc:words-table'
const GALLERY_KEY = 'kelime-koc:words-gallery'

const STAGE_FILTERS: [StageFilter, string][] = [
  ['all', 'Hepsi'],
  ['waiting', 'Sırada'],
  ['learning', 'Öğreniliyor'],
  ['strong', 'Sağlam'],
  ['mastered', 'Oturdu'],
  ['mistakes', 'Hatalı'],
  ['difficult', 'Zor'],
  ['review', 'Gözden geçir'],
]

function WordThumb({ id }: { id?: string }) {
  const url = useMediaUrl(id)
  return url ? <img className="thumb" src={url} alt="" /> : null
}

/** The picture of a word in the gallery, or its first letter on a tile in the colour of its part of speech. */
function GalleryArt({ entry }: { entry: VocabularyEntry }) {
  const url = useMediaUrl(entry.imageId)
  if (url) return <img className="gallery-art" src={url} alt="" loading="lazy" />
  return (
    <span className="gallery-art gallery-letter" data-pos={entry.partOfSpeech} lang={entry.language} aria-hidden>
      {displayForm(entry).charAt(0).toLocaleUpperCase(entry.language)}
    </span>
  )
}

/** Searchable, filterable word list. */
function WordList({
  vocabulary,
  stateById,
  mistakes,
  onOpen,
  onStudy,
  onDelete,
  onAdd,
  lists = [],
  onMove,
  onMark,
  onSuggestImages,
  pictureTick = 0,
  onRemoveSamples,
}: {
  vocabulary: VocabularyEntry[]
  stateById: Map<string, UserWordState>
  mistakes: Mistake[]
  onOpen: (id: string) => void
  onStudy: (entries: VocabularyEntry[]) => void
  onDelete: (ids: string[]) => Promise<void>
  onAdd: () => void
  lists?: WordListRow[]
  /** Moves words to a list or one of its levels ("list|level"), or out of any ('__none'). */
  onMove?: (ids: string[], placement: string) => Promise<void>
  /** Marks words as hard (or clears the mark). */
  onMark?: (ids: string[], difficult: boolean) => Promise<void>
  /** Opens the picture suggestions for words without one. */
  onSuggestImages?: () => void
  /** Changes when the picture suggestions closed, so words passed over are counted out. */
  pictureTick?: number
  /** Removes the bundled sample words. */
  onRemoveSamples?: () => void
}) {
  // "Now" moves on whenever the words change (after a review), not on every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const now = useMemo(() => new Date(), [stateById])
  const [query, setQuery] = useState('')
  // Selection mode: rows toggle instead of opening; shift-click selects a range.
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [anchor, setAnchor] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [stage, setStage] = useState<StageFilter>('all')
  const [flags, setFlags] = useState<{ picture?: boolean; audio?: boolean; noExample?: boolean; idiom?: boolean }>({})
  const [tag, setTag] = useState('')
  // '' all, '__none' words in no list, otherwise a list id.
  // '' all, '__none' words in no list, a list id, or "list|level".
  const [inList, setInList] = useState('')
  const [sort, setSort] = useState<Sort>('newest')
  const [dense, setDense] = useState(() => getDensity() === 'compact')
  // Table view (wide screens): every word on one line with its numbers, sortable by column.
  const [asTable, setAsTable] = useState(() => {
    try {
      return localStorage.getItem(VIEW_MODE_KEY) === '1'
    } catch {
      return false
    }
  })
  // Gallery: a grid of pictures (or letters) instead of rows; it works on a phone too.
  const [gallery, setGallery] = useState(() => {
    try {
      return localStorage.getItem(GALLERY_KEY) === '1'
    } catch {
      return false
    }
  })
  // List, gallery or table: one choice, remembered.
  const layout: 'list' | 'gallery' | 'table' = gallery ? 'gallery' : asTable ? 'table' : 'list'
  const setLayout = (l: typeof layout) => {
    try {
      localStorage.setItem(GALLERY_KEY, l === 'gallery' ? '1' : '0')
      localStorage.setItem(VIEW_MODE_KEY, l === 'table' ? '1' : '0')
    } catch {
      // Not remembered; fine.
    }
    setGallery(l === 'gallery')
    setAsTable(l === 'table')
  }

  const difficultCount = useMemo(() => vocabulary.filter(isDifficult).length, [vocabulary])
  const reviewCount = useMemo(() => vocabulary.filter((v) => v.review).length, [vocabulary])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const pictureCandidates = useMemo(() => imageCandidates(vocabulary, skippedImages()).length, [vocabulary, pictureTick])
  const withMistakes = useMemo(() => new Set(mistakes.filter((m) => !m.resolved).map((m) => m.entryId)), [mistakes])
  const tags = useMemo(() => [...new Set(vocabulary.flatMap((v) => v.tags))].sort((a, b) => a.localeCompare(b, 'tr')), [vocabulary])
  const list = useMemo(() => {
    const stageIndex = (v: VocabularyEntry) => {
      const st = stateById.get(v.id)
      return st ? MASTERY_STAGES.indexOf(masteryStage(st)) : -1
    }
    const q = query.trim().toLocaleLowerCase('tr')
    const match = (v: VocabularyEntry) => {
      if (q && ![v.lemma, v.senses[0].gloss, ...(v.senses[0].altGlosses ?? []), v.notes ?? ''].some((t) => t.toLocaleLowerCase('tr').includes(q))) return false
      const i = stageIndex(v)
      if (stage === 'waiting' && i !== -1) return false
      if (stage === 'learning' && !(i >= 0 && i <= 2)) return false
      if (stage === 'strong' && !(i === 3 || i === 4)) return false
      if (stage === 'mastered' && i !== 5) return false
      if (stage === 'mistakes' && !withMistakes.has(v.id)) return false
      if (stage === 'difficult' && !v.difficult) return false
      if (stage === 'review' && !v.review) return false
      if (flags.picture && !v.imageId) return false
      if (flags.audio && !v.audioId) return false
      if (flags.noExample && v.senses[0].examples.length > 0) return false
      if (flags.idiom && v.partOfSpeech !== 'phrase') return false
      if (tag && !v.tags.includes(tag)) return false
      if (inList === '__none') {
        if (v.listId && lists.some((l) => l.id === v.listId)) return false
      } else if (inList) {
        const at = parsePlacement(inList)
        if (v.listId !== at.listId || (at.levelId && v.levelId !== at.levelId)) return false
      }
      return true
    }
    const dueKey = (v: VocabularyEntry) => {
      const st = stateById.get(v.id)
      return st ? (nextReviewAt(st)?.getTime() ?? Infinity) : Infinity
    }
    const by: Record<Sort, (a: VocabularyEntry, b: VocabularyEntry) => number> = {
      newest: (a, b) => addedTime(b) - addedTime(a) || a.lemma.localeCompare(b.lemma),
      alpha: (a, b) => a.lemma.localeCompare(b.lemma, 'tr'),
      weakest: (a, b) => stageIndex(a) - stageIndex(b) || (stateById.get(b.id)?.stats.wrong ?? 0) - (stateById.get(a.id)?.stats.wrong ?? 0),
      strongest: (a, b) => stageIndex(b) - stageIndex(a),
      frequent: (a, b) => freqKey(a) - freqKey(b) || a.lemma.localeCompare(b.lemma, 'tr'),
      due: (a, b) => dueKey(a) - dueKey(b) || a.lemma.localeCompare(b.lemma, 'tr'),
    }
    return vocabulary.filter(match).sort(by[sort])
  }, [vocabulary, query, stage, flags, tag, inList, lists, sort, stateById, withMistakes])
  // The word page steps through the list in the order it was last shown here (filters and sort).
  useEffect(() => saveWordOrder(list.map((v) => v.id)), [list])
  // A long list is drawn in pages as it scrolls into view: thousands of rows at once make the
  // page slow to open, and nobody reads past the first few hundred without searching.
  const [limit, setLimit] = useState(ROW_PAGE)
  useEffect(() => setLimit(ROW_PAGE), [list])
  const shown = list.length > limit ? list.slice(0, limit) : list

  const toggle = (k: keyof typeof flags) => setFlags((f) => ({ ...f, [k]: !f[k] }))
  // What the filter panel has set apart from its defaults, for the badge on its button.
  const flagCount = Object.values(flags).filter(Boolean).length
  const activeCount = flagCount + (sort !== 'newest' ? 1 : 0) + (layout !== 'list' ? 1 : 0) + (dense ? 1 : 0) + (tag ? 1 : 0) + (inList ? 1 : 0)
  const clearView = () => {
    setFlags({})
    setSort('newest')
    setLayout('list')
    setTag('')
    setInList('')
    if (dense) {
      setDensity('comfortable')
      setDense(false)
    }
  }

  // Words that disappeared (deleted elsewhere) drop out of the selection.
  const selectedVisible = list.filter((v) => selected.has(v.id))
  const allVisibleSelected = list.length > 0 && selectedVisible.length === list.length

  const exitSelection = () => {
    setSelecting(false)
    setSelected(new Set())
    setAnchor(null)
  }

  const clickRow = (index: number, id: string, shift: boolean) => {
    if (!selecting) return onOpen(id)
    setSelected((prev) => {
      const next = new Set(prev)
      if (shift && anchor !== null) {
        // Range follows the state of the anchor row: select or deselect the whole span.
        const on = prev.has(list[anchor].id)
        const [a, b] = anchor < index ? [anchor, index] : [index, anchor]
        for (let i = a; i <= b; i++) {
          if (on) next.add(list[i].id)
          else next.delete(list[i].id)
        }
      } else if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
    setAnchor(index)
  }

  useEffect(() => {
    if (!selecting) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('[aria-modal="true"]')) exitSelection()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selecting])

  return (
    <section className="section stack">
      {vocabulary.length === 0 ? (
        <EmptyState
          art="garden"
          title="Bahçen ekilmeyi bekliyor"
          action={
            <button className="btn" onClick={onAdd}>
              <PlusIcon size={18} /> İlk kelimeni ekle
            </button>
          }
        >
          Her kelime bir tohum: çalıştıkça büyür, çiçek açar. Tek tek ekleyebilir ya da bir listeyi yapıştırabilirsin.
        </EmptyState>
      ) : (
        <>
          <div className="words-bar">
            <div className="search">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" aria-hidden>
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input type="search" enterKeyHint="search" autoCapitalize="off" autoCorrect="off" className="input" placeholder="Kelime, anlam ya da not ara" aria-label="Kelime ara" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <button className={`btn ${selecting ? '' : 'btn-quiet'}`} onClick={() => (selecting ? exitSelection() : setSelecting(true))}>
              {selecting ? 'Bitti' : 'Seç'}
            </button>
            <Popover
              label="Filtrele ve görünüm"
              align="end"
              buttonClassName={`btn btn-quiet filter-btn${activeCount ? ' has-active' : ''}`}
              buttonProps={{ 'aria-label': activeCount ? `Filtrele ve görünüm, ${activeCount} etkin` : 'Filtrele ve görünüm' }}
              button={
                <>
                  <SlidersIcon size={18} />
                  <span className="filter-btn-text">Filtrele</span>
                  {activeCount > 0 && <span className="filter-count" aria-hidden>{activeCount}</span>}
                </>
              }
            >
              {(close) => (
                <>
                  <div className="panel-group">
                    <span className="panel-label">Görünüm</span>
                    <div className="segmented" role="group" aria-label="Görünüm biçimi">
                      <button className="segmented-btn" aria-pressed={layout === 'list'} onClick={() => setLayout('list')}>
                        Liste
                      </button>
                      <button className="segmented-btn" aria-pressed={layout === 'gallery'} onClick={() => setLayout('gallery')}>
                        Galeri
                      </button>
                      <button className="segmented-btn desktop-only" aria-pressed={layout === 'table'} onClick={() => setLayout('table')}>
                        Tablo
                      </button>
                    </div>
                    <button
                      type="button"
                      className="chip chip-sm density-toggle"
                      aria-pressed={dense}
                      onClick={() => {
                        setDensity(dense ? 'comfortable' : 'compact')
                        setDense(!dense)
                      }}
                      title="Satırları sıklaştır"
                    >
                      Yoğun satırlar
                    </button>
                  </div>
                  <div className="panel-group">
                    <span className="panel-label">Sırala</span>
                    <Select<Sort>
                      label="Sırala"
                      value={sort}
                      onChange={setSort}
                      options={[
                        { value: 'newest', label: 'En yeni' },
                        { value: 'alpha', label: 'Alfabetik' },
                        { value: 'weakest', label: 'En zayıf önce' },
                        { value: 'strongest', label: 'En güçlü önce' },
                        { value: 'frequent', label: 'En sık önce' },
                        { value: 'due', label: 'Tekrarı en yakın' },
                      ]}
                    />
                  </div>
                  {(lists.length > 0 || tags.length > 0) && (
                    <div className="panel-group">
                      <span className="panel-label">Liste ve etiket</span>
                      {lists.length > 0 && (
                        <Select
                          label="Liste"
                          value={inList || '__all'}
                          onChange={(v) => setInList(v === '__all' ? '' : v)}
                          options={[{ value: '__all', label: 'Tüm listeler' }, ...placementOptions(lists)]}
                        />
                      )}
                      {tags.length > 0 && (
                        <Select
                          label="Etiket"
                          value={tag || '__all'}
                          onChange={(v) => setTag(v === '__all' ? '' : v)}
                          options={[{ value: '__all', label: 'Tüm etiketler' }, ...tags.map((t) => ({ value: t, label: `#${t}` }))]}
                        />
                      )}
                    </div>
                  )}
                  <div className="panel-group">
                    <span className="panel-label">Sadece olanlar</span>
                    <div className="panel-choices">
                      <button className="chip chip-sm" aria-pressed={!!flags.picture} onClick={() => toggle('picture')}>
                        <ImageIcon size={14} className="inline-icon" />Resimli
                      </button>
                      <button className="chip chip-sm" aria-pressed={!!flags.audio} onClick={() => toggle('audio')}>
                        <MicIcon size={14} className="inline-icon" />Sesli
                      </button>
                      <button className="chip chip-sm" aria-pressed={!!flags.noExample} onClick={() => toggle('noExample')}>
                        Örneksiz
                      </button>
                      <button className="chip chip-sm" aria-pressed={!!flags.idiom} onClick={() => toggle('idiom')}>
                        Deyimler
                      </button>
                    </div>
                  </div>
                  {(onSuggestImages && pictureCandidates > 0) || activeCount > 0 ? (
                    <div className="panel-group panel-actions">
                      {onSuggestImages && pictureCandidates > 0 && (
                        <button
                          type="button"
                          className="btn btn-sm btn-quiet"
                          onClick={() => {
                            close()
                            onSuggestImages()
                          }}
                        >
                          <ImageIcon size={14} className="inline-icon" />Görsel öner ({pictureCandidates})
                        </button>
                      )}
                      {activeCount > 0 && (
                        <button type="button" className="link small" onClick={clearView}>
                          Hepsini sıfırla
                        </button>
                      )}
                    </div>
                  ) : null}
                </>
              )}
            </Popover>
          </div>
          <div className="choice-row filter-row stage-row" role="group" aria-label="Aşama">
            {STAGE_FILTERS.filter(([v]) => (v !== 'difficult' || difficultCount > 0 || stage === 'difficult') && (v !== 'review' || reviewCount > 0 || stage === 'review')).map(([v, label]) => (
              <button key={v} className="chip chip-sm" aria-pressed={stage === v} onClick={() => setStage(v)}>
                {v === 'difficult' && <BoltIcon size={14} className="inline-icon" />}
                {label}
                {v === 'difficult' && ` (${difficultCount})`}
                {v === 'review' && ` (${reviewCount})`}
              </button>
            ))}
          </div>
          {onRemoveSamples && !selecting && stage === 'all' && !query && activeCount === 0 && (
            <p className="small muted sample-note">
              Bunlar denemek için yüklenen örnek kelimeler.{' '}
              <button type="button" className="link small" onClick={onRemoveSamples}>
                Örnekleri kaldır
              </button>
            </p>
          )}
          {selecting && (
            <div className="select-bar" role="toolbar" aria-label="Seçim">
              <label className="row gap-2 pointer">
                <input
                  type="checkbox"
                  checked={allVisibleSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = selectedVisible.length > 0 && !allVisibleSelected
                  }}
                  onChange={() => setSelected(allVisibleSelected ? new Set() : new Set(list.map((v) => v.id)))}
                />
                <strong>{selectedVisible.length} seçili</strong>
              </label>
              <span className="small muted">Shift + tık: aralık seç</span>
              <span className="grow" />
              <button className="btn btn-quiet" disabled={!selectedVisible.length} onClick={() => onStudy(selectedVisible)}>
                Seçilenleri çalış
              </button>
              {onMark && (
                <button
                  className="btn btn-quiet"
                  disabled={!selectedVisible.length}
                  onClick={async () => {
                    // All marked already: this unmarks them; otherwise it marks the rest.
                    const on = selectedVisible.some((v) => !v.difficult)
                    await onMark(selectedVisible.map((v) => v.id), on)
                    exitSelection()
                  }}
                >
                  <BoltIcon size={16} className="inline-icon" />
                  {selectedVisible.length && selectedVisible.every((v) => v.difficult) ? 'Zor işaretini kaldır' : 'Zor işaretle'}
                </button>
              )}
              {onMove && lists.length > 0 && (
                <div className="select-bar-move">
                  <Select
                    label="Listeye taşı"
                    value={undefined}
                    placeholder="Listeye taşı"
                    onChange={async (v) => {
                      if (!selectedVisible.length) return
                      await onMove(selectedVisible.map((x) => x.id), v)
                      exitSelection()
                    }}
                    options={placementOptions(lists, 'Listeden çıkar')}
                  />
                </div>
              )}
              <button
                className="btn btn-bad"
                disabled={!selectedVisible.length || deleting}
                onClick={async () => {
                  setDeleting(true)
                  await onDelete(selectedVisible.map((v) => v.id))
                  setDeleting(false)
                  exitSelection()
                }}
              >
                Sil ({selectedVisible.length})
              </button>
            </div>
          )}
          {!selecting && list.length > 0 && list.length < vocabulary.length && (
            <div className="deck-bar">
              <span>
                {stage === 'difficult' ? <strong>Zor kelimelerin</strong> : tag ? <strong>#{tag}</strong> : inList && inList !== '__none' ? <strong>{placementOptions(lists).find((o) => o.value === inList)?.label}</strong> : 'Filtrelenmiş liste'}: {list.length} kelime
              </span>
              <button className="btn" onClick={() => onStudy(list)}>
                Bu listeyi çalış
              </button>
            </div>
          )}
          {list.length === 0 ? (
            <EmptyState
              art="search"
              title="Bu aramaya uyan kelime yok"
              action={
                <button
                  className="btn btn-quiet"
                  onClick={() => {
                    setQuery('')
                    setStage('all')
                    setFlags({})
                    setTag('')
                  }}
                >
                  Filtreleri temizle
                </button>
              }
            >
              Aramayı kısalt ya da filtrelerden birini kaldır.
            </EmptyState>
          ) : gallery ? (
            <ul className="word-gallery">
              {shown.map((v, index) => {
                const isSel = selected.has(v.id)
                return (
                  <li key={v.id}>
                    <button className={`gallery-tile${isSel ? ' is-selected' : ''}`} onClick={(e) => clickRow(index, v.id, e.shiftKey)} aria-pressed={selecting ? isSel : undefined}>
                      <GalleryArt entry={v} />
                      {selecting && <span className={`row-check gallery-check${isSel ? ' is-on' : ''}`} aria-hidden>{isSel && <CheckIcon size={13} />}</span>}
                      <span className="w">
                        <WordLabel entry={v} />
                      </span>
                      <span className="meta">{v.senses[0].gloss}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : (
            asTable ? (
              <div className="table-wrap">
                <table className="word-table">
                  <thead>
                    <tr>
                      {selecting && <th aria-label="Seç" />}
                      <SortTh label="Kelime" active={sort === 'alpha'} onClick={() => setSort('alpha')} />
                      <th scope="col">Anlam</th>
                      <SortTh label="Aşama" active={sort === 'strongest' || sort === 'weakest'} onClick={() => setSort(sort === 'strongest' ? 'weakest' : 'strongest')} />
                      <SortTh label="Sıradaki tekrar" active={sort === 'due'} onClick={() => setSort('due')} />
                      <th scope="col" className="num">Doğru / yanlış</th>
                      <SortTh label="Sıklık" active={sort === 'frequent'} onClick={() => setSort('frequent')} />
                    </tr>
                  </thead>
                  <tbody>
                    {shown.map((v, index) => {
                      const st = stateById.get(v.id)
                      const isSel = selected.has(v.id)
                      const due = st && nextReviewAt(st)
                      return (
                        <tr key={v.id} className={isSel ? 'is-selected' : ''} onClick={(e) => clickRow(index, v.id, e.shiftKey)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && clickRow(index, v.id, e.shiftKey)}>
                          {selecting && (
                            <td>
                              <span className={`row-check${isSel ? ' is-on' : ''}`} aria-hidden>
                                {isSel && <CheckIcon size={13} />}
                              </span>
                            </td>
                          )}
                          <td className="w">
                            <WordLabel entry={v} />
                            {withMistakes.has(v.id) && <span className="pill pill-bad">hata</span>}
                          </td>
                          <td className="muted">{v.senses[0].gloss}</td>
                          <td>
                            <span className="table-stage">
                              <Plant stage={growthStage(st)} health={plantHealth(st, scheduler, now)} size={22} />
                              {st ? STAGE_NAME[masteryStage(st)] : 'Sırada'}
                            </span>
                          </td>
                          <td className="muted">{due ? relativeTime(due) : '—'}</td>
                          <td className="num">{st ? `${st.stats.correct} / ${st.stats.wrong}` : '—'}</td>
                          <td className="muted">{v.source !== 'sample' && bandOf(v.frequencyRank) ? bandOf(v.frequencyRank)!.short : '—'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
            <ul className="word-list is-columns">
              {shown.map((v, index) => {
                const st = stateById.get(v.id)
                const isSel = selected.has(v.id)
                const due = st && !st.retired ? nextReviewAt(st) : undefined
                return (
                  <li key={v.id} className={isSel ? 'is-selected' : ''}>
                    <button
                      className="word-row"
                      onClick={(e) => clickRow(index, v.id, e.shiftKey)}
                      aria-pressed={selecting ? isSel : undefined}
                    >
                      {selecting && <span className={`row-check${isSel ? ' is-on' : ''}`} aria-hidden>{isSel && <CheckIcon size={13} />}</span>}
                      <span className="word-row-plant" title={st ? STAGE_NAME[masteryStage(st)] : 'Sırada'}>
                        <Plant stage={growthStage(st)} health={plantHealth(st, scheduler, now)} size={30} />
                      </span>
                      <WordThumb id={v.imageId} />
                      <span className="word-row-text">
                        <span className="w">
                          <WordLabel entry={v} />
                        </span>
                        <span className="meta">
                          {v.senses[0].gloss}
                          {v.partOfSpeech !== 'other' && (
                            <>
                              {' · '}
                              <PosTag pos={v.partOfSpeech} label />
                            </>
                          )}
                          {v.source !== 'sample' && bandOf(v.frequencyRank) && `, ${bandOf(v.frequencyRank)!.short}`}
                          {v.audioId && <MicIcon size={12} className="inline-icon is-end" />}
                          {v.tags.length > 0 && ` · ${v.tags.map((t) => `#${t}`).join(' ')}`}
                        </span>
                      </span>
                      {withMistakes.has(v.id) && <span className="pill pill-bad">hata</span>}
                      {/* When the word comes back: the one thing a list row can't otherwise tell. */}
                      {st && <span className={`word-row-due${due && due.getTime() <= now.getTime() ? ' is-due' : ''}`}>{due ? dueShort(due, now) : 'emekli'}</span>}
                    </button>
                  </li>
                )
              })}
            </ul>
            )
          )}
          {list.length > limit && <MoreRows left={list.length - limit} onMore={() => setLimit((l) => l + ROW_PAGE)} />}
        </>
      )}
    </section>
  )
}

const ROW_PAGE = 300

/** The rest of a long list: loads by itself when it scrolls into view, or with a click. */
function MoreRows({ left, onMore }: { left: number; onMore: () => void }) {
  const ref = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && onMore(), { rootMargin: '400px' })
    io.observe(el)
    return () => io.disconnect()
  }, [onMore])
  return (
    <button ref={ref} type="button" className="btn btn-quiet btn-block more-rows" onClick={onMore}>
      {left} kelime daha göster
    </button>
  )
}

/** "bugün", "yarın", "5 gün", "12 Kas": short enough for the end of a list row. */
function dueShort(d: Date, now: Date): string {
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diff = Math.round((day(d) - day(now)) / 86_400_000)
  if (diff <= 0) return 'bugün'
  if (diff === 1) return 'yarın'
  if (diff < 30) return `${diff} gün`
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' })
}

/** A table header that sorts by its column. */
function SortTh({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <th scope="col" aria-sort={active ? 'ascending' : undefined}>
      <button type="button" className={`th-sort${active ? ' is-active' : ''}`} onClick={onClick}>
        {label}
        {active && <span aria-hidden> ↓</span>}
      </button>
    </th>
  )
}
