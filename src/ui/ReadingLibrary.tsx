import type { Dispatch, SetStateAction } from 'react'
import { AudiobooksPicker } from './AudiobooksPicker'
import { ClassicsPicker } from './ClassicsPicker'
import { ListeningPicker } from './Listening'
import { NewsPicker } from './News'
import { StorybooksPicker } from './StorybooksPicker'
import { WikipediaPicker } from './WikipediaPicker'
import { BookIcon, PlayIcon, CloseIcon } from './icons'
import { showToast } from './toastFeed'
import { chapterToReadingText } from '../data/audiobooks'
import { storyCredit } from '../data/storybooks'
import type { KelimeDB, ReadingText } from '../data/db'
import type { TargetLanguage, UserWordState, VocabularyEntry } from '../engine/types'
import { Cover } from './ReadingBooks'
import { OfflineAudioChip } from './OfflineAudioChip'

/** Days after finishing a text when re-reading it is suggested. */
const REREAD_DAYS = 7

/** One text of the library: cover, title, length, when it was last read, and the share known then. */
export function LibraryItem({ item, now, preview, onOpen, onRemove }: { item: ReadingText; now: number; /** Where the text stands for the reader now (see `coverageLine`); the last reading's share shows without it. */ preview?: string; onOpen: (t: ReadingText) => void; onRemove: (t: ReadingText) => void }) {
  const last = item.history.at(-1)
  const since = item.readAt ? Math.floor((now - new Date(item.readAt).getTime()) / 86_400_000) : null
  const reread = since !== null && since >= REREAD_DAYS
  const words = item.text.split(/\s+/).length
  const status = reread ? 'Tekrar oku' : since === null ? 'Yeni' : 'Okundu'
  return (
    <li className="lib-card">
              <button className="lib-open" onClick={() => onOpen(item)}>
                <Cover title={item.title} />
                <span className="lib-body">
                  <strong className="lib-title">
                    {/* A video is marked with the play icon (older titles carried a ▶️ emoji; it is dropped). */}
                    {item.source?.includes('youtube.com') && <PlayIcon size={14} className="inline-icon lib-video" />}
                    {item.title.replace(/^▶️?\s*/u, '')}
                  </strong>
                  <span className="small muted">
                    {words} kelime · ~{Math.max(1, Math.round(words / 150))} dk
                    {since !== null && ` · ${since === 0 ? 'bugün' : `${since} gün önce`}`}
                  </span>
                  {preview && <span className="small muted">{preview}</span>}
                  <span className={`pill lib-status is-${status === 'Tekrar oku' ? 'reread' : status === 'Yeni' ? 'new' : 'done'}`}>{status}</span>
                </span>
                {last && (
                  <span className="lib-ring" style={{ ['--p' as string]: `${Math.round(last.coverage * 100)}%` }} title={`Son okumada kelimelerin %${Math.round(last.coverage * 100)}'ini biliyordun`}>
                    %{Math.round(last.coverage * 100)}
                  </span>
                )}
              </button>
              {item.audio && <OfflineAudioChip url={item.audio} />}
              <button className="icon-btn lib-remove" onClick={() => onRemove(item)} aria-label={`${item.title} sil`}>
                <CloseIcon size={16} />
              </button>
            </li>
  )
}

