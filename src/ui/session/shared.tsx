import { useEffect } from 'react'
import { BLANK, type Evaluation } from '../../engine/exercises'
import type { VocabularyEntry } from '../../engine/types'
import { SpeakerIcon } from '../icons'
import { prefs } from '../prefs'
import { canSpeak, playWord } from '../speech'
import { modalOpen } from './keys'

/** Plays the word; Alt+S (or Space when not typing) replays it. */
export function SpeakButton({ text, entry, big, auto, vary, rate }: { text: string; entry: VocabularyEntry; big?: boolean; auto?: boolean; vary?: boolean; rate?: number }) {
  useEffect(() => {
    if (auto && prefs.autoPlay) playWord(entry, text, vary, rate)
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
        playWord(entry, text, vary, rate)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [text, entry, vary, rate])
  if (!canSpeak()) return null
  return (
    <button
      type="button"
      className={big ? 'speak speak-big' : 'speak'}
      onClick={() => playWord(entry, text, vary, rate)}
      aria-label="Sesli dinle"
    >
      <SpeakerIcon size={big ? 36 : 22} />
    </button>
  )
}

/** The word in large type, with its article. */
export function Word({ entry }: { entry: VocabularyEntry }) {
  if (!entry.article) return <h1 className="word">{entry.lemma}</h1>
  const sep = entry.article.endsWith("'") ? '' : ' '
  return (
    <h1 className="word">
      <span className="article">{entry.article}</span>
      {sep}
      {entry.lemma}
    </h1>
  )
}

/** A sentence with its blank drawn as a line, and its translation. */
export function Sentence({ text, translation }: { text: string; translation?: string }) {
  const parts = text.split(BLANK)
  return (
    <div>
      <p className="sentence">
        {parts.map((part, i) => (
          <span key={i}>
            {part}
            {i < parts.length - 1 && (
              <span className="blank" aria-label="boşluk">
                ____
              </span>
            )}
          </span>
        ))}
      </p>
      {translation && <p className="sentence-tr">{translation}</p>}
    </div>
  )
}


type LegendMode = 'guess' | 'intro' | 'choice' | 'typed' | 'answered'

/**
 * Shortcut reminder for what is on screen right now, only on devices with a hover-capable pointer
 * (i.e. a real keyboard is likely).
 */
export function KeyLegend({ mode, hints, override }: { mode: LegendMode; hints?: boolean; override?: boolean }) {
  if (!prefs.showKeyLegend) return null
  const k = (...keys: string[]) => keys.map((key, i) => (
    <span key={key}>
      {i > 0 && '+'}
      <kbd>{key}</kbd>
    </span>
  ))
  return (
    <p className="kbd-legend" aria-hidden>
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
        </>
      )}
      {mode === 'typed' && (
        <>
          <span>{k('Enter')} kontrol et</span>
          {prefs.confidence && <span>{k('Shift', 'Enter')} emin değilim</span>}
          {hints && <span>{k('Alt', 'H')} ipucu</span>}
        </>
      )}
      {mode === 'answered' && (
        <>
          <span>{k('Enter')} devam</span>
          {override && <span>{k('Alt', 'D')} cevabım da doğru</span>}
        </>
      )}
      <span>{k('Alt', 'S')} dinle</span>
      <span>{k('Esc')} çık</span>
    </p>
  )
}


/** An evaluation plus optional AI feedback text (free sentences). */
export type Graded = Evaluation & { feedback?: string }
