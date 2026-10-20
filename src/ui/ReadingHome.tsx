import type { Dispatch, SetStateAction } from 'react'
import type { KelimeDB, ReadingText } from '../data/db'
import type { TargetLanguage, UserWordState, VocabularyEntry } from '../engine/types'
import { DailyNewsHero } from './DailyNewsHero'
import { EmptyState } from './EmptyState'
import { ExternalResources } from './ExternalResources'
import { KnownWordsCard } from './KnownWords'
import { LANGUAGE_NAME } from './labels'
import { PageHeader } from './PageHeader'
import { PlusIcon } from './icons'
import { BookItem } from './ReadingBooks'
import { groupBooks } from './readingHelpers'
import { AddTextCard, LibraryItem, SourcePickers } from './ReadingLibrary'

/**
 * The reading home, when no text is open: the daily news, the library (books by chapter, texts with where they
 * stand), the add-a-text card and the sources to pick a text from.
 */
export function ReadingHome({
  db,
  language,
  vocabulary,
  states,
  known,
  library,
  setLibrary,
  previews,
  loadFailed,
  shared,
  open,
  remove,
  removeBook,
  title,
  onTitle,
  draft,
  onDraft,
  onStart,
  onFile,
  onBook,
  youtube,
  onYoutube,
  onFetchYoutube,
  ytBusy,
  bookError,
}: {
  db: KelimeDB
  language: TargetLanguage
  vocabulary: VocabularyEntry[]
  states: UserWordState[]
  known: Set<string>
  library: ReadingText[]
  setLibrary: Dispatch<SetStateAction<ReadingText[] | null>>
  previews: ReadonlyMap<string, string>
  loadFailed: boolean
  /** Something shared to the app: the add card opens with it ready. */
  shared: boolean
  open: (item: ReadingText | null) => Promise<void> | void
  remove: (item: ReadingText) => void
  removeBook: (bookId: string) => void
  title: string
  onTitle: (v: string) => void
  draft: string
  onDraft: (v: string) => void
  onStart: () => void
  onFile: (f: File) => void
  onBook: (f: File) => void
  youtube: string
  onYoutube: (v: string) => void
  onFetchYoutube: () => void
  ytBusy: boolean
  bookError: { ok: boolean; text: string } | null
}) {
  const now = Date.now()
  return (
    <div className="stack">
      <PageHeader
        art="read"
        title="Okuma"
        sub={`${LANGUAGE_NAME[language]} metinlerde ne kadarını bildiğini gör, bilmediklerini kelimelerine ekle.`}
        // With an empty library the form below is already open: one way in, not three.
        action={
          library.length > 0 ? (
            <button
              className="btn"
              onClick={() => {
                const add = document.querySelector<HTMLDetailsElement>('details.add-text')
                if (add) {
                  add.open = true
                  add.scrollIntoView({ behavior: 'smooth', block: 'start' })
                }
              }}
            >
              <PlusIcon size={18} /> Metin ekle
            </button>
          ) : undefined
        }
      />
      {loadFailed && <p className="note">Kütüphanen şu an okunamadı; metinlerin silinmedi. Sayfayı yenile; düzelmezse haber ver.</p>}
      <KnownWordsCard db={db} language={language} vocabulary={vocabulary} states={states} />
      <DailyNewsHero db={db} language={language} vocabulary={vocabulary} states={states} known={known} onOpen={open} />
      {library.length === 0 && (
        <EmptyState art="shelf" title="Kütüphanen boş">
          Bir haber, kitaptan bir bölüm ya da bir videonun alt yazısı: ne kadarını bildiğini görürsün, bilmediklerini kelimelerine eklersin. Aşağıdan ilk metnini ekle veya klasik masallar ve öyküler koleksiyonundan başla.
        </EmptyState>
      )}
      {library.length > 0 && (
        <section className="section stack">
          <h2 className="section-title">Kütüphanen: kaldığın yerden devam et</h2>
          <ul className="library">
            {groupBooks(library).map((group) =>
              'chapters' in group ? (
                <BookItem
                  key={group.id}
                  title={group.title}
                  chapters={group.chapters}
                  language={language}
                  vocabulary={vocabulary}
                  states={states}
                  known={known}
                  onOpen={open}
                  onRemove={() => removeBook(group.id)}
                />
              ) : (
                <LibraryItem key={group.id} item={group} now={now} preview={previews.get(group.id)} onOpen={open} onRemove={remove} />
              ),
            )}
          </ul>
        </section>
      )}
      <AddTextCard
        language={language}
        startOpen={!library.length || !!shared}
        title={title}
        onTitle={onTitle}
        draft={draft}
        onDraft={onDraft}
        onStart={onStart}
        onFile={onFile}
        onBook={onBook}
        youtube={youtube}
        onYoutube={onYoutube}
        onFetchYoutube={onFetchYoutube}
        ytBusy={ytBusy}
        bookError={bookError}
      />
      <SourcePickers db={db} language={language} vocabulary={vocabulary} states={states} known={known} library={library} setLibrary={setLibrary} open={open} />
      <ExternalResources language={language} />
    </div>
  )
}
