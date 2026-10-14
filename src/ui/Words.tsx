import '../lazy.css'
import { useEffect, useMemo, useState } from 'react'
import type { Mistake, TargetLanguage, UserWordState, VocabularyEntry, WordList as WordListRow } from '../engine/types'
import { showToast } from './toastFeed'
import type { KelimeDB } from '../data/db'
import { SAMPLE_WORDS } from '../data/seed'
import { markWord, wordKeys } from '../data/wordInput'
import { ChevronLeftIcon, GlobeIcon, PlusIcon } from './icons'
import { BulkImport } from './BulkImport'
import { ConceptsView } from './CrossLanguage'
import { ListHealthCard } from './ListHealth'
import { FillMissingBar } from './FillMissing'
import { SuggestWords } from './SuggestWords'
import { TranslateImport } from './TranslateImport'
import { MissingWords } from './MissingWords'
import { KindleImport } from './KindleImport'
import { GardenView, WORDS_VIEW_KEY } from './Garden'
import { deleteWordsWithUndo } from './undo'
import { TextImport } from './TextImport'
import { CommunitySets } from './CommunitySets'
import type { IncomingWord } from './incoming'
import { WordGraph } from './WordGraph'
import { LANGUAGE_NAME } from './labels'
import { PageHeader } from './PageHeader'
import { WordListsView } from './WordLists'
import { ListPage } from './ListPage'
import { UNLISTED, listWords, unlistedWords } from '../engine/lists'
import { getCollabs } from '../data/share'
import type { GameId } from './gameList'
import { placementOptions, parsePlacement } from './listOptions'
import { withDifficult } from '../engine/difficult'
import { MenuItem, Popover } from './Popover'
import { ImageQueue } from './ImageQueue'
import { WordForm } from './WordForm'
import { WordList } from './WordListView'
import { newListId } from './wordListId'

export { WordForm }

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
  /** The list whose own page is open (a list id, or UNLISTED for the words in none). */
  openList?: string
  onOpenList?: (listId: string | null) => void
  /** Opens a game (already set to the open list). */
  onPlay?: (game: GameId) => void
}

const hostOf = (url: string) => {
  try {
    return new URL(url).hostname
  } catch {
    return ''
  }
}

const SECTION_KEY = 'kelime-koc:words-section'
/** The same empty list on every render, so effects that follow the lists don't run again each time. */
const NO_LISTS: WordListRow[] = []

export function WordsScreen({ db, language, vocabulary, states, mistakes, onChanged, onOpen, onStudy, incoming, onIncomingDone, lists = NO_LISTS, focusListId, onFocus = () => {}, openList, onOpenList = () => {}, onPlay }: Props) {
  const stateById = useMemo(() => new Map(states.map((s) => [s.entryId, s])), [states])
  const ids = useMemo(() => new Set(vocabulary.map((v) => v.id)), [vocabulary])
  const keys = useMemo(() => wordKeys(vocabulary), [vocabulary])
  const [view, setViewState] = useState<'list' | 'lists' | 'garden' | 'graph' | 'concepts'>(() => {
    try {
      const v = localStorage.getItem(WORDS_VIEW_KEY)
      if (v === 'list' || v === 'lists' || v === 'garden' || v === 'graph' || v === 'concepts') return v
    } catch {
      // Not remembered: the lists first, as long as there are some.
    }
    return lists.length > 0 ? 'lists' : 'list'
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
  // The open list's page: the list, null for the words in no list, undefined when none is open
  // (or the list is gone: deleted here or on another device).
  const shownList: WordListRow | null | undefined = openList === UNLISTED ? null : lists.find((l) => l.id === openList)
  const [collabIds, setCollabIds] = useState<ReadonlySet<string>>(new Set())
  useEffect(() => {
    let live = true
    void getCollabs(db).then((links) => live && setCollabIds(new Set(links.map((l) => l.listId))))
    return () => {
      live = false
    }
  }, [db, lists])

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

  // The word list: all the words, or one list's on its own page.
  const wordList = (scoped: VocabularyEntry[], scope: string) => (
    <WordList
      key={scope}
      language={language}
      vocabulary={scoped}
      stateById={stateById}
      mistakes={mistakes}
      onOpen={onOpen}
      onStudy={onStudy}
      onDelete={(ids) => deleteWordsWithUndo(ids, `${ids.length} kelime silindi`, onChanged)}
      onAdd={goAdd}
      lists={lists}
      onSuggestImages={() => setSuggestingImages(true)}
      pictureTick={pictureTick}
      onRemoveSamples={hasSamples && scope === 'all' ? removeSamples : undefined}
      listFilter={scope === 'all'}
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
        showToast(name ? `${ids.length} kelime "${name}" listesine eklendi.` : `${ids.length} kelime listeden çıkarıldı.`)
      }}
      onNewList={async (ids, name) => {
        const now = new Date().toISOString()
        const list: WordListRow = { id: newListId(), language, name, levels: [], createdAt: now, updatedAt: now }
        await db.saveList(list)
        await db.assignList(ids, list.id, null)
        onChanged()
        showToast(`${ids.length} kelime yeni "${name}" listesine eklendi.`)
      }}
    />
  )

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
          <CommunitySets language={language} onAdded={onChanged} />
          <MissingWords db={db} language={language} vocabulary={vocabulary} onAdded={onChanged} />
          <SuggestWords db={db} language={language} vocabulary={vocabulary} settings={undefined} onAdded={onChanged} />
        </section>
        </section>
      )}

      {section === 'words' && shownList !== undefined && (
        <>
          <button type="button" className="link back-link" onClick={() => onOpenList(null)}>
            <ChevronLeftIcon size={16} className="inline-icon" /> Listeler
          </button>
          <ListPage
            key={openList}
            db={db}
            language={language}
            list={shownList}
            lists={lists}
            vocabulary={vocabulary}
            states={states}
            focusListId={focusListId}
            onFocus={onFocus}
            onListsChanged={onChanged}
            onOpen={onOpen}
            onStudy={onStudy}
            onPlay={onPlay}
            onAdd={goAdd}
            onBack={() => onOpenList(null)}
          >
            {wordList(shownList ? listWords(shownList, vocabulary) : unlistedWords(vocabulary, lists), openList!)}
          </ListPage>
        </>
      )}

      {section === 'words' && shownList === undefined && (
        <>
          <section className="section stack">
            <FillMissingBar db={db} vocabulary={vocabulary} onChanged={onChanged} />
            <ListHealthCard db={db} vocabulary={vocabulary} states={states} mistakes={mistakes} onChanged={onChanged} onOpen={onOpen} />
        <div className="segmented" role="tablist" aria-label="Görünüm">
          <button role="tab" className="segmented-btn" aria-selected={view === 'lists'} onClick={() => setView('lists')}>
            Listeler
          </button>
          <button role="tab" className="segmented-btn" aria-selected={view === 'list'} onClick={() => setView('list')}>
            Tümü
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
        wordList(vocabulary, 'all')
      ) : view === 'lists' ? (
        <WordListsView
          db={db}
          language={language}
          lists={lists}
          vocabulary={vocabulary}
          states={states}
          focusListId={focusListId}
          onListsChanged={onChanged}
          onOpenList={onOpenList}
          collabIds={collabIds}
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
