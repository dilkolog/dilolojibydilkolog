import { accessFetch, APPROVAL_MESSAGE, isApprovalRefusal } from '../data/access'
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { sentenceAt, sentenceTimes } from '../engine/listenFollow'

import { cleanToken } from '../engine/extract'
import { growthStage } from '../engine/growth'
import { KnownWordsCard } from './KnownWords'
import { KeyWordsCard } from './KeyWords'
import { PrequestionsCard } from './Prequestions'
import { saveSentence } from './saveSentence'
import { analyzeText, coverageLine, finishReading, type ReadToken } from '../engine/reading'
import { TARGET_LANGUAGES, type TargetLanguage, type UserWordState, type VocabularyEntry } from '../engine/types'
import { titleOf, type KelimeDB, type ReadingText } from '../data/db'
import { looksLikeSubtitles, parseSubtitles } from '../engine/subtitles'
import { SameTopic } from './News'
import { AudioPanel } from './Listening'
import { markWord, wordKeys } from '../data/wordInput'
import { ConfirmDialog } from './Dialog'
import { LANGUAGE_NAME } from './labels'
import { WordForm } from './Words'
import { showToast, undoable } from './toastFeed'
import { EmptyState } from './EmptyState'
import { PageHeader } from './PageHeader'
import { useTenses } from './tenseGroups'

import { analyzeForm, type FormAnalysis, type Tense } from '../engine/tenses'
import { compoundsAround, groupByTense, textForms } from '../engine/textForms'
import { TextForms } from './TextForms'
import { WordCard, type Selected } from './WordCard'
import { BookItem } from './ReadingBooks'
import { AddTextCard, LibraryItem, SourcePickers } from './ReadingLibrary'
import { CoverageCard } from './CoverageCard'
import { ExternalResources } from './ExternalResources'
import { SingleUnknownSentences } from './SingleUnknownSentences'
import { MIN_READ_MS, groupBooks, useSeen } from './readingHelpers'
import type { SharedRead } from './incoming'
import { useSheetSwipe } from './useSheetSwipe'
import { addFormsToReview, addSeenForms } from '../engine/labProgress'
import { scheduler } from '../data/instance'
import { loadTenses } from '../data/tenseData'
import { normalize } from '../engine/answerCheck'
import { loadFrequency } from '../data/frequency'
import { BrainIcon, GlobeIcon, PlusIcon, ConjugationsIcon, DictationIcon, ShadowingIcon } from './icons'
import { maskPositions, posKey } from '../engine/deduction'
import { GuessRating } from './GuessRating'
import { translate, translationReady } from '../data/translate'

