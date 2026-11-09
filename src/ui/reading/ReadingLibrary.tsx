import type { Dispatch, SetStateAction } from 'react'
import { AudiobooksPicker } from './AudiobooksPicker'
import { AdvancedReadingsPicker } from './AdvancedReadingsPicker'
import { ContentReadingsPicker } from './ContentReadingsPicker'
import { contentReadingText, contentTextId } from '../../data/content'
import { ClassicsPicker } from './ClassicsPicker'
import { ListeningPicker } from './Listening'
import { NewsPicker } from './News'
import { StorybooksPicker } from './StorybooksPicker'
import { WikipediaPicker } from './WikipediaPicker'
import { BookIcon, PlayIcon, CloseIcon, LinkIcon } from '../shared/icons'
import { showToast } from '../shared/toastFeed'
import { chapterToReadingText } from '../../data/audiobooks'
import { storyCredit } from '../../data/storybooks'
import type { KelimeDB, ReadingText } from '../../data/db'
import { isYoutubeLink } from './readingImport'
import type { TargetLanguage, UserWordState, VocabularyEntry } from '../../engine/types'
import { Cover } from './ReadingBooks'
import { OfflineAudioChip } from './OfflineAudioChip'
import { ADD_ART } from '../shared/drawnArt'
import { PhotoText } from './PhotoText'

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
  fileBusy,
  bookError,
  onPhotoText,
  videoFor,
  onDropVideo,
  timedLines,
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
  /** Fetch the link in the field, or the one just pasted into it. */
  onFetchYoutube: (link?: string) => void
  ytBusy: boolean
  /** A Word or PDF file is being read. */
  fileBusy?: boolean
  bookError: { ok: boolean; text: string } | null
  /** Text read off photos goes into the draft. */
  onPhotoText?: (text: string, title: string) => void
  /** A video whose transcript could not be brought: the text pasted next is tied to it. */
  videoFor?: string | null
  onDropVideo?: () => void
  /** How many timed lines the draft holds (a pasted transcript, a subtitle file). */
  timedLines?: number
}) {
  return (
    <details className="card add-text" open={startOpen}>
      <summary>Kendi metnini ekle: yapıştır, dosya (PDF, Word, EPUB), fotoğraf ya da bağlantı</summary>
      <div className="stack mt-3">
      <input className="input" value={title} onChange={(e) => onTitle(e.target.value)} placeholder="Başlık (isteğe bağlı)" aria-label="Başlık" />
      <textarea className="textarea reading-draft-textarea" lang={language} aria-label="Metin" placeholder={videoFor ? 'Videonun transkriptini buraya yapıştır…' : 'Metni buraya yapıştır…'} value={draft} onChange={(e) => onDraft(e.target.value)} />
      {!!timedLines && draft.trim() && (
        <p className="small muted" role="status">
          {timedLines} satır zamanlarıyla tanındı{videoFor ? ': okurken video metnin üstünde, söylenen cümle yanarak açılır.' : '.'}
        </p>
      )}
      <div className="row">
        <button className="btn" onClick={onStart} disabled={!draft.trim()}>
          Okumaya başla
        </button>
      </div>
      <p className="small muted">ya da başka bir kaynaktan:</p>
      <div className="add-sources">
        <label className={`btn btn-quiet file-btn${fileBusy ? ' file-btn-off' : ''}`} aria-busy={fileBusy || undefined}>
          <img className="chip-art" src={ADD_ART.notes} alt="" width={20} height={20} draggable={false} />
          <span>{fileBusy ? 'Dosya okunuyor…' : 'Dosya (PDF, Word, metin, alt yazı)'}</span>
          <input
            type="file"
            aria-label="Dosya (PDF, Word, metin, alt yazı)"
            accept=".pdf,application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.srt,.vtt,.txt,text/plain"
            disabled={fileBusy}
            onChange={(e) => {
              const file = e.target.files?.[0]
              e.target.value = ''
              if (file) onFile(file)
            }}
          />
        </label>
        <label className="btn btn-quiet file-btn">
          <img className="chip-art" src={ADD_ART.ebook} alt="" width={20} height={20} draggable={false} />Kitap (EPUB)
          <input type="file" accept=".epub,application/epub+zip" onChange={(e) => e.target.files?.[0] && onBook(e.target.files[0])} />
        </label>
        {onPhotoText && <PhotoText language={language} onText={onPhotoText} />}
      </div>
      <form
        className="add-youtube"
        onSubmit={(e) => {
          e.preventDefault()
          onFetchYoutube()
        }}
      >
        <input
          className="input"
          value={youtube}
          onChange={(e) => onYoutube(e.target.value)}
          // A pasted link is fetched at once: the transcript or the page's text opens without another tap.
          onPaste={(e) => {
            const link = e.clipboardData.getData('text').trim()
            if (!/^https?:\/\/\S+$/i.test(link) || ytBusy) return
            e.preventDefault()
            onFetchYoutube(link)
          }}
          placeholder="Web sayfası ya da YouTube bağlantısı" aria-label="Web sayfası ya da YouTube bağlantısı" inputMode="url" />
        <button className="btn btn-quiet" type="submit" disabled={!youtube.trim() || ytBusy}>
          {ytBusy ? 'Getiriliyor…' : isYoutubeLink(youtube) ? <><img className="chip-art" src={ADD_ART.video} alt="" width={20} height={20} draggable={false} />Altyazıyı getir</> : <><LinkIcon size={18} />Metni getir</>}
        </button>
      </form>
      <p className="small muted">Bağlantıyı yapıştırman yeter: videonun altyazısı ya da sayfanın yazısı kendiliğinden gelir ve okuma açılır. Yalnızca yazı alınır ve yalnızca senin kütüphanende durur; kendi okuman için, başkalarıyla paylaşmak için değil.</p>
      {videoFor && (
        <div className="note stack transcript-help" role="status">
          <strong>Transkripti kendin ekleyebilirsin</strong>
          <ol className="small">
            <li>YouTube'da videoyu aç; açıklamanın altındaki “Transkripti göster”e bas (bilgisayarda en kolayı).</li>
            <li>Transkriptin hepsini seçip kopyala (zamanlarıyla birlikte).</li>
            <li>Yukarıdaki metin kutusuna yapıştır ve “Okumaya başla”: zamanlar tanınır, video metnin üstünde açılır.</li>
          </ol>
          {onDropVideo && (
            <button type="button" className="link small" onClick={onDropVideo}>
              Bu videodan vazgeç
            </button>
          )}
        </div>
      )}
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
    <ContentReadingsPicker
      language={language}
      vocabulary={vocabulary}
      states={states}
      known={known}
      onRead={async (text) => {
        // Opened before: the same entry, with its reading history and marks.
        const had = (library ?? []).find((t) => t.id === contentTextId(text.id))
        if (had) return void (await open(had))
        const item = contentReadingText(text)
        await db.saveText(item)
        setLibrary((lib) => [item, ...(lib ?? [])])
        await open(item)
      }}
    />
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
    <AdvancedReadingsPicker
      language={language}
      vocabulary={vocabulary}
      states={states}
      known={known}
      onRead={async (advTitle, advText, source) => {
        const item: ReadingText = { id: crypto.randomUUID(), language, title: advTitle, text: advText, source, addedAt: new Date().toISOString(), history: [] }
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
