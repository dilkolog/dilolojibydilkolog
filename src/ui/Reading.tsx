import '../lazy.css'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

import { cleanToken } from '../engine/extract'
import { KeyWordsCard } from './KeyWords'
import { PrequestionsCard } from './Prequestions'
import { ComprehensionCard } from './ComprehensionCard'
import { saveSentence } from './saveSentence'
import { analyzeText, coverageLine, type ReadToken } from '../engine/reading'
import { type TargetLanguage, type UserWordState, type VocabularyEntry } from '../engine/types'
import { type KelimeDB, type ReadingText } from '../data/db'
import { SameTopic } from './News'
import { AudioPanel } from './Listening'
import { wordKeys } from '../data/wordInput'
import { ConfirmDialog } from './Dialog'
import { showToast } from './toastFeed'
import { useTenses } from './tenseGroups'

import { type Tense } from '../engine/tenses'
import { groupByTense, textForms } from '../engine/textForms'
import { TextForms } from './TextForms'
import { WordCard, type Selected } from './WordCard'
import { CoverageCard } from './CoverageCard'
import { SingleUnknownSentences } from './SingleUnknownSentences'
import { openTokensOf, shadeFor } from './readingHelpers'
import type { SharedRead } from './incoming'
import { useSheetSwipe } from './useSheetSwipe'
import { useListenFollow } from './useListenFollow'
import { useMultiSelect } from './useMultiSelect'
import { useReaderMarks } from './useReaderMarks'
import { useReadingLibrary } from './useReadingLibrary'
import { useSentenceTools } from './useSentenceTools'
import { useTargetListName, useWordFrequency } from './useReadingTargets'
import { useFinishReading } from './useFinishReading'
import { useWordSheetLayout } from './useWordSheetLayout'
import { addFormsToReview } from '../engine/labProgress'
import { scheduler } from '../data/instance'
import { maskPositions } from '../engine/deduction'
import { GuessRating } from './GuessRating'
import { translate, translationReady } from '../data/translate'

import { ReaderParagraph } from './ReaderParagraph'
import { TextDictation } from './TextDictation'
import { canSpeak } from './speech'
import { canRecord } from './audioRecord'
import { TextShadow } from './TextShadow'
import { useTranslationReady } from './useTranslationReady'
import { useStudyClock } from './useStudyClock'
import { readerStyle, useReaderPrefs } from './readerSettings'
import { Sticker } from './Sticker'
import { ReaderTools } from './ReaderTools'
import { ClubBar } from './ClubBar'
import { useReadingClub } from './useReadingClub'
import { ReadingHome } from './ReadingHome'
import { AddingCard, MultiBar } from './ReaderAside'
import { formsOfSelection, ownVerb } from './readerForms'