import { ParagraphTranslation } from './ReaderTranslation'
import { TextDictation } from './TextDictation'
import { canSpeak, speakAsync } from './speech'
import { canRecord } from './audioRecord'
import { TextShadow } from './TextShadow'
import { reportError } from '../data/errorReport'
import { useTranslationReady } from './useTranslationReady'
import { ReaderControls } from './readerPrefs'
import { readerStyle, useReaderPrefs } from './readerSettings'

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
  onOpenLab,
  onLookUp,
  shared,
}: {
  db: KelimeDB
  language: TargetLanguage
  vocabulary: VocabularyEntry[]
  states: UserWordState[]
  onChanged: () => void
  onOpen: (entryId: string) => void
  onStudy?: (entries: VocabularyEntry[]) => void
  /** Open a verb form's verb and tense in the verb lab. */
  onOpenLab?: (verb: string, tense: string) => void
  /** The word in the dictionary: every meaning, its sound, the other languages. */
  onLookUp?: (word: string) => void
  /** Something shared to the app (Share → Diloloji): put in the add card, ready to start. */
  shared?: SharedRead
}) {
  const [library, setLibrary] = useState<ReadingText[] | null>(null)
  const [current, setCurrent] = useState<ReadingText | null>(null)
  const text = current?.text ?? ''
  const [draft, setDraft] = useState(shared?.text ?? '')
  const [title, setTitle] = useState(shared?.title ?? '')
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
  /**
   * The text (by id) whose meetings with list words are saved already: reaching the end of a text
   * saves them on its own, since "Okumayı bitir" (which also marks the rest as known) was often
   * never pressed and the reading then counted for nothing. Finishing doesn't count them twice.
   */
  const metSaved = useRef<string | null>(null)
  const [metNote, setMetNote] = useState('')
  /** When the text on screen was opened, and which it is: a glance at a short text is not a reading. */
  const opened = useRef<{ key: string | null; at: number }>({ key: null, at: 0 })
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
  const [youtube, setYoutube] = useState(shared?.url && !shared.text ? shared.url : '')
  const [ytBusy, setYtBusy] = useState(false)
  // Listening episodes start with the text hidden: listen first, then read.
  const [listenFirst, setListenFirst] = useState(false)
  // Deduction mode: some unknown words are hidden until tapped; the guess is rated after.
  const [deduce, setDeduce] = useState(() => {
    try {
      return localStorage.getItem('diloloji:deduce') === '1'
    } catch {
      return false
    }
  })
  const [revealed, setRevealed] = useState<Set<string>>(new Set())
  const [guess, setGuess] = useState<string | null>(null)
  // The text's Turkish under each paragraph, on request (per text: each new text starts without it).
  const [showTurkish, setShowTurkish] = useState(false)
  const [loadFailed, setLoadFailed] = useState(false)
  // Dictation of this text, from a sentence on (null: reading).
  const [dictating, setDictating] = useState<number | null>(null)
  // Shadowing this text, from a sentence on (null: reading).
  const [shadowing, setShadowing] = useState<number | null>(null)
  const canTranslate = useTranslationReady()
  // The coverage card opens to its explanations on request.
  const [covOpen, setCovOpen] = useState(false)
  // Verb tables, so a tapped conjugated form can say which verb and tense it is; word frequency to
  // put the likely verb first (allions: aller before allier).
  const tensesReady = useTenses(language)
  // The verb forms of this text, listed on request.
  const [showForms, setShowForms] = useState(false)
  // A sentence the learner asked to be shown (from the forms list), lit for a moment.
  const [flash, setFlash] = useState<number | null>(null)
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
      setShowTurkish(false)
      setDictating(null)
      setShadowing(null)
      setKnown(k)
      setIgnored(ig)
    })
      // Whatever goes wrong in loading, the screen still opens (with a note), never blank.
      .catch((e) => {
        reportError(e, 'reading-load')
        setLoadFailed(true)
        setLibrary((l) => l ?? [])
      })
  }, [db, language])

  const analysis = useMemo(() => (text ? analyzeText(text, language, vocabulary, states, known, ignored) : null), [text, language, vocabulary, states, known, ignored])
  // Where each text of the library stands for the reader now: only while the library itself is on screen.
  const previews = useMemo(() => {
    const out = new Map<string, string>()
    if (text) return out
    // Chapters of a book are rated when the book is opened (BookItem), not all at once here.
    for (const t of library ?? []) if (!t.book) out.set(t.id, coverageLine(analyzeText(t.text, language, vocabulary, states, known, ignored)))
    return out
  }, [text, library, language, vocabulary, states, known, ignored])
  const masks = useMemo(() => (deduce && !listenFirst && analysis ? maskPositions(analysis.paragraphs, language) : new Set<string>()), [deduce, listenFirst, analysis, language])
  const formGroups = useMemo(() => (showForms && tensesReady && analysis && language !== 'en' ? groupByTense(textForms(language, analysis)) : []), [showForms, tensesReady, analysis, language])
  // Listening: the sentence being heard, lit in the text; a sentence's start, to jump to.
  const [audioDuration, setAudioDuration] = useState<number>()
  const [heard, setHeard] = useState(-1)
  const seekRef = useRef<((seconds: number) => void) | null>(null)
  const rangeRef = useRef<((from: number, to: number, slow?: boolean) => Promise<void>) | null>(null)
  const sentencesFlat = useMemo(() => (analysis ? analysis.paragraphs.flatMap((p) => p.map((s) => s.text)) : []), [analysis])
  const paragraphStart = useMemo(() => (analysis ? analysis.paragraphs.map((_, i) => analysis.paragraphs.slice(0, i).reduce((n, p) => n + p.length, 0)) : []), [analysis])
  // Which sentences open a paragraph (a story's page turn is a pause in the reading).
  const paragraphStarts = useMemo(() => sentencesFlat.map((_, i) => paragraphStart.includes(i)), [sentencesFlat, paragraphStart])
  const times = useMemo(
    () => (current?.audio ? sentenceTimes(sentencesFlat, current.cues, audioDuration, { paragraphStarts, anchors: current.syncAnchors }) : null),
    [current, sentencesFlat, audioDuration, paragraphStarts],
  )
  const heardAt = useRef(0)
  const timesRef = useRef(times)
  timesRef.current = times
  const followTime = useCallback((t: number) => {
    heardAt.current = t
    const i = timesRef.current && t > 0 ? sentenceAt(timesRef.current, t) : -1
    setHeard((h) => (h === i ? h : i))
  }, [])
  // New times (the audio's length arrived, a pin was set or reset): the lit sentence follows at once,
  // even when the audio is paused and no time update is coming.
  useEffect(() => {
    if (times && heardAt.current > 0) followTime(heardAt.current)
  }, [times, followTime])
  // Dictation plays a sentence from the text's own recording when its subtitles time it exactly,
  // else the device reads it (approximate times would cut sentences in the middle).
  const recorded = !!(current?.audio && current.cues?.length && times)
  const sentenceEnd = (i: number) => (times ? (times[i + 1] ?? audioDuration ?? times[i] + 10) : 0)
  const playSentence = (i: number, slow: boolean): Promise<void> => {
    if (recorded && times && rangeRef.current) return rangeRef.current(times[i], sentenceEnd(i), slow)
    return speakAsync(sentencesFlat[i], language, slow ? 0.7 : undefined)
  }
  const sheet = useSheetSwipe(() => setSelected(null))
  // A tapped word must not end up behind the sheet that opens for it (on a narrow screen the card covers the lower part of the page).
  // Where the sheet stands: as wide as the text column (a sidebar may take the left of the screen).
  const [sheetBox, setSheetBox] = useState<{ left: number; width: number } | null>(null)
  const openKey = selected?.token.key
  const openAt = selected?.at
  useEffect(() => {
    if (!openKey) return
    const measure = () => {
      const layout = document.querySelector<HTMLElement>('.reader-layout')
      if (layout) setSheetBox({ left: Math.round(layout.getBoundingClientRect().left), width: Math.round(layout.getBoundingClientRect().width) })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [openKey])
  useEffect(() => {
    if (!openKey) return
    const frame = requestAnimationFrame(() => {
      const card = document.querySelector<HTMLElement>('.word-pop')
      // The word in the lit sentence (the same word may stand earlier in the text).
      const key = CSS.escape(openKey)
      const word = document.querySelector<HTMLElement>(`.rs.is-lit [data-key="${key}"]`) ?? document.querySelector<HTMLElement>(`[data-key="${key}"]`)
      if (!card || !word || getComputedStyle(card).position !== 'fixed') return
      // Where the sheet will stand (it is still rising into place, so its rectangle is not the answer yet).
      const top = innerHeight - parseFloat(getComputedStyle(card).bottom) - card.offsetHeight
      const covered = word.getBoundingClientRect().bottom - (top - 12)
      if (covered > 0) window.scrollBy({ top: covered + 8, behavior: 'smooth' })
    })
    return () => cancelAnimationFrame(frame)
  }, [openKey, openAt])
  // The heard sentence kept in view while listening (only when it has left the screen).
  useEffect(() => {
    if (heard < 0) return
    const el = document.querySelector<HTMLElement>(`[data-s="${heard}"]`)
    if (!el) return
    const r = el.getBoundingClientRect()
    if (r.top < 80 || r.bottom > innerHeight - 40) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [heard])
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

  // A word that is opened (tap, arrow keys) stays shown.
  const openedKey = selected?.token.key
  useEffect(() => {
    if (deduce && openedKey) setRevealed((r) => (r.has(openedKey) ? r : new Set(r).add(openedKey)))
  }, [deduce, openedKey])

  const open = async (item: ReadingText | null) => {
    await db.setCurrentText(language, item?.id ?? null)
    setCurrent(item)
    setStartCoverage(null)
    setSkipped(new Set())
    setRevealed(new Set())
    setGuess(null)
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
      const res = await accessFetch(`/api/youtube?v=${encodeURIComponent(youtube.trim())}&lang=${language}`)
      const j = (await res.json()) as { id?: string; title?: string; channel?: string; auto?: boolean; text?: string; error?: string; available?: string[] }
      if (!res.ok || !j.text) {
        setBookError({
          ok: false,
          text:
            j.error === 'no captions'
            ? `Bu videoda ${LANGUAGE_NAME[language]} altyazı yok${j.available?.length ? ` (olanlar: ${j.available.join(', ')})` : ''}.`
            : isApprovalRefusal(j.error)
              ? APPROVAL_MESSAGE
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
    // With translation on, the card comes with its Turkish (and so with the translation exercise).
    const translation = (await translationReady()) ? await translate(sentence, language).catch(() => '') : ''
    const ok = await saveSentence({ language, text: sentence, focus, source: current?.title, ...(translation ? { translation } : {}) })
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

  /** The verb forms of the text, for the verb lab's "seen in texts" (the reading's real usage). */
  const keepSeenForms = async (lang: 'fr' | 'es') => {
    if (!analysis) return
    await loadTenses(lang)
    const found = textForms(lang, analysis)
    if (found.length) await db.saveLab(lang, addSeenForms(await db.getLab(lang), found, current?.title, new Date().toISOString()))
  }

  /** The verb forms of the text put in the verb lab's review queue (FSRS), the ones already there left alone. */
  const reviewForms = async (pairs: { lemma: string; tense: Tense }[]) => {
    if (language === 'en') return
    const { lab, added } = addFormsToReview(await db.getLab(language), scheduler, pairs, new Date())
    if (added) await db.saveLab(language, lab)
    showToast(added ? `${added} çekim fiil tekrarına eklendi.` : 'Bunlar zaten fiil tekrarında.')
  }

  /** Saves a text with new follow pins (the audio's follow is fitted to them), in the library too. */
  const setAnchors = async (anchors: { sentence: number; time: number }[]) => {
    if (!current) return
    const updated: ReadingText = { ...current, syncAnchors: anchors.length ? anchors : undefined }
    await db.saveText(updated)
    setCurrent(updated)
    setLibrary((lib) => (lib ?? []).map((t) => (t.id === updated.id ? updated : t)))
  }
  /** The sentence of the open word card is the one being heard now: the follow shifts to fit. */
  const pinHeard = (at: string) => {
    const [pi, si] = at.split('.').map(Number)
    const sentence = paragraphStart[pi] + si
    if (!(heardAt.current > 0) || !Number.isFinite(sentence)) return showToast('Önce sesi çal; sonra duyduğun cümleye dokun.', undefined, 3500, 'info')
    void setAnchors([...(current?.syncAnchors ?? []).filter((a) => a.sentence !== sentence), { sentence, time: heardAt.current }])
    showToast('Takip ayarlandı: bu cümle şimdi okunan cümle.')
  }

  /** Scrolls the text to a sentence and lights it for a moment. */
  const showSentence = (index: number) => {
    document.querySelector<HTMLElement>(`.reader [data-s="${index}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    setFlash(index)
    setTimeout(() => setFlash((f) => (f === index ? null : f)), 2200)
  }
  const readKey = current?.id ?? text
  /** The list words met in this text, and the verb forms in it, saved once per opened text. */
  const saveMet = async () => {
    if (!analysis || !readKey || metSaved.current === readKey) return 0
    metSaved.current = readKey
    const { encounters } = finishReading(analysis, skipped)
    await db.addEncounters(encounters)
    if (language !== 'en') await keepSeenForms(language)
    return Object.keys(encounters).length
  }
  if (readKey && opened.current.key !== readKey) opened.current = { key: readKey, at: Date.now() }
  const endSeen = useSeen(readKey, () => {
    const key = readKey
    // At the end, after at least MIN_READ_MS with the text open (and still the same text then).
    setTimeout(async () => {
      if (opened.current.key !== key) return
      const met = await saveMet()
      if (met) {
        setMetNote(`Kelimelerindeki ${met} kelimeyle karşılaşman kaydedildi.`)
        onChanged()
      }
    }, Math.max(0, opened.current.at + MIN_READ_MS - Date.now()))
  })

  const finish = async () => {
    if (!analysis) return
    const { knownKeys, encounters } = finishReading(analysis, skipped)
    await db.addKnownWords(language, knownKeys)
    await saveMet()
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
    setMessage(`${knownKeys.length} kelime bilinen kelimelerine eklendi${met ? `, kelimelerindeki ${met} kelimeyle bir kez daha karşılaştın` : ''}.`)
    onChanged()
  }

  if (library === null) return null

  if (!text || !analysis) {
    const now = Date.now()
    return (
      <div className="stack">
        <PageHeader
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
        {library.length === 0 && (
          <EmptyState art="library" title="Kütüphanen boş">
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
          onTitle={setTitle}
          draft={draft}
          onDraft={setDraft}
          onStart={start}
          onFile={loadFile}
          onBook={importBook}
          youtube={youtube}
          onYoutube={setYoutube}
          onFetchYoutube={() => void importYoutube()}
          ytBusy={ytBusy}
          bookError={bookError}
        />
        <SourcePickers db={db} language={language} vocabulary={vocabulary} states={states} known={known} library={library} setLibrary={setLibrary} open={open} />
        <ExternalResources language={language} />
      </div>
    )
  }

  const unseenKeys = new Set(analysis.paragraphs.flat().flatMap((s) => s.tokens).filter((t) => t.status === 'unseen' && t.key && !skipped.has(t.key)).map((t) => t.key))
  const selectedEntry = selected?.token.entryId ? byId.get(selected.token.entryId) : undefined
  // A conjugated form (allions, tuve): the verb, tense and person, and the learner's own card for
  // that verb if there is one.
  const verbEntry = (lemma: string) => vocabulary.find((v) => v.language === language && v.partOfSpeech === 'verb' && normalize(v.lemma).toLocaleLowerCase(language) === lemma)
  const verbRank = (lemma: string) => (verbEntry(lemma) ? -1 : (freq.get(lemma) ?? Infinity))
  // A word inside a compound tense ("ai" or "mangé" in "j'ai mangé") shows the whole form first.
  const selectedToken = selected?.token.key && !selectedEntry ? selected : undefined
  const selectedCompounds: FormAnalysis[] = selectedToken && language !== 'en' ? compoundsAround(language, selectedToken.sentence, selectedToken.token.text) : []
  const selectedSingles = (selectedToken ? analyzeForm(language, cleanToken(selectedToken.token.text, language)) : [])
    .map((a, i) => ({ a, i }))
    .sort((x, y) => verbRank(x.a.lemma) - verbRank(y.a.lemma) || x.i - y.i)
    .map((x) => x.a)
  const selectedForms = [...selectedCompounds, ...selectedSingles]

  return (
    <div className="stack">
      <div className="row justify-between">
        <h1 className="greeting">Okuma</h1>
        <button className="link small" onClick={() => open(null)}>
          ← Kütüphane
        </button>
      </div>

      <CoverageCard analysis={analysis} current={current} startCoverage={startCoverage} knownCount={known.size} expanded={covOpen} onToggle={() => setCovOpen((o) => !o)} />

      {current?.audio && (
        <AudioPanel
          key={`audio-${current.id}`}
          src={current.audio}
          hidden={listenFirst}
          onHidden={setListenFirst}
          onTime={followTime}
          onDuration={setAudioDuration}
          seekRef={seekRef}
          rangeRef={rangeRef}
          still={dictating !== null || shadowing !== null}
          follow={current.cues?.length ? 'exact' : 'approx'}
          resumeKey={current.id}
        />
      )}
      {current?.audio && !current.cues?.length && !!current.syncAnchors?.length && (
        <p className="small muted">
          Takip {current.syncAnchors.length} noktayla ayarlandı.{' '}
          <button type="button" className="link small" onClick={() => void setAnchors([])}>
            Ayarı sıfırla
          </button>
        </p>
      )}
      <PrequestionsCard key={`pq-${current?.id}`} text={text} language={language} finished={!!message} />
      {!message && !listenFirst && dictating === null && (
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
        {(canTranslate || !!current?.turkish) && !listenFirst && (
          <button className="chip chip-sm" aria-pressed={showTurkish} onClick={() => setShowTurkish((v) => !v)} title="Her paragrafın altında Türkçesi">
            <GlobeIcon size={14} /> Türkçesi
          </button>
        )}
        {(recorded || canSpeak()) && (
          <button className="chip chip-sm" aria-pressed={dictating !== null} onClick={() => (setShadowing(null), setDictating((d) => (d === null ? Math.max(0, heard) : null)))} title="Metni cümle cümle dinleyip yaz">
            <DictationIcon size={14} /> Dikte
          </button>
        )}
        {(recorded || canSpeak()) && canRecord() && (
          <button className="chip chip-sm" aria-pressed={shadowing !== null} onClick={() => (setDictating(null), setShadowing((d) => (d === null ? Math.max(0, heard) : null)))} title="Cümleyi dinle, hemen ardından söyle, sonra karşılaştır">
            <ShadowingIcon size={14} /> Gölgele
          </button>
        )}
        {!listenFirst && dictating === null && (
          <button
            type="button"
            className="chip chip-sm"
            aria-pressed={deduce}
            onClick={() => {
              setDeduce((v) => {
                try {
                  localStorage.setItem('diloloji:deduce', v ? '0' : '1')
                } catch {
                  // Just not remembered.
                }
                return !v
              })
              setGuess(null)
            }}
            title="Bilinmeyen kelimelerin bir kısmı gizlenir: anlamını cümleden tahmin et, sonra dokunup aç"
          >
            <BrainIcon size={14} /> Çıkarım
          </button>
        )}
        {language !== 'en' && !listenFirst && (
          <button type="button" className="chip chip-sm" aria-pressed={showForms} onClick={() => setShowForms((v) => !v)} title="Metindeki fiil çekimleri, zamana göre">
            <ConjugationsIcon size={14} /> Çekimler
          </button>
        )}
        <button type="button" className="chip chip-sm" onClick={() => setConfirmFinish(true)}>
          Okumayı bitir
        </button>
        <button className={`chip chip-sm${multiMode ? ' is-on' : ''}`} aria-pressed={multiMode} onClick={() => setMultiMode((m) => !m)} title="ya da ⌘/Ctrl ile kelimelere tıkla">
          Çoklu seç
        </button>
      </div>
      {showForms && language !== 'en' && <TextForms groups={formGroups} language={language} onOpenLab={onOpenLab} onReview={reviewForms} onShow={showSentence} onClose={() => setShowForms(false)} />}
      {dictating !== null && (
        <TextDictation key={`dict-${current?.id}-${dictating}`} sentences={sentencesFlat} language={language} start={dictating} voice={recorded ? 'recording' : 'device'} play={playSentence} onClose={() => setDictating(null)} />
      )}
      {shadowing !== null && (
        <TextShadow
          key={`shadow-${current?.id}-${shadowing}`}
          sentences={sentencesFlat}
          language={language}
          start={shadowing}
          voice={recorded ? 'recording' : 'device'}
          hear={(i) => playSentence(i, false)}
          seconds={recorded && times ? (i) => sentenceEnd(i) - times[i] : undefined}
          onClose={() => setShadowing(null)}
        />
      )}
      <div className={`reader-layout${selected?.token.key ? ' has-sheet' : ''}`}>
      <article
        className={`reader${(listenFirst && current?.audio) || dictating !== null ? ' is-hidden' : ''}${readerStyle(reader).className}`}
        style={readerStyle(reader).style}
        lang={language}
      >
        {analysis.paragraphs.map((p, i) => (
          <Fragment key={i}>
          {current?.images?.[i] && <img className="reader-img" src={current.images[i]} alt="" loading="lazy" />}
          <p>
            {p.map((s, j) => (
              <span
                key={j}
                data-s={paragraphStart[i] + j}
                className={
                  [
                    selected && (selected.at ? selected.at === `${i}.${j}` : selected.sentence === s.text) ? 'rs is-lit' : '',
                    heard === paragraphStart[i] + j ? 'rs is-heard' : '',
                    flash === paragraphStart[i] + j ? 'rs is-flash' : '',
                  ]
                    .filter(Boolean)
                    .join(' ') || undefined
                }
              >
                {s.tokens.map((t, k) => {
                  const hidden = !!t.key && masks.has(posKey(i, j, k)) && !revealed.has(t.key)
                  const pick = () => {
                    if (hidden) setGuess(t.key!)
                    setSelected({ token: t, sentence: s.text, at: `${i}.${j}` })
                  }
                  return t.key ? (
                    <span
                      key={k}
                      role="button"
                      tabIndex={t.status === 'known' || t.status === 'name' ? -1 : 0}
                      data-key={t.key}
                      aria-label={hidden ? 'Gizli kelime: anlamını cümleden tahmin et, sonra aç' : undefined}
                      className={`rw rw-${t.status}${hidden ? ' rw-masked' : ''}${t.status === 'learning' || t.status === 'new' ? ` ${shade(t.entryId)}` : ''}${t.status === 'unseen' && skipped.has(t.key) ? ' rw-skipped' : ''}${selected?.token.key === t.key ? ' is-selected' : ''}${multi.has(t.key) ? ' is-multi' : ''}`}
                      onClick={(e) => {
                        // ⌘/Ctrl+click (or multi-select mode) collects words to mark together.
                        if ((e.metaKey || e.ctrlKey || multiMode) && !t.entryId) {
                          e.preventDefault()
                          toggleMulti(t.key!)
                          return
                        }
                        pick()
                      }}
                      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), pick())}
                    >
                      {hidden ? '[ ? ]' : t.text}
                    </span>
                  ) : (
                    <span key={k}>{t.text}</span>
                  )
                })}{' '}
              </span>
            ))}
          </p>
          {showTurkish && !listenFirst && dictating === null && <ParagraphTranslation sentences={p.map((x) => x.text)} from={language} given={current?.turkish?.[i]} />}
          </Fragment>
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
        <WordCard
          selected={selected as Selected & { token: ReadToken & { key: string } }}
          entry={selectedEntry}
          forms={selectedForms}
          verbEntry={verbEntry}
          language={language}
          sheetBox={sheetBox}
          sheet={sheet}
          rating={deduce && guess && selected.token.key === guess ? <GuessRating word={cleanToken(selected.token.text, language)} language={language} onDone={() => setGuess(null)} /> : undefined}
          ignored={ignored}
          skipped={skipped}
          canListenFrom={!!times}
          canPinHeard={!!times && !current?.cues?.length}
          onPinHeard={pinHeard}
          onClose={() => setSelected(null)}
          onLookUp={onLookUp}
          onOpen={onOpen}
          onOpenLab={onOpenLab}
          onKeepSentence={keepSentence}
          onListenFrom={(at) => {
            const [pi, si] = at.split('.').map(Number)
            seekRef.current?.(times?.[paragraphStart[pi] + si] ?? 0)
          }}
          onAdd={(word, sentence) => setAdding({ word, sentence })}
          onIgnore={toggleIgnored}
          onUnknown={markUnknown}
          onKnown={markKnown}
          onSkip={skip}
        />
      )}

      {adding && (
        <section className="card stack">
          <h2 className="section-title">Kelimelerime ekle</h2>
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

      {analysis.iPlusOne.length > 0 && <SingleUnknownSentences analysis={analysis} language={language} onAdd={(word, sentence) => setAdding({ word, sentence })} onKeep={keepSentence} />}

      <div className="row" ref={endSeen}>
        <button className="btn btn-lg" onClick={() => setConfirmFinish(true)}>
          Okumayı bitir
        </button>
        {metNote && !message && (
          <p className="small muted" role="status">
            {metNote}
          </p>
        )}
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
            ? `İşaretlemediğin ${unseenKeys.size} kelime bilinen kelimelerine eklenecek. Bilmediğin varsa önce "Bilmiyorum" ya da "Kelimelerime ekle" ile işaretle.`
            : 'Yeni kelime kalmadı; kelimelerindeki kelimelerle karşılaşmaların kaydedilecek.'}
        </ConfirmDialog>
      )}
    </div>
  )
}
