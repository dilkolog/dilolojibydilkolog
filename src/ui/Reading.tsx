import { useEffect, useMemo, useState } from 'react'
import { WikipediaPicker } from './WikipediaPicker'
import { cleanToken } from '../engine/extract'
import { growthStage } from '../engine/growth'
import { KnownWordsCard } from './KnownWords'
import { KeyWordsCard } from './KeyWords'
import { PrequestionsCard } from './Prequestions'
import { saveSentence } from './Sentences'
import { analyzeText, coverageZone, finishReading, type CoverageZone, type ReadStatus, type ReadToken } from '../engine/reading'
import { TARGET_LANGUAGES, type TargetLanguage, type UserWordState, type VocabularyEntry } from '../engine/types'
import { titleOf, type KelimeDB, type ReadingText } from '../data/db'
import { looksLikeSubtitles, parseSubtitles } from '../engine/subtitles'
import { NewsPicker, SameTopic } from './News'
import { AudioPanel, ListeningPicker } from './Listening'
import { markWord, wordKeys } from '../data/wordInput'
import { ConfirmDialog } from './Dialog'
import { LANGUAGE_NAME } from './labels'
import { WordForm } from './Words'
import { showToast, undoable } from './toast'
import { EmptyState } from './EmptyState'
import { PageHeader } from './PageHeader'
import { useTenses } from './ConjugationTable'
import { TENSE_GUIDE } from '../engine/tenseGuide'
import { analyzeForm, subjectLabel } from '../engine/tenses'
import { normalize } from '../engine/answerCheck'
import { loadFrequency } from '../data/frequency'
import { BookIcon, CheckCircleIcon, CheckIcon, ChevronDownIcon, MessageIcon, PlayIcon, PlusIcon } from './icons'
import { ReaderControls, readerStyle, useReaderPrefs } from './readerPrefs'

const ZONE: Record<CoverageZone, { title: string; text: string }> = {
  easy: { title: 'Rahat okuma', text: 'Neredeyse her kelimeyi biliyorsun: akıcılık için ideal. Yeni kelime için biraz daha zor bir metin seçebilirsin.' },
  ideal: { title: 'Öğrenmek için ideal', text: 'Bilmediğin kelimeleri bağlamdan çıkarabileceğin aralıktasın (%95–98).' },
  hard: { title: 'Zorlayıcı', text: 'Bağlamdan anlam çıkarmak zorlaşıyor. Önce işaretli kelimelere bak, sonra oku.' },
  too_hard: { title: 'Çok zor', text: 'Bu metin şu an çoğunlukla çözümleme olur. Daha kolay bir metin seçmek daha verimli.' },
}

/** Days after finishing a text when re-reading it is suggested. */
const REREAD_DAYS = 7

const STATUS_TEXT: Record<ReadStatus, string> = {
  known: 'Bildiğin bir kelime.',
  learning: 'Listende, öğreniyorsun.',
  new: 'Listende, henüz çalışmadın.',
  unseen: 'Bu kelimeyi daha önce işaretlemedin.',
  name: 'Özel isim ya da yok saydığın bir kelime; hesaba katılmıyor.',
}

interface Selected {
  token: ReadToken
  sentence: string
}

/**
 * Reading mode: paste a text, see how much of it you know, mark or add the words you don't,
 * and finish to grow your known-word set.
 */
