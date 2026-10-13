import { TapNote, TapWords } from '../TapWords'
import { useTapGloss } from '../useTapGloss'
import { useEffect, useRef, useState } from 'react'
import { BLANK, type ContextSource, type Evaluation } from '../../engine/exercises'
import type { VocabularyEntry } from '../../engine/types'
import { BookIcon, PenIcon, PinIcon, SpeakerIcon } from '../icons'
import { prefs } from '../prefs'
import { canSpeak, isAudioPlaying, playWord } from '../speech'
import { modalOpen } from './keys'
import { ArticleTag } from '../WrittenForm'
import { wordFit } from './wordFit'

/** Plays the word; Alt+S (or Space when not typing) replays it. */
export function SpeakButton({ text, entry, big, auto, vary, rate }: { text: string; entry: VocabularyEntry; big?: boolean; auto?: boolean; vary?: boolean; rate?: number }) {
  // While the audio sounds (or is still loading), the button shows moving bars.
  const [playing, setPlaying] = useState(false)
  const watch = useRef<number | null>(null)
  const play = () => {
    playWord(entry, text, vary, rate)
    setPlaying(true)
    if (watch.current) clearInterval(watch.current)
    const started = performance.now()
    watch.current = window.setInterval(() => {
      const t = performance.now() - started
      // A grace period covers loading; give up after 20 s whatever happens.
      if ((t > 600 && !isAudioPlaying()) || t > 20_000) {
        clearInterval(watch.current!)
        watch.current = null
        setPlaying(false)
      }
    }, 150)
  }
  useEffect(() => () => void (watch.current && clearInterval(watch.current)), [])
  useEffect(() => {
    if (auto && prefs.autoPlay) play()
    // Auto-play once per word, not again when the entry object is updated.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, text, entry.language])

  // Alt+S anywhere, or Space when not typing, replays the audio.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (modalOpen()) return
      const typing = e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement
      if ((e.altKey && e.code === 'KeyS') || (e.code === 'Space' && !typing && !(e.target instanceof HTMLButtonElement))) {
        e.preventDefault()
        play()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // play() depends on exactly these.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, entry, vary, rate])
  if (!canSpeak()) return null
  return (
    <button
      type="button"
      className={`${big ? 'speak speak-big' : 'speak'}${playing ? ' is-playing' : ''}`}
      onClick={play}
      aria-label={playing ? 'Çalıyor' : 'Sesli dinle'}
    >
      {playing ? (
        <span className="sound-bars" aria-hidden>
          <i />
          <i />
          <i />
          <i />
        </span>
      ) : (
        <SpeakerIcon size={big ? 36 : 22} />
      )}
    </button>
  )
}



/** The word in large type, with its article. */
export function Word({ entry }: { entry: VocabularyEntry }) {
  const fit = wordFit(`${entry.article ?? ''} ${entry.lemma}`.trim())
  if (!entry.article)
    return (
      <h1 className="word" style={fit} lang={entry.language}>
        {entry.lemma}
      </h1>
    )
  const sep = entry.article.endsWith("'") ? '' : ' '
  return (
    <h1 className="word" style={fit} lang={entry.language}>
      <ArticleTag article={entry.article} entry={entry} />
      {sep}
      {entry.lemma}
    </h1>
  )
}

/** A sentence with its blank drawn as a line, and its translation. */
export function Sentence({ text, translation, source, blankStart, lang }: { text: string; translation?: string; source?: ContextSource; blankStart?: string; lang?: string }) {
  const parts = text.split(BLANK)
  const tap = useTapGloss(lang)
  return (
    <div>
      {/* lang: a screen reader reads the sentence in its own language, not Turkish. */}
      <p className="sentence" lang={lang}>
        {parts.map((part, i) => (
          <span key={i}>
            <TapWords text={part} tap={tap} />
            {i < parts.length - 1 && (
              <span className="blank" aria-label={blankStart ? `${blankStart} ile başlayan boşluk` : 'boşluk'}>
                {blankStart ? <strong className="blank-start">{blankStart}</strong> : null}____
              </span>
            )}
          </span>
        ))}
      </p>
      <TapNote tap={tap} />
      {translation && <p className="sentence-tr">{translation}</p>}
      {source && (
        <p className="sentence-source">
          {source.kind === 'reading' ? <BookIcon size={14} /> : source.kind === 'own' ? <PenIcon size={14} /> : <PinIcon size={14} />}
          {source.text}
        </p>
      )}
    </div>
  )
}


type LegendMode = 'guess' | 'intro' | 'choice' | 'typed' | 'answered'

const LEGEND_SEEN = 'diloloji:legend-seen'
/** How many questions the legend has been shown for: bright while the shortcuts are new, dim once they are known, gone after that (per device). */
const LEGEND_BRIGHT = 15
const LEGEND_GONE = 60
function useLegendAge(): 'new' | 'known' | 'gone' {
  const [seen] = useState(() => {
    try {
      const n = Number(localStorage.getItem(LEGEND_SEEN)) || 0
      localStorage.setItem(LEGEND_SEEN, String(n + 1))
      return n
    } catch {
      return 0
    }
  })
  return seen < LEGEND_BRIGHT ? 'new' : seen < LEGEND_GONE ? 'known' : 'gone'
}

/**
 * Shortcut reminder for what is on screen right now, only on devices with a hover-capable pointer
 * (i.e. a real keyboard is likely).
 */
export function KeyLegend({ mode, hints, override }: { mode: LegendMode; hints?: boolean; override?: boolean }) {
  const age = useLegendAge()
  if (!prefs.showKeyLegend || age === 'gone') return null
  const k = (...keys: string[]) => keys.map((key, i) => (
    <span key={key}>
      {i > 0 && '+'}
      <kbd>{key}</kbd>
    </span>
  ))
  return (
    <p className={`kbd-legend${age === 'known' ? ' is-faded' : ''}`} aria-hidden>
      {mode === 'guess' && (
        <>
          <span>{k('1')}–<kbd>4</kbd> tahmin et</span>
          <span>{k('0')} fikrim yok</span>
        </>
      )}
      {mode === 'intro' && (
        <>
          <span>{k('Enter')} öğrendim</span>
          <span>{k('B')} zaten biliyorum</span>
        </>
      )}
      {mode === 'choice' && (
        <>
          <span>{k('1')}–<kbd>4</kbd> seç</span>
          {prefs.confidence && <span>{k('Shift', '1')} emin değilim</span>}
          <span>{k('Alt', 'U')} unuttum</span>
        </>
      )}
      {mode === 'typed' && (
        <>
          <span>{k('Enter')} kontrol et</span>
          {prefs.confidence && <span>{k('Shift', 'Enter')} emin değilim</span>}
          {hints && <span>{k('Alt', 'H')} ipucu</span>}
          <span>{k('Alt', 'U')} unuttum</span>
        </>
      )}
      {mode === 'answered' && (
        <>
          <span>{k('Enter')} devam</span>
          {override && <span>{k('Alt', 'D')} cevabım da doğru</span>}
          <span>{k('E')} düzelt</span>
        </>
      )}
      <span>{k('Alt', 'S')} dinle</span>
      <span>{k('Esc')} çık</span>
    </p>
  )
}


/** An evaluation plus optional AI feedback text (free sentences). */
export type Graded = Evaluation & { feedback?: string }
