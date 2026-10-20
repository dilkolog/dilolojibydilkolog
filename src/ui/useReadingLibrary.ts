import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

import { titleOf, type KelimeDB, type ReadingText } from '../data/db'
import { reportError } from '../data/errorReport'
import { type TargetLanguage } from '../engine/types'
import type { SharedRead } from './incoming'
import { importEpub, textOfFile, youtubeText } from './readingImport'
import { undoable } from './toastFeed'

/** What the reader's own state takes from a library that has just loaded: the open text and the words marked before. */
export interface LoadedLibrary {
  open: ReadingText | null
  known: Set<string>
  ignored: Set<string>
}

/**
 * The reading library: the texts of a language, the one open, the add card's fields (pasted text, subtitle file,
 * book, YouTube link) and everything that adds, opens or removes a text. The reader's own state (words marked,
 * the word card…) stays in the screen: it is reset through `onOpened` and filled through `onLoaded`.
 */
export function useReadingLibrary({
  db,
  language,
  shared,
  setMessage,
  onLoaded,
  onOpened,
}: {
  db: KelimeDB
  language: TargetLanguage
  shared?: SharedRead
  setMessage: (message: string) => void
  onLoaded: (loaded: LoadedLibrary) => void
  onOpened: (item: ReadingText | null) => void
}) {
  const [library, setLibrary] = useState<ReadingText[] | null>(null)
  const [current, setCurrent] = useState<ReadingText | null>(null)
  const [draft, setDraft] = useState(shared?.text ?? '')
  const [title, setTitle] = useState(shared?.title ?? '')
  const [youtube, setYoutube] = useState(shared?.url && !shared.text ? shared.url : '')
  const [ytBusy, setYtBusy] = useState(false)
  const [bookError, setBookError] = useState<{ ok: boolean; text: string } | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)

  // The callbacks are the screen's own and change every render; the load effect only reruns for a new language.
  const callbacks = useRef({ onLoaded, onOpened })
  useLayoutEffect(() => {
    callbacks.current = { onLoaded, onOpened }
  })

  useEffect(() => {
    Promise.all([db.getLibrary(language), db.getCurrentText(language), db.getKnownWords(language), db.getIgnored(language)])
      .then(([lib, id, known, ignored]) => {
        setLibrary(lib)
        const open = lib.find((t) => t.id === id) ?? null
        setCurrent(open)
        callbacks.current.onLoaded({ open, known, ignored })
      })
      // Whatever goes wrong in loading, the screen still opens (with a note), never blank.
      .catch((e) => {
        reportError(e, 'reading-load')
        setLoadFailed(true)
        setLibrary((l) => l ?? [])
      })
  }, [db, language])

  const open = async (item: ReadingText | null) => {
    await db.setCurrentText(language, item?.id ?? null)
    setCurrent(item)
    callbacks.current.onOpened(item)
  }

  const start = async () => {
    const t = draft.trim()
    if (!t) return
    const item: ReadingText = { id: crypto.randomUUID(), language, title: title.trim() || titleOf(t), text: t, addedAt: new Date().toISOString(), history: [] }
    await db.saveText(item)
    setLibrary((lib) => [item, ...(lib ?? [])])
    setDraft('')
    setTitle('')
    await open(item)
  }

  /** A subtitle (.srt/.vtt) or plain-text file goes into the draft; subtitles are cleaned up first. */
  const loadFile = async (file: File) => {
    const loaded = textOfFile(file.name, await file.text())
    setDraft(loaded.text)
    setTitle(loaded.title)
  }

  /** An EPUB becomes one library entry per chapter, read in order. */
  const importBook = async (file: File) => {
    setMessage('')
    setBookError(null)
    const { note, texts, forThisLanguage } = await importEpub(db, file, language)
    if (forThisLanguage) setLibrary((lib) => [...texts, ...(lib ?? [])])
    setBookError(note)
  }

  /** A YouTube video's subtitles in this language, as a reading text with a link back to the video. */
  const importYoutube = async () => {
    setBookError(null)
    setYtBusy(true)
    try {
      const got = await youtubeText(youtube, language)
      if ('note' in got) {
        setBookError(got.note)
        return
      }
      await db.saveText(got.item)
      setLibrary((lib) => [got.item, ...(lib ?? [])])
      setYoutube('')
      await open(got.item)
    } catch {
      setBookError({ ok: false, text: 'Altyazı alınamadı; internet bağlantını kontrol et.' })
    } finally {
      setYtBusy(false)
    }
  }

  const restore = useCallback(
    async (items: ReadingText[]) => {
      await db.restoreTexts(items)
      setLibrary(await db.getLibrary(language))
    },
    [db, language],
  )

  const removeBook = async (bookId: string) => {
    const chapters = (library ?? []).filter((t) => t.book?.id === bookId)
    await db.deleteBook(bookId)
    setLibrary((lib) => (lib ?? []).filter((t) => t.book?.id !== bookId))
    undoable(`${chapters[0]?.book?.title ?? 'Kitap'} silindi`, () => restore(chapters))
  }

  const remove = async (item: ReadingText) => {
    await db.deleteText(item.id)
    setLibrary((lib) => (lib ?? []).filter((t) => t.id !== item.id))
    undoable(`“${item.title}” silindi`, () => restore([item]))
  }

  /** The next chapter of the current book, if any. */
  const nextChapter = current?.book ? (library ?? []).find((t) => t.book?.id === current.book!.id && t.book.index === current.book!.index + 1) : undefined

  return {
    library, setLibrary, current, setCurrent,
    draft, setDraft, title, setTitle, youtube, setYoutube, ytBusy, bookError, loadFailed,
    open, start, loadFile, importBook, importYoutube, removeBook, remove, nextChapter,
  }
}