/** No word of the paragraph is in the multi-selection: one stable empty set, so its paragraph keeps equal props. */
const NO_KEYS: ReadonlySet<string> = new Set()
/** No word of the paragraph was looked up by a friend in the reading club. */
const NO_LOOKS: ReadonlyMap<string, string[]> = new Map()

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
  onLesson,
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
  /** Opens the guide's lesson on a topic (from a tense met in the text). */
  onLesson?: (topic: string) => void
  /** The word in the dictionary: every meaning, its sound, the other languages. */
  onLookUp?: (word: string) => void
  /** Something shared to the app (Share → Diloloji): put in the add card, ready to start. */
  shared?: SharedRead
}) {
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
  const [reader, setReader] = useReaderPrefs()
  const { multi, setMulti, multiMode, setMultiMode, toggleMulti, markMulti } = useMultiSelect({ db, language, setKnown, setSkipped, setIgnored })
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
  const freq = useWordFrequency(language)
  const targetListName = useTargetListName(db, language)

  const {
    library, setLibrary, current, setCurrent,
    draft, setDraft, title, setTitle, youtube, setYoutube, ytBusy, bookError, loadFailed,
    open, start, loadFile, importBook, importYoutube, removeBook, remove, nextChapter,
  } = useReadingLibrary({
    db,
    language,
    shared,
    setMessage,
    onLoaded: ({ open: opened, known: k, ignored: ig }) => {
      // A listening episode not read yet resumes in listen-first mode.
      setListenFirst(!!opened?.audio && !opened.readAt)
      setShowTurkish(false)
      setDictating(null)
      setShadowing(null)
      setKnown(k)
      setIgnored(ig)
    },
    onOpened: (item) => {
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
    },
  })
  // Reading together: a club on the open text, or one joined from a link (its text opened here).
  const club = useReadingClub({
    db,
    language,
    current,
    lookedUp: selected?.token.key,
    onText: (item) => {
      setLibrary((lib) => (lib?.some((t) => t.id === item.id) ? lib : [item, ...(lib ?? [])]))
      void open(item)
    },
  })
  const text = current?.text ?? ''
  const analysis = useMemo(() => (text ? analyzeText(text, language, vocabulary, states, known, ignored) : null), [text, language, vocabulary, states, known, ignored])
  // Reading and listening time (a weekly goal and the Progress card): counted only while a text is open and touched.
  const addListened = useCallback((seconds: number) => void db.addStudyTime('listen', language, seconds).catch(() => {}), [db, language])
  useStudyClock({ active: !!text, needsActivity: true, record: (seconds) => void db.addStudyTime('read', language, seconds).catch(() => {}) })
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
  const { audioDuration, setAudioDuration, heard, seekRef, rangeRef, sentencesFlat, paragraphStart, times, heardAt, followTime } = useListenFollow(current, analysis)
  const { recorded, sentenceEnd, playSentence, setAnchors, pinHeard, flash, showSentence } = useSentenceTools({
    db,
    language,
    current,
    setCurrent,
    setLibrary,
    follow: { audioDuration, rangeRef, sentencesFlat, paragraphStart, times, heardAt },
  })
  const sheet = useSheetSwipe(() => setSelected(null))
  const sheetBox = useWordSheetLayout(selected?.token.key, selected?.at)
  const shade = useMemo(() => shadeFor(states), [states])
  // The paragraphs are memoised (ReaderParagraph): each gets only what concerns it, so picking a word
  // or the next heard sentence renders a paragraph or two again, not the whole text.
  const paragraphKeys = useMemo(() => analysis?.paragraphs.map((p) => new Set(p.flatMap((x) => x.tokens.flatMap((t) => (t.key ? [t.key] : []))))) ?? [], [analysis])
  const pickToken = useCallback((token: ReadToken, sentence: string, at: string, hidden: boolean) => {
    if (hidden) setGuess(token.key!)
    setSelected({ token, sentence, at })
  }, [])
  const toggleMultiRef = useRef(toggleMulti)
  useLayoutEffect(() => {
    toggleMultiRef.current = toggleMulti
  })
  const onToggleMulti = useCallback((key: string) => toggleMultiRef.current(key), [])
  const openTokens = useMemo(() => openTokensOf(analysis), [analysis])
  // Reading club: the words friends looked up, in the order they come in the text, each with its first place.
  const lookedWords = useMemo(() => {
    const out: { key: string; text: string; who: string[]; token: ReadToken; sentence: string; at: string }[] = []
    if (!analysis || !club.looks.size) return out
    const seen = new Set<string>()
    analysis.paragraphs.forEach((p, i) =>
      p.forEach((sentence, j) =>
        sentence.tokens.forEach((t) => {
          if (!t.key || seen.has(t.key) || !club.looks.has(t.key)) return
          seen.add(t.key)
          out.push({ key: t.key, text: t.text, who: club.looks.get(t.key)!, token: t, sentence: sentence.text, at: `${i}.${j}` })
        }),
      ),
    )
    return out
  }, [analysis, club.looks])
  const showLooked = (key: string) => {
    const w = lookedWords.find((x) => x.key === key)
    if (!w) return
    pickToken(w.token, w.sentence, w.at, false)
    document.querySelector(`.reader [data-key="${CSS.escape(key)}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }
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

  /** Keeps the whole sentence as a sentence card, with the word it was saved for. */
  const keepSentence = async (sentence: string, focus: string) => {
    // With translation on, the card comes with its Turkish (and so with the translation exercise).
    const translation = (await translationReady()) ? await translate(sentence, language).catch(() => '') : ''
    const ok = await saveSentence({ language, text: sentence, focus, source: current?.title, ...(translation ? { translation } : {}) })
    if (ok && current?.title && focus) {
      await db.addFirstEncounters({ [`${language}:${focus.trim().toLowerCase()}`]: { title: current.title, sentence, at: new Date().toISOString() } })
    }
    showToast(ok ? 'Cümle kaydedildi: Oyunlar → Cümle kartları' : 'Bu cümle zaten kayıtlı', undefined, 3500, ok ? 'success' : 'info')
  }

  const { markKnown, toggleIgnored, skip, markUnknown } = useReaderMarks({ db, language, openTokens, skipped, ignored, selected, adding, setKnown, setIgnored, setSkipped, setSelected, setAdding })

  /** The verb forms of the text put in the verb lab's review queue (FSRS), the ones already there left alone. */
  const reviewForms = async (pairs: { lemma: string; tense: Tense }[]) => {
    if (language === 'en') return
    const { lab, added } = addFormsToReview(await db.getLab(language), scheduler, pairs, new Date())
    if (added) await db.saveLab(language, lab)
    showToast(added ? `${added} çekim fiil tekrarına eklendi.` : 'Bunlar zaten fiil tekrarında.')
  }

  const readKey = current?.id ?? text
  const { endSeen, metNote, finish } = useFinishReading({ db, language, analysis, current, readKey, skipped, startCoverage, setKnown, setCurrent, setLibrary, setConfirmFinish, setMessage, onChanged })

  if (library === null) return null

  if (!text || !analysis) {
    return (
      <>
      <ClubBar club={club} />
      <ReadingHome
        db={db}
        language={language}
        vocabulary={vocabulary}
        states={states}
        known={known}
        library={library}
        setLibrary={setLibrary}
        previews={previews}
        loadFailed={loadFailed}
        shared={!!shared}
        open={open}
        remove={remove}
        removeBook={removeBook}
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
      </>
    )
  }

  const unseenKeys = new Set(analysis.paragraphs.flat().flatMap((s) => s.tokens).filter((t) => t.status === 'unseen' && t.key && !skipped.has(t.key)).map((t) => t.key))
  const selectedEntry = selected?.token.entryId ? byId.get(selected.token.entryId) : undefined
  // A conjugated form (allions, tuve): the verb, tense and person, and the learner's own card for
  // that verb if there is one; a word inside a compound tense shows the whole form first.
  const verbEntry = (lemma: string) => ownVerb(vocabulary, language, lemma)
  const selectedToken = selected?.token.key && !selectedEntry ? selected : undefined
  const selectedForms = formsOfSelection(selectedToken, language, vocabulary, freq)

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
          onListened={addListened}
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
          title={current?.title}
        />
      )}

      <ReaderTools
        language={language}
        reader={reader}
        onReader={setReader}
        listenFirst={listenFirst}
        showTurkishButton={canTranslate || !!current?.turkish}
        showTurkish={showTurkish}
        onTurkish={() => setShowTurkish((v) => !v)}
        canPractise={recorded || canSpeak()}
        canShadow={(recorded || canSpeak()) && canRecord()}
        dictating={dictating !== null}
        onDictation={() => (setShadowing(null), setDictating((d) => (d === null ? Math.max(0, heard) : null)))}
        shadowing={shadowing !== null}
        onShadowing={() => (setDictating(null), setShadowing((d) => (d === null ? Math.max(0, heard) : null)))}
        deduce={deduce}
        onDeduce={() => {
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
        showForms={showForms}
        onForms={() => setShowForms((v) => !v)}
        onFinish={() => setConfirmFinish(true)}
        multiMode={multiMode}
        onMulti={() => setMultiMode((m) => !m)}
        onClub={club.code || !club.canStart ? undefined : club.start}
      />
      <ClubBar club={club} words={lookedWords} onWord={showLooked} />
      {showForms && language !== 'en' && <TextForms groups={formGroups} language={language} onOpenLab={onOpenLab} onLesson={onLesson} onReview={reviewForms} onShow={showSentence} onClose={() => setShowForms(false)} />}
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
        {analysis.paragraphs.map((p, i) => {
          const start = paragraphStart[i]
          const inside = (n: number | null) => (n !== null && n >= start && n < start + p.length ? n : null)
          const keys = paragraphKeys[i]
          const selectedKey = selected?.token.key && keys?.has(selected.token.key) ? selected.token.key : undefined
          return (
            <ReaderParagraph
              key={i}
              index={i}
              sentences={p}
              start={start}
              image={current?.images?.[i]}
              litAt={selected?.at?.startsWith(`${i}.`) ? selected.at : undefined}
              litText={selected && !selected.at ? selected.sentence : undefined}
              heard={inside(heard)}
              flash={inside(flash)}
              selectedKey={selectedKey}
              multi={multi.size && keys && [...multi].some((k) => keys.has(k)) ? multi : NO_KEYS}
              looks={club.looks.size && keys && [...keys].some((k) => club.looks.has(k)) ? club.looks : NO_LOOKS}
              multiMode={multiMode}
              skipped={skipped}
              masks={masks}
              revealed={revealed}
              shade={shade}
              turkish={showTurkish && !listenFirst && dictating === null}
              given={current?.turkish?.[i]}
              language={language}
              onPick={pickToken}
              onToggleMulti={onToggleMulti}
            />
          )
        })}
      </article>

      <aside className="reader-aside">
      {!selected && !multi.size && !adding && (
        <p className="reader-hint small muted">Bir kelimeye tıkla: anlamı, cümlesi ve ekleme seçenekleri burada açılır. Klavyeyle ← → yeni kelimeler arasında gezer.</p>
      )}
      {multi.size > 0 && <MultiBar count={multi.size} onMark={markMulti} onClear={() => setMulti(new Set())} />}

      {selected && selected.token.key && (
        <WordCard
          selected={selected as Selected & { token: ReadToken & { key: string } }}
          entry={selectedEntry}
          forms={selectedForms}
          verbEntry={verbEntry}
          language={language}
          sheetBox={sheetBox}
          sheet={sheet}
          deduceMode={deduce}
          rating={deduce && guess && selected.token.key === guess ? <GuessRating word={cleanToken(selected.token.text, language)} language={language} onDone={() => setGuess(null)} /> : undefined}
          ignored={ignored}
          skipped={skipped}
          targetListName={targetListName}
          canListenFrom={!!times}
          canPinHeard={!!times && !current?.cues?.length}
          onPinHeard={pinHeard}
          onClose={() => setSelected(null)}
          onLookUp={onLookUp}
          onOpen={onOpen}
          onOpenLab={onOpenLab}
          onLesson={onLesson}
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
        <AddingCard
          db={db}
          language={language}
          existing={existing}
          adding={adding}
          title={current?.title}
          onSaved={() => {
            setAdding(null)
            setSelected(null)
            onChanged()
          }}
          onCancel={() => setAdding(null)}
        />
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
          <p className="notice sticker-note" role="status">
            <Sticker name="read" size={40} />
            <span>{message}</span>
          </p>
        )}
        {message && <ComprehensionCard key={`cq-${current?.id}`} text={text} language={language} />}
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