/** Paste a text, load a file or a book, or fetch a YouTube video's subtitles. */
export function AddTextCard({
  language,
  startOpen,
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
  language: TargetLanguage
  startOpen: boolean
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
  return (
    <details className="card add-text" open={startOpen}>
      <summary>Kendi metnini ekle: yapıştır, dosya, kitap (EPUB) ya da YouTube</summary>
      <div className="stack mt-3">
      <input className="input" value={title} onChange={(e) => onTitle(e.target.value)} placeholder="Başlık (isteğe bağlı)" aria-label="Başlık" />
      <textarea className="textarea reading-draft-textarea" lang={language} aria-label="Metin" placeholder="Metni buraya yapıştır…" value={draft} onChange={(e) => onDraft(e.target.value)} />
      <div className="row">
        <button className="btn" onClick={onStart} disabled={!draft.trim()}>
          Okumaya başla
        </button>
      </div>
      <p className="small muted">ya da başka bir kaynaktan:</p>
      <div className="add-sources">
        <label className="btn btn-quiet file-btn">
          Alt yazı ya da metin dosyası
          <input type="file" accept=".srt,.vtt,.txt,text/plain" onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        </label>
        <label className="btn btn-quiet file-btn">
          <BookIcon size={16} className="inline-icon" />Kitap (EPUB)
          <input type="file" accept=".epub,application/epub+zip" onChange={(e) => e.target.files?.[0] && onBook(e.target.files[0])} />
        </label>
      </div>
      <form
        className="add-youtube"
        onSubmit={(e) => {
          e.preventDefault()
          onFetchYoutube()
        }}
      >
        <input className="input" value={youtube} onChange={(e) => onYoutube(e.target.value)} placeholder="YouTube bağlantısı" aria-label="YouTube bağlantısı" inputMode="url" />
        <button className="btn btn-quiet" type="submit" disabled={!youtube.trim() || ytBusy}>
          {ytBusy ? 'Getiriliyor…' : <><PlayIcon size={14} className="inline-icon" />Altyazıyı getir</>}
        </button>
      </form>
      {bookError && (
        <p className={bookError.ok ? 'notice' : 'error'} role="status">
          {bookError.ok && <BookIcon size={16} className="inline-icon" />}
          {bookError.text}
        </p>
      )}
      </div>
    </details>
  )
}

/** Ready-made sources side by side: learner programmes, podcasts, news, Wikipedia and the classics. */
export function SourcePickers({
  db,
  language,
  vocabulary,
  states,
  known,
  library,
  setLibrary,
  open,
}: {
  db: KelimeDB
  language: TargetLanguage
  vocabulary: VocabularyEntry[]
  states: UserWordState[]
  known: Set<string>
  library: ReadingText[] | null
  setLibrary: Dispatch<SetStateAction<ReadingText[] | null>>
  open: (t: ReadingText) => Promise<void> | void
}) {
  return (
    <div className="source-tiles">
    <StorybooksPicker
      language={language}
      vocabulary={vocabulary}
      states={states}
      known={known}
      onRead={async (story) => {
        // Opened before: the same text, with its reading history.
        const had = (library ?? []).find((t) => t.source === story.url)
        if (had) return void (await open(had))
        const item: ReadingText = {
          id: crypto.randomUUID(),
          language,
          title: story.title,
          text: story.pages.join('\n\n'),
          audio: story.audio,
          source: story.url,
          credit: storyCredit(story),
          images: story.images,
          ...(story.turkish ? { turkish: story.turkish } : {}),
          addedAt: new Date().toISOString(),
          history: [],
        }
        await db.saveText(item)
        setLibrary((lib) => [item, ...(lib ?? [])])
        await open(item)
      }}
    />
    <AudiobooksPicker
      language={language}
      vocabulary={vocabulary}
      states={states}
      known={known}
      onRead={async (chapter) => {
        // Opened before: the same text, with its reading history.
        const had = (library ?? []).find((t) => t.id === chapter.id)
        if (had) return void (await open(had))
        const item = chapterToReadingText(chapter)
        await db.saveText(item)
        setLibrary((lib) => [item, ...(lib ?? [])])
        await open(item)
      }}
    />
    <ListeningPicker
      language={language}
      vocabulary={vocabulary}
      states={states}
      known={known}
      onOpen={async (episode) => {
        const item: ReadingText = {
          id: crypto.randomUUID(),
          language,
          title: episode.title,
          text: episode.text,
          audio: episode.audio,
          ...(episode.cues?.length ? { cues: episode.cues } : {}),
          addedAt: new Date().toISOString(),
          history: [],
        }
        await db.saveText(item)
        setLibrary((lib) => [item, ...(lib ?? [])])
        await open(item)
      }}
    />
    <NewsPicker
      language={language}
      vocabulary={vocabulary}
      states={states}
      known={known}
      onRead={async (newsTitle, newsText, extra) => {
        const item: ReadingText = {
          id: crypto.randomUUID(),
          language,
          title: newsTitle,
          text: newsText,
          ...(extra?.audio ? { audio: extra.audio } : {}),
          ...(extra?.source ? { source: extra.source } : {}),
          addedAt: new Date().toISOString(),
          history: [],
        }
        await db.saveText(item)
        setLibrary((lib) => [item, ...(lib ?? [])])
        await open(item)
      }}
    />
    <WikipediaPicker
      language={language}
      vocabulary={vocabulary}
      states={states}
      known={known}
      onRead={async (wikiTitle, wikiText) => {
        const item: ReadingText = { id: crypto.randomUUID(), language, title: wikiTitle, text: wikiText, addedAt: new Date().toISOString(), history: [] }
        await db.saveText(item)
        setLibrary((lib) => [item, ...(lib ?? [])])
        await open(item)
      }}
    />
    <ClassicsPicker
      language={language}
      vocabulary={vocabulary}
      states={states}
      known={known}
      onRead={async (classicTitle, classicText, source) => {
        const item: ReadingText = {
          id: crypto.randomUUID(),
          language,
          title: classicTitle,
          text: classicText,
          source,
          addedAt: new Date().toISOString(),
          history: [],
        }
        await db.saveText(item)
        setLibrary((lib) => [item, ...(lib ?? [])])
        await open(item)
      }}
      onAddAll={async (items) => {
        const now = new Date().toISOString()
        const existingTitles = new Set((library ?? []).map((t) => t.title))
        const newTexts: ReadingText[] = items
          .filter((c) => !existingTitles.has(c.title))
          .map((c) => ({
            id: crypto.randomUUID(),
            language,
            title: c.title,
            text: c.text,
            source: `Klasik Koleksiyon: ${c.author}`,
            addedAt: now,
            history: [],
          }))
        if (newTexts.length > 0) {
          await db.saveTexts(newTexts)
          setLibrary((lib) => [...newTexts, ...(lib ?? [])])
          showToast(`${newTexts.length} klasik metin kütüphanene eklendi.`)
        } else {
          showToast('Bu klasikler zaten kütüphanende var.')
        }
      }}
    />
    </div>
  )
}