export function ReadingScreen({
  db,
  language,
  vocabulary,
  states,
  onChanged,
  onOpen,
  onStudy,
}: {
  db: KelimeDB
  language: TargetLanguage
  vocabulary: VocabularyEntry[]
  states: UserWordState[]
  onChanged: () => void
  onOpen: (entryId: string) => void
  onStudy?: (entries: VocabularyEntry[]) => void
}) {
  const [library, setLibrary] = useState<ReadingText[] | null>(null)
  const [current, setCurrent] = useState<ReadingText | null>(null)
  const text = current?.text ?? ''
  const [draft, setDraft] = useState('')
  const [title, setTitle] = useState('')
  // Coverage when this reading started: saved with the text on finishing, to show progress.
  const [startCoverage, setStartCoverage] = useState<number | null>(null)
  const [known, setKnown] = useState<Set<string>>(new Set())
  const [ignored, setIgnored] = useState<Set<string>>(new Set())
  // Words the reader left open on purpose: they don't become known when the text is finished.
  const [skipped, setSkipped] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<Selected | null>(null)
  const [adding, setAdding] = useState<{ word: string; sentence: string } | null>(null)
  const [confirmFinish, setConfirmFinish] = useState(false)
  const [message, setMessage] = useState('')
  const [bookError, setBookError] = useState<{ ok: boolean; text: string } | null>(null)
  const [reader, setReader] = useReaderPrefs()
  // Several words picked at once (⌘/Ctrl+click or multi-select mode), marked in one go.
  const [multi, setMulti] = useState<Set<string>>(new Set())
  const [multiMode, setMultiMode] = useState(false)
  const toggleMulti = (key: string) =>
    setMulti((m) => {
      const next = new Set(m)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  const markMulti = async (how: 'known' | 'skip' | 'ignore') => {
    const keys = [...multi]
    if (how === 'known') {
      await db.addKnownWords(language, keys)
      setKnown((k) => new Set([...k, ...keys]))
    } else if (how === 'skip') setSkipped((s) => new Set([...s, ...keys]))
    else {
      for (const k of keys) await db.setIgnored(language, k, true)
      setIgnored((s) => new Set([...s, ...keys]))
    }
    showToast(`${keys.length} kelime işaretlendi`)
    setMulti(new Set())
  }
  useEffect(() => {
    if (!multi.size) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMulti(new Set())
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [multi.size])
  const [youtube, setYoutube] = useState('')
  const [ytBusy, setYtBusy] = useState(false)
  // Listening episodes start with the text hidden: listen first, then read.
  const [listenFirst, setListenFirst] = useState(false)
  // The coverage card opens to its explanations on request.
  const [covOpen, setCovOpen] = useState(false)
  // Verb tables, so a tapped conjugated form can say which verb and tense it is; word frequency to
  // put the likely verb first (allions: aller before allier).
  useTenses(language)
  const [freq, setFreq] = useState<ReadonlyMap<string, number>>(new Map())
  useEffect(() => {
    let live = true
    void loadFrequency(language).then((m) => live && setFreq(m))
    return () => {
      live = false
    }
  }, [language])

  useEffect(() => {
    Promise.all([db.getLibrary(language), db.getCurrentText(language), db.getKnownWords(language), db.getIgnored(language)]).then(([lib, id, k, ig]) => {
      setLibrary(lib)
      const open = lib.find((t) => t.id === id) ?? null
      setCurrent(open)
      // A listening episode not read yet resumes in listen-first mode.
      setListenFirst(!!open?.audio && !open.readAt)
      setKnown(k)
      setIgnored(ig)
    })
  }, [db, language])

  const analysis = useMemo(() => (text ? analyzeText(text, language, vocabulary, states, known, ignored) : null), [text, language, vocabulary, states, known, ignored])
  /** List words shaded by how far along they are (LingQ's 1–4): new words strongest, nearly learned faint. */
  const shade = useMemo(() => {
    const byEntry = new Map(states.map((s) => [s.entryId, growthStage(s)]))
    return (entryId: string | undefined) => {
      const stage = entryId ? (byEntry.get(entryId) ?? -1) : -1
      return stage <= 1 ? 'lv-a' : stage <= 3 ? 'lv-b' : 'lv-c'
    }
  }, [states])
  /** Words still open in the text, in reading order, for "next word" (one per key). */
  const openTokens = useMemo(() => {
    const out: Selected[] = []
    const seen = new Set<string>()
    for (const p of analysis?.paragraphs ?? []) for (const s of p) for (const t of s.tokens) {
      if (t.key && t.status === 'unseen' && !seen.has(t.key)) {
        seen.add(t.key)
        out.push({ token: t, sentence: s.text })
      }
    }
    return out
  }, [analysis])
  const existing = useMemo(() => wordKeys(vocabulary), [vocabulary])
  const byId = useMemo(() => new Map(vocabulary.map((v) => [v.id, v])), [vocabulary])

  useEffect(() => {
    if (analysis) setStartCoverage((c) => c ?? analysis.coverage)
  }, [analysis])

  const open = async (item: ReadingText | null) => {
    await db.setCurrentText(language, item?.id ?? null)
    setCurrent(item)
    setStartCoverage(null)
    setSkipped(new Set())
    setSelected(null)
    setAdding(null)
    setMessage('')
    setMulti(new Set())
    // A new listening episode opens with its text hidden; one already read shows it.
    setListenFirst(!!item?.audio && !item.readAt)
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
    const raw = await file.text()
    setDraft(looksLikeSubtitles(raw) || /\.(srt|vtt)$/i.test(file.name) ? parseSubtitles(raw) : raw)
    setTitle(file.name.replace(/\.[^.]+$/, '').replace(/[._]+/g, ' '))
  }

  /** An EPUB becomes one library entry per chapter, read in order. */
  const importBook = async (file: File) => {
    setMessage('')
    setBookError(null)
    try {
      const { parseEpub } = await import('../data/epub')
      const book = parseEpub(new Uint8Array(await file.arrayBuffer()))
      const lang = (TARGET_LANGUAGES as readonly string[]).includes(book.language ?? '') ? (book.language as TargetLanguage) : language
      const id = crypto.randomUUID()
      const addedAt = new Date().toISOString()
      const texts: ReadingText[] = book.chapters.map((c, index) => ({
        id: crypto.randomUUID(),
        language: lang,
        title: c.title,
        text: c.text,
        addedAt,
        history: [],
        book: { id, title: book.title, index, total: book.chapters.length },
      }))
      await db.saveTexts(texts)
      if (lang === language) setLibrary((lib) => [...texts, ...(lib ?? [])])
      setBookError({
        ok: true,
        text:
          lang === language
            ? `${book.title}: ${texts.length} bölüm kütüphanene eklendi.`
            : `${book.title} ${LANGUAGE_NAME[lang]} bir kitap; ${LANGUAGE_NAME[lang]} kütüphanene eklendi (${texts.length} bölüm).`,
      })
    } catch (e) {
      // Our own errors explain the problem; anything else is a file we couldn't read.
      setBookError({ ok: false, text: e instanceof Error && e.name === 'EpubError' ? e.message : 'Kitap okunamadı.' })
    }
  }

  /** A YouTube video's subtitles in this language, as a reading text with a link back to the video. */
  const importYoutube = async () => {
    setBookError(null)
    setYtBusy(true)
    try {
      const res = await fetch(`/api/youtube?v=${encodeURIComponent(youtube.trim())}&lang=${language}`)
      const j = (await res.json()) as { id?: string; title?: string; channel?: string; auto?: boolean; text?: string; error?: string; available?: string[] }
      if (!res.ok || !j.text) {
        setBookError({
          ok: false,
          text:
            j.error === 'no captions'
            ? `Bu videoda ${LANGUAGE_NAME[language]} altyazı yok${j.available?.length ? ` (olanlar: ${j.available.join(', ')})` : ''}.`
            : j.error === 'bad request'
              ? 'Bağlantı bir YouTube videosu gibi görünmüyor.'
              : 'Altyazı alınamadı; YouTube şu an izin vermiyor olabilir. Altyazıyı .srt olarak indirip yükleyebilirsin.',
        })
        return
      }
      const item: ReadingText = {
        id: crypto.randomUUID(),
        language,
        title: `${j.title}${j.auto ? ' (otomatik altyazı)' : ''}`,
        text: j.text,
        source: `https://www.youtube.com/watch?v=${j.id}`,
        addedAt: new Date().toISOString(),
        history: [],
      }
      await db.saveText(item)
      setLibrary((lib) => [item, ...(lib ?? [])])
      setYoutube('')
      await open(item)
    } catch {
      setBookError({ ok: false, text: 'Altyazı alınamadı; internet bağlantını kontrol et.' })
    } finally {
      setYtBusy(false)
    }
  }

  const removeBook = async (bookId: string) => {
    const chapters = (library ?? []).filter((t) => t.book?.id === bookId)
    await db.deleteBook(bookId)
    setLibrary((lib) => (lib ?? []).filter((t) => t.book?.id !== bookId))
    undoable(`${chapters[0]?.book?.title ?? 'Kitap'} silindi`, () => restore(chapters))
  }

  const restore = async (items: ReadingText[]) => {
    await db.restoreTexts(items)
    setLibrary(await db.getLibrary(language))
  }

  /** The next chapter of the current book, if any. */
  const nextChapter = current?.book ? (library ?? []).find((t) => t.book?.id === current.book!.id && t.book.index === current.book!.index + 1) : undefined

  /** Keeps the whole sentence as a sentence card, with the word it was saved for. */
  const keepSentence = async (sentence: string, focus: string) => {
    const ok = await saveSentence({ language, text: sentence, focus, source: current?.title })
    showToast(ok ? 'Cümle kaydedildi: Oyunlar → Cümle kartları' : 'Bu cümle zaten kayıtlı', undefined, 3500, ok ? 'success' : 'info')
  }

  const remove = async (item: ReadingText) => {
    await db.deleteText(item.id)
    setLibrary((lib) => (lib ?? []).filter((t) => t.id !== item.id))
    undoable(`“${item.title}” silindi`, () => restore([item]))
  }

  /** After deciding about a word, move on to the next open one, as in LingQ. */
  const advance = (fromKey: string, step = 1) => {
    const keys = openTokens.map((x) => x.token.key)
    const i = keys.indexOf(fromKey)
    const pool = openTokens.filter((x) => x.token.key !== fromKey && !skipped.has(x.token.key!))
    if (!pool.length) return setSelected(null)
    const next = step > 0 ? (openTokens.slice(i + 1).find((x) => pool.includes(x)) ?? pool[0]) : ([...openTokens.slice(0, Math.max(0, i))].reverse().find((x) => pool.includes(x)) ?? pool.at(-1)!)
    setSelected(next)
    document.querySelector(`[data-key="${CSS.escape(next.token.key!)}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }

  const markKnown = async (key: string) => {
    await db.addKnownWords(language, [key])
    setKnown((k) => new Set(k).add(key))
    advance(key)
  }

  const toggleIgnored = async (key: string, on: boolean) => {
    await db.setIgnored(language, key, on)
    setIgnored((s) => {
      const next = new Set(s)
      if (on) next.add(key)
      else next.delete(key)
      return next
    })
    if (on) advance(key)
    else setSelected(null)
  }

  const skip = (key: string) => {
    setSkipped((s) => new Set(s).add(key))
    advance(key)
  }

  // Keys while a word is open: B biliyorum, E ekle, Y yok say, G geç, ←/→ previous/next word.
  useEffect(() => {
    if (!selected?.token.key || adding) return
    const key = selected.token.key
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.metaKey || e.ctrlKey || e.altKey) return
      const listed = !!selected.token.entryId
      const k = e.key.toLocaleLowerCase('tr')
      if (k === 'escape') setSelected(null)
      else if (k === 'arrowright') advance(key)
      else if (k === 'arrowleft') advance(key, -1)
      else if (listed) return
      else if (k === 'b' && selected.token.status !== 'known') void markKnown(key)
      else if (k === 'e') {
        // A conjugated verb goes on the list as its infinitive.
        const w = cleanToken(selected.token.text, language)
        setAdding({ word: analyzeForm(language, w)[0]?.lemma ?? w.toLocaleLowerCase(language), sentence: selected.sentence })
      }
      else if (k === 'y') void toggleIgnored(key, !ignored.has(key))
      else if (k === 'g' && selected.token.status === 'unseen') skip(key)
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const markUnknown = async (key: string) => {
    await db.removeKnownWord(language, key)
    setKnown((k) => {
      const next = new Set(k)
      next.delete(key)
      return next
    })
    setSkipped((s) => new Set(s).add(key))
    setSelected(null)
  }

  const finish = async () => {
    if (!analysis) return
    const { knownKeys, encounters } = finishReading(analysis, skipped)
    await db.addKnownWords(language, knownKeys)
    await db.addEncounters(encounters)
    setKnown(await db.getKnownWords(language))
    if (current) {
      const updated: ReadingText = {
        ...current,
        readAt: new Date().toISOString(),
        history: [...current.history, { at: new Date().toISOString(), coverage: startCoverage ?? analysis.coverage }],
      }
      await db.saveText(updated)
      setCurrent(updated)
      setLibrary((lib) => (lib ?? []).map((t) => (t.id === updated.id ? updated : t)))
    }
    setConfirmFinish(false)
    const met = Object.keys(encounters).length
    setMessage(`${knownKeys.length} kelime bilinen kelimelerine eklendi${met ? `, listendeki ${met} kelimeyle bir kez daha karşılaştın` : ''}.`)
    onChanged()
  }

  if (library === null) return null

  if (!text || !analysis) {
    const now = Date.now()
    const renderText = (item: ReadingText) => {
      const last = item.history.at(-1)
      const since = item.readAt ? Math.floor((now - new Date(item.readAt).getTime()) / 86_400_000) : null
      const reread = since !== null && since >= REREAD_DAYS
      const words = item.text.split(/\s+/).length
      const status = reread ? 'Tekrar oku' : since === null ? 'Yeni' : 'Okundu'
      return (
        <li key={item.id} className="lib-card">
          <button className="lib-open" onClick={() => open(item)}>
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
              <span className={`pill lib-status is-${status === 'Tekrar oku' ? 'reread' : status === 'Yeni' ? 'new' : 'done'}`}>{status}</span>
            </span>
            {last && (
              <span className="lib-ring" style={{ ['--p' as string]: `${Math.round(last.coverage * 100)}%` }} title={`Son okumada kelimelerin %${Math.round(last.coverage * 100)}'ini biliyordun`}>
                %{Math.round(last.coverage * 100)}
              </span>
            )}
          </button>
          <button className="icon-btn lib-remove" onClick={() => remove(item)} aria-label={`${item.title} sil`}>
            ×
          </button>
        </li>
      )
    }
    return (
      <div className="stack">
        <PageHeader
          title="Okuma"
          sub={`${LANGUAGE_NAME[language]} metinlerde ne kadarını bildiğini gör, bilmediklerini listene ekle.`}
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
        <KnownWordsCard db={db} language={language} vocabulary={vocabulary} states={states} />
        {library.length === 0 && (
          <EmptyState art="library" title="Kütüphanen boş">
            Bir haber, kitaptan bir bölüm ya da bir videonun alt yazısı: ne kadarını bildiğini görürsün, bilmediklerini listene eklersin. Aşağıdan ilk metnini ekle.
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
                  renderText(group)
                ),
              )}
            </ul>
          </section>
        )}
        <details className="card add-text" open={!library.length}>
          <summary>Kendi metnini ekle: yapıştır, dosya, kitap (EPUB) ya da YouTube</summary>
          <div className="stack mt-3">
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Başlık (isteğe bağlı)" aria-label="Başlık" />
          <textarea className="textarea" style={{ minHeight: '14rem' }} lang={language} aria-label="Metin" placeholder="Metni buraya yapıştır…" value={draft} onChange={(e) => setDraft(e.target.value)} />
          <div className="row">
            <button className="btn" onClick={start} disabled={!draft.trim()}>
              Okumaya başla
            </button>
          </div>
          <p className="small muted">ya da başka bir kaynaktan:</p>
          <div className="add-sources">
            <label className="btn btn-quiet file-btn">
              Alt yazı ya da metin dosyası
              <input type="file" accept=".srt,.vtt,.txt,text/plain" onChange={(e) => e.target.files?.[0] && loadFile(e.target.files[0])} />
            </label>
            <label className="btn btn-quiet file-btn">
              <BookIcon size={16} className="inline-icon" />Kitap (EPUB)
              <input type="file" accept=".epub,application/epub+zip" onChange={(e) => e.target.files?.[0] && importBook(e.target.files[0])} />
            </label>
          </div>
          <form
            className="add-youtube"
            onSubmit={(e) => {
              e.preventDefault()
              void importYoutube()
            }}
          >
            <input className="input" value={youtube} onChange={(e) => setYoutube(e.target.value)} placeholder="YouTube bağlantısı" aria-label="YouTube bağlantısı" inputMode="url" />
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
        {/* Ready-made sources side by side: learner programmes and today's news. */}
        <div className="source-tiles">
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
          onRead={async (newsTitle, newsText) => {
            const item: ReadingText = { id: crypto.randomUUID(), language, title: newsTitle, text: newsText, addedAt: new Date().toISOString(), history: [] }
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
        </div>
      </div>
    )
  }

  const zone = coverageZone(analysis.coverage)
  const pct = (x: number) => `%${Math.round(x * 1000) / 10}`.replace('.', ',')
  const unseenKeys = new Set(analysis.paragraphs.flat().flatMap((s) => s.tokens).filter((t) => t.status === 'unseen' && t.key && !skipped.has(t.key)).map((t) => t.key))
  const selectedEntry = selected?.token.entryId ? byId.get(selected.token.entryId) : undefined
  // A conjugated form (allions, tuve): the verb, tense and person, and the learner's own card for
  // that verb if there is one.
  const verbEntry = (lemma: string) => vocabulary.find((v) => v.language === language && v.partOfSpeech === 'verb' && normalize(v.lemma).toLocaleLowerCase(language) === lemma)
  const verbRank = (lemma: string) => (verbEntry(lemma) ? -1 : (freq.get(lemma) ?? Infinity))
  const selectedForms = (selected?.token.key && !selectedEntry ? analyzeForm(language, cleanToken(selected.token.text, language)) : [])
    .map((a, i) => ({ a, i }))
    .sort((x, y) => verbRank(x.a.lemma) - verbRank(y.a.lemma) || x.i - y.i)
    .map((x) => x.a)
  const share = (n: number) => `${(n / Math.max(1, analysis.total)) * 100}%`

  return (
    <div className="stack">
      <div className="row justify-between">
        <h1 className="greeting">Okuma</h1>
        <button className="link small" onClick={() => open(null)}>
          ← Kütüphane
        </button>
      </div>

      {/* One line while reading (score, verdict, bar); the explanations open on request, so the
          text starts near the top of the screen. */}
      <section className={`card coverage coverage-compact zone-${zone}`}>
        <button type="button" className="coverage-line" aria-expanded={covOpen} onClick={() => setCovOpen((o) => !o)}>
          <span className="coverage-num">{pct(analysis.coverage)}</span>
          <strong className="coverage-title">{ZONE[zone].title}</strong>
          <span className="coverage-bar" role="img" aria-label={`Bilinen ${pct(analysis.coverage)}, listede ${pct(analysis.coverageWithList - analysis.coverage)}, yeni ${pct(1 - analysis.coverageWithList)}`}>
            <span className="cb-known" style={{ width: share(analysis.counts.known) }} />
            <span className="cb-list" style={{ width: share(analysis.counts.learning + analysis.counts.new) }} />
            <span className="cb-unseen" style={{ width: share(analysis.counts.unseen) }} />
          </span>
          <ChevronDownIcon size={16} className="coverage-chevron" />
        </button>
        {covOpen && (
          <div className="stack gap-2 coverage-more">
            <p className="small muted">{ZONE[zone].text}</p>
            <p className="small muted coverage-legend">
              <span><i className="cb-known" /> bildiğin {analysis.counts.known}</span>
              <span><i className="cb-list" /> listende {analysis.counts.learning + analysis.counts.new}</span>
              <span><i className="cb-unseen" /> yeni {analysis.counts.unseen}</span>
              <span>toplam {analysis.total} kelime</span>
            </p>
            {current && current.history.length > 0 && startCoverage !== null && (
              <p className="small">
                Önceki okumada %{Math.round(current.history[0].coverage * 100)}
                {current.history.length > 1 && `, son okumada %${Math.round(current.history.at(-1)!.coverage * 100)}`}; bu okumaya başlarken %
                {Math.round(startCoverage * 100)}.
              </p>
            )}
            {known.size < 500 && (
              <p className="small muted">
                Bildiğin kelimeleri henüz az tanıyorum ({known.size}). Birkaç metni bitirdikçe "yeni" görünen kelimeler azalır ve bu oran gerçeğe yaklaşır.
              </p>
            )}
          </div>
        )}
        {current?.source && (
          <p className="small coverage-source">
            <a className="link" href={current.source} target="_blank" rel="noreferrer">
              {current.source.includes('youtube.com') ? (
                <>
                  <PlayIcon size={14} className="inline-icon" />
                  Videoyu YouTube’da aç
                </>
              ) : (
                'Kaynağı aç'
              )}
            </a>
          </p>
        )}
      </section>

      {current?.audio && <AudioPanel key={`audio-${current.id}`} src={current.audio} hidden={listenFirst} onHidden={setListenFirst} />}
      <PrequestionsCard key={`pq-${current?.id}`} text={text} language={language} finished={!!message} />
      {!message && !listenFirst && (
        <KeyWordsCard
          key={`kw-${current?.id}`}
          db={db}
          language={language}
          analysis={analysis}
          existing={existing}
          onKnown={(key) => void markKnown(key)}
          onChanged={onChanged}
          onStudy={onStudy}
        />
      )}

      <div className="row reader-tools">
        <span className="reader-legend small" aria-hidden>
          <i className="legend-unseen">yeni</i> <i className="legend-learning">öğreniliyor</i> <i>bilinen</i>
        </span>
        <span className="grow" />
        <ReaderControls prefs={reader} onChange={setReader} />
        <button className={`chip chip-sm${multiMode ? ' is-on' : ''}`} aria-pressed={multiMode} onClick={() => setMultiMode((m) => !m)} title="ya da ⌘/Ctrl ile kelimelere tıkla">
          Çoklu seç
        </button>
      </div>
      <div className="reader-layout">
      <article
        className={`reader${listenFirst && current?.audio ? ' is-hidden' : ''}${readerStyle(reader).className}`}
        style={readerStyle(reader).style}
        lang={language}
      >
        {analysis.paragraphs.map((p, i) => (
          <p key={i}>
            {p.map((s, j) => (
              <span key={j}>
                {s.tokens.map((t, k) =>
                  t.key ? (
                    <span
                      key={k}
                      role="button"
                      tabIndex={t.status === 'known' || t.status === 'name' ? -1 : 0}
                      data-key={t.key}
                      className={`rw rw-${t.status}${t.status === 'learning' || t.status === 'new' ? ` ${shade(t.entryId)}` : ''}${t.status === 'unseen' && skipped.has(t.key) ? ' rw-skipped' : ''}${selected?.token.key === t.key ? ' is-selected' : ''}${multi.has(t.key) ? ' is-multi' : ''}`}
                      onClick={(e) => {
                        // ⌘/Ctrl+click (or multi-select mode) collects words to mark together.
                        if ((e.metaKey || e.ctrlKey || multiMode) && !t.entryId) {
                          e.preventDefault()
                          toggleMulti(t.key!)
                          return
                        }
                        setSelected({ token: t, sentence: s.text })
                      }}
                      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setSelected({ token: t, sentence: s.text }))}
                    >
                      {t.text}
                    </span>
                  ) : (
                    <span key={k}>{t.text}</span>
                  ),
                )}{' '}
              </span>
            ))}
          </p>
        ))}
      </article>

      <aside className="reader-aside">
      {!selected && !multi.size && !adding && (
        <p className="reader-hint small muted">Bir kelimeye tıkla: anlamı, cümlesi ve ekleme seçenekleri burada açılır. Klavyeyle ← → yeni kelimeler arasında gezer.</p>
      )}
      {multi.size > 0 && (
        <section className="card multi-bar" role="toolbar" aria-label="Seçili kelimeler">
          <strong>{multi.size} kelime seçili</strong>
          <button className="btn btn-sm" onClick={() => markMulti('known')}>
            Biliyorum
          </button>
          <button className="btn btn-sm btn-quiet" onClick={() => markMulti('skip')}>
            Bilmiyorum
          </button>
          <button className="btn btn-sm btn-quiet" onClick={() => markMulti('ignore')}>
            Yok say
          </button>
          <button className="link small" onClick={() => setMulti(new Set())}>
            Temizle
          </button>
        </section>
      )}

      {selected && selected.token.key && (
        <section className="card stack word-pop" aria-live="polite">
          <div className="row justify-between">
            <strong className="word-pop-word" lang={language}>
              {selectedEntry ? `${selectedEntry.article ? `${selectedEntry.article} ` : ''}${selectedEntry.lemma}` : cleanToken(selected.token.text, language)}
            </strong>
            <button className="icon-btn" onClick={() => setSelected(null)} aria-label="Kapat">
              ×
            </button>
          </div>
          {selectedEntry && <p className="gloss">{selectedEntry.senses[0].gloss}</p>}
          {selectedForms.length > 0 && language !== 'en' && (
            <div className="form-analysis">
              {selectedForms.slice(0, 3).map((a) => {
                const own = verbEntry(a.lemma)
                return (
                  <p key={`${a.lemma}-${a.tense}`} className="small">
                    <strong lang={language}>{a.lemma}</strong> · <span lang={language}>{TENSE_GUIDE[a.tense].name}</span> ·{' '}
                    {[...new Set(a.persons.map((p) => subjectLabel(language, a.tense, p).split(' / ')[0]))].join(', ')}
                    {own && (
                      <>
                        {' '}
                        <button className="link small" onClick={() => onOpen(own.id)}>
                          kartı aç
                        </button>
                      </>
                    )}
                  </p>
                )
              })}
            </div>
          )}
          <p className="small muted">{STATUS_TEXT[selected.token.status!]}</p>
          <p className="small sentence-sm">
            {selected.sentence}{' '}
            <button className="link small" onClick={() => keepSentence(selected.sentence, cleanToken(selected.token.text, language))}>
              Cümleyi kaydet
            </button>
          </p>
          <p className="small muted kbd">
            <kbd>←</kbd> <kbd>→</kbd> önceki / sonraki yeni kelime · <kbd>Esc</kbd> kapat
          </p>
          <div className="row">
            {selectedEntry ? (
              <button className="btn btn-quiet" onClick={() => onOpen(selectedEntry.id)}>
                Kelimeyi aç
              </button>
            ) : (
              <>
                <button
                  className="btn"
                  onClick={() => setAdding({ word: selectedForms[0] && !verbEntry(selectedForms[0].lemma) ? selectedForms[0].lemma : cleanToken(selected.token.text, language).toLocaleLowerCase(language), sentence: selected.sentence })}
                >
                  {/* A verb goes on the list as its infinitive (aller), not the form met (allions). */}
                  {selectedForms[0] && !verbEntry(selectedForms[0].lemma) ? `Listeye ekle: ${selectedForms[0].lemma}` : 'Listeye ekle'} <kbd className="kbd-key">E</kbd>
                </button>
                {ignored.has(selected.token.key) ? (
                  <button className="btn btn-quiet" onClick={() => toggleIgnored(selected.token.key!, false)}>
                    Yok saymayı kaldır
                  </button>
                ) : selected.token.status === 'known' ? (
                  <button className="btn btn-quiet" onClick={() => markUnknown(selected.token.key!)}>
                    Aslında bilmiyorum
                  </button>
                ) : (
                  <>
                    <button className="btn btn-quiet" onClick={() => markKnown(selected.token.key!)}>
                      Biliyorum <kbd className="kbd-key">B</kbd>
                    </button>
                    <button className="btn btn-quiet" onClick={() => toggleIgnored(selected.token.key!, true)} title="Özel isim, yabancı kelime ya da yazım hatası: hesaba katılmaz">
                      Yok say <kbd className="kbd-key">Y</kbd>
                    </button>
                    {!skipped.has(selected.token.key) && selected.token.status === 'unseen' && (
                      <button className="link small" onClick={() => skip(selected.token.key!)}>
                        Bilmiyorum, eklemeden geç <kbd className="kbd-key">G</kbd>
                      </button>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </section>
      )}

      {adding && (
        <section className="card stack">
          <h2 className="section-title">Listeye ekle</h2>
          <WordForm
            db={db}
            language={language}
            existing={existing}
            initial={{ word: adding.word, meaning: '', example: markWord(adding.sentence, adding.word), exampleTranslation: '', exampleMetIn: current?.title }}
            onSaved={() => {
              setAdding(null)
              setSelected(null)
              onChanged()
            }}
            onCancel={() => setAdding(null)}
          />
        </section>
      )}
      </aside>
      </div>

      {analysis.iPlusOne.length > 0 && (
        <section className="section stack">
          <h2 className="section-title">Tek bilinmeyenli cümleler</h2>
          <p className="small muted">
            Yalnızca bir kelimesini bilmediğin cümleler: yeni bir kelimeyi öğrenmenin en verimli bağlamı (i+1). Kelimeyi bu cümleyle birlikte ekle.
          </p>
          <ul className="plain stack gap-2">
            {analysis.iPlusOne.slice(0, 12).map((x) => (
              <li key={x.key} className="row justify-between nowrap items-start">
                <span className="sentence-sm" lang={language}>
                  {highlight(x.sentence, x.word)}
                </span>
                <span className="row gap-xs nowrap">
                  <button className="btn btn-quiet" onClick={() => setAdding({ word: x.word.toLocaleLowerCase(language), sentence: x.sentence })}>
                    Ekle
                  </button>
                  <button className="btn btn-quiet" onClick={() => keepSentence(x.sentence, x.word)} aria-label="Cümleyi kaydet" title="Cümleyi kaydet">
                    <MessageIcon size={16} />
                  </button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="row">
        <button className="btn btn-lg" onClick={() => setConfirmFinish(true)}>
          Okumayı bitir
        </button>
        {message && (
          <p className="notice" role="status">
            {message}
          </p>
        )}
        {message && !nextChapter && (
          <SameTopic
            text={text}
            language={language}
            vocabulary={vocabulary}
            states={states}
            known={known}
            onRead={async (t, body) => {
              const item: ReadingText = { id: crypto.randomUUID(), language, title: t, text: body, addedAt: new Date().toISOString(), history: [] }
              await db.saveText(item)
              setLibrary((lib) => [item, ...(lib ?? [])])
              await open(item)
            }}
          />
        )}
        {message && nextChapter && (
          <button className="btn" onClick={() => open(nextChapter)}>
            Sonraki bölüm: {nextChapter.title} →
          </button>
        )}
      </div>

      {confirmFinish && (
        <ConfirmDialog
          title="Okumayı bitir"
          confirmLabel="Bitir"
          cancelLabel="Okumaya dön"
          onConfirm={finish}
          onCancel={() => setConfirmFinish(false)}
        >
          {unseenKeys.size > 0
            ? `İşaretlemediğin ${unseenKeys.size} kelime bilinen kelimelerine eklenecek. Bilmediğin varsa önce "Bilmiyorum" ya da "Listeye ekle" ile işaretle.`
            : 'Yeni kelime kalmadı; listendeki kelimelerle karşılaşmaların kaydedilecek.'}
        </ConfirmDialog>
      )}
    </div>
  )
}

function highlight(sentence: string, word: string) {
  const i = sentence.toLowerCase().indexOf(word.toLowerCase())
  if (i < 0) return sentence
  return (
    <>
      {sentence.slice(0, i)}
      <mark>{sentence.slice(i, i + word.length)}</mark>
      {sentence.slice(i + word.length)}
    </>
  )
}

type LibraryGroup = ReadingText | { id: string; title: string; chapters: ReadingText[] }

/** Books (chapters sharing a book id) become one entry, placed where their first chapter was. */
function groupBooks(library: readonly ReadingText[]): LibraryGroup[] {
  const out: LibraryGroup[] = []
  const books = new Map<string, { id: string; title: string; chapters: ReadingText[] }>()
  for (const t of library) {
    if (!t.book) {
      out.push(t)
      continue
    }
    let b = books.get(t.book.id)
    if (!b) {
      b = { id: t.book.id, title: t.book.title, chapters: [] }
      books.set(t.book.id, b)
      out.push(b)
    }
    b.chapters.push(t)
  }
  for (const b of books.values()) b.chapters.sort((x, y) => x.book!.index - y.book!.index)
  return out
}

/**
 * An imported book: progress, the next chapter to read, and (opened) every chapter with how
 * much of it you already know, so you can see the book getting easier as you go.
 */
function BookItem({
  title,
  chapters,
  language,
  vocabulary,
  states,
  known,
  onOpen,
  onRemove,
}: {
  title: string
  chapters: ReadingText[]
  language: TargetLanguage
  vocabulary: VocabularyEntry[]
  states: UserWordState[]
  known: Set<string>
  onOpen: (t: ReadingText) => void
  onRemove: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const read = chapters.filter((c) => c.readAt).length
  const next = chapters.find((c) => !c.readAt)
  const coverage = useMemo(
    () => (expanded ? new Map(chapters.map((c) => [c.id, analyzeText(c.text, language, vocabulary, states, known)])) : null),
    [expanded, chapters, language, vocabulary, states, known],
  )
  return (
    <li className="book-item">
      <div className="book-head">
        <Cover title={title} book />
        <span className="book-meta">
          <strong>{title}</strong>
          <span className="small muted">
            {chapters.length} bölüm · {read} okundu
          </span>
          <span className="book-progress" aria-hidden>
            <span style={{ width: `${(read / chapters.length) * 100}%` }} />
          </span>
        </span>
      </div>
      <div className="row">
        {next ? (
          <button className="btn btn-sm" onClick={() => onOpen(next)}>
            {read ? 'Sıradaki' : 'Başla'}: {next.title}
          </button>
        ) : (
          <span className="small notice"><CheckCircleIcon size={15} className="inline-icon" />Kitabı bitirdin</span>
        )}
        <button className="link small" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>
          {expanded ? 'Bölümleri gizle' : 'Bölümler'}
        </button>
        <button className="link small" onClick={onRemove}>
          Kitabı sil
        </button>
      </div>
      {expanded && coverage && (
        <ol className="book-chapters">
          {chapters.map((c) => {
            const a = coverage.get(c.id)!
            return (
              <li key={c.id}>
                <button className="word-link" onClick={() => onOpen(c)}>
                  {c.title}
                </button>
                <span className={`small chapter-cov zone-${coverageZone(a.coverage)}`}>%{Math.round(a.coverage * 100)}</span>
                <span className="small muted">{a.counts.unseen} yeni</span>
                {c.readAt && <CheckIcon size={14} className="muted" />}
              </li>
            )
          })}
        </ol>
      )}
    </li>
  )
}

const COVER_HUES = [12, 32, 150, 190, 215, 262, 290, 340]

/** A cover for a text or book: a colour picked from its title and its first letter. */
function Cover({ title, book = false }: { title: string; book?: boolean }) {
  const hue = COVER_HUES[[...title].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % COVER_HUES.length]
  return (
    <span className={`cover${book ? ' is-book' : ''}`} style={{ ['--hue' as string]: hue }} aria-hidden>
      {title.trim().charAt(0).toLocaleUpperCase() || '·'}
    </span>
  )
}
