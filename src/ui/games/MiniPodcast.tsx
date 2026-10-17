import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AiError, miniPodcast, type PodcastScript } from '../../ai'
import { db, scheduler } from '../../data/instance'
import { displayForm } from '../../engine/exercises'
import { pickAudioWords } from '../../engine/practice'
import { createRng } from '../../engine/rng'
import type { TargetLanguage } from '../../engine/types'
import { useAi } from '../aiContext'
import { ChevronLeftIcon, ChevronRightIcon, PauseIcon, PlayIcon } from '../icons'
import { interestsOf } from '../personalInterests'
import { speakAsync, speechPrefs, stopSpeaking } from '../speech'
import { Sticker } from '../Sticker'
import type { Props } from './shared'

/** How many shaky words a talk is built around. */
const WORDS = 6
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms))
const storeKey = (language: TargetLanguage) => `diloloji:podcast:${language}`
const today = () => new Date().toISOString().slice(0, 10)

interface Saved {
  day: string
  script: PodcastScript
  words: string[]
}

function load(language: TargetLanguage): Saved | null {
  try {
    const raw = JSON.parse(localStorage.getItem(storeKey(language)) ?? 'null') as Saved | null
    return raw && Array.isArray(raw.script?.lines) && raw.script.lines.length ? raw : null
  } catch {
    return null
  }
}

function save(language: TargetLanguage, saved: Saved) {
  try {
    localStorage.setItem(storeKey(language), JSON.stringify(saved))
  } catch {
    // Not kept: it is written again next time.
  }
}

/**
 * A short conversation the AI writes around the words that are weakest right now, read aloud line by line
 * (two voices where the device has them) with the Turkish under it. The last one stays on the device, so
 * listening again costs nothing. Passive like the audio review: it never touches the schedule.
 */
export function MiniPodcast({ language, vocabulary, states, onExit }: Props & { onExit: () => void }) {
  const { apiKey, needsApproval } = useAi()
  const [saved, setSaved] = useState<Saved | null>(() => load(language))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [showTurkish, setShowTurkish] = useState(true)
  const [slow, setSlow] = useState(false)
  const run = useRef(0)
  const lock = useRef<{ release: () => Promise<void> } | null>(null)

  const words = useMemo(() => {
    const weak = pickAudioWords(vocabulary, states, scheduler, new Date(), 'weak', createRng(Date.now()), WORDS)
    return weak.length ? weak : pickAudioWords(vocabulary, states, scheduler, new Date(), 'all', createRng(Date.now()), WORDS)
  }, [vocabulary, states])
  const lines = saved?.script.lines ?? []

  const stop = useCallback(() => {
    run.current++
    stopSpeaking()
    setPlaying(false)
    void lock.current?.release().catch(() => {})
    lock.current = null
  }, [])
  useEffect(() => stop, [stop])

  const write = async () => {
    if (!apiKey || busy) return
    stop()
    setBusy(true)
    setError('')
    try {
      const settings = await db.getSettings().catch(() => undefined)
      const script = await miniPodcast(apiKey, {
        language,
        words: words.map((w) => ({ lemma: displayForm(w), gloss: w.senses[0].gloss })),
        interests: interestsOf(settings),
      })
      const next = { day: today(), script, words: words.map(displayForm) }
      save(language, next)
      setSaved(next)
      setIndex(0)
    } catch (e) {
      setError(e instanceof AiError ? e.message : 'Podcast yazılamadı. Biraz sonra tekrar dene.')
    } finally {
      setBusy(false)
    }
  }

  const play = async (from: number) => {
    const me = ++run.current
    setPlaying(true)
    try {
      const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }
      const taken = (await nav.wakeLock?.request('screen')) ?? null
      if (run.current !== me) void taken?.release().catch(() => {})
      else lock.current = taken
    } catch {
      // The screen may dim; audio goes on while the page is open.
    }
    const live = () => run.current === me
    for (let i = from; i < lines.length && live(); i++) {
      setIndex(i)
      await speakAsync(lines[i].text, language, speechPrefs.rate * (slow ? 0.8 : 1), lines[i].speaker === 'B')
      if (live()) await pause(slow ? 1000 : 600)
    }
    if (live()) {
      setPlaying(false)
      setIndex(lines.length)
    }
  }

  // Earphone and lock-screen buttons while it plays.
  const playRef = useRef(play)
  playRef.current = play
  const indexRef = useRef(index)
  indexRef.current = index
  const step = (by: number) => {
    const was = playing
    stop()
    const next = Math.max(0, Math.min(lines.length - 1, index + by))
    setIndex(next)
    if (was) void play(next)
  }
  const stepRef = useRef(step)
  stepRef.current = step
  useEffect(() => {
    const ms = typeof navigator !== 'undefined' ? navigator.mediaSession : undefined
    if (!ms || !playing || !saved) return
    try {
      ms.metadata = new MediaMetadata({ title: saved.script.title, artist: 'Diloloji · Mini podcast' })
      ms.setActionHandler('pause', () => stop())
      ms.setActionHandler('play', () => void playRef.current(indexRef.current))
      ms.setActionHandler('nexttrack', () => stepRef.current(1))
      ms.setActionHandler('previoustrack', () => stepRef.current(-1))
    } catch {
      // No Media Session: the buttons on the screen do the same.
    }
    return () => {
      try {
        for (const a of ['pause', 'play', 'nexttrack', 'previoustrack'] as const) ms.setActionHandler(a, null)
      } catch {
        // Nothing to take away.
      }
    }
  }, [playing, saved, stop])

  const done = lines.length > 0 && index >= lines.length
  return (
    <div className="stack podcast-game">
      <div className="game-top">
        <button className="link" onClick={() => (stop(), onExit())}>
          ← Oyunlar
        </button>
        {lines.length > 0 && !done && (
          <span className="game-timer">
            {index + 1} / {lines.length}
          </span>
        )}
        <span />
      </div>
      <h1 className="greeting">Mini podcast</h1>
      <p className="muted">YZ, en zayıf kelimelerini içeren kısa bir konuşma yazar; sen dinlersin. Yürürken ya da yemek yaparken, ekrana bakmadan.</p>

      {!apiKey && <p className="note">{needsApproval ? 'YZ özellikleri hesabının onaylanmasını bekliyor.' : 'Podcast yazdırmak için Ayarlar → YZ yardımcısı bölümünde bir anahtar gerekiyor.'}</p>}

      {words.length > 0 && (
        <div className="choice-row" aria-label="Konuşmada geçecek kelimeler">
          {(saved && !busy ? saved.words : words.map(displayForm)).map((w) => (
            <span key={w} className="chip chip-sm" lang={language}>
              {w}
            </span>
          ))}
        </div>
      )}
      {words.length === 0 && <p className="muted">Önce birkaç kelime öğren; podcast onlarla yazılır.</p>}

      <div className="row">
        <button className="btn btn-sm" onClick={() => void write()} disabled={!apiKey || busy || words.length === 0}>
          {busy ? 'Yazılıyor…' : saved ? 'Yeni podcast yaz' : 'Podcast yaz'}
        </button>
        {saved && <span className="small muted">Son yazılan: {saved.day === today() ? 'bugün' : saved.day}</span>}
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}

      {saved && !busy && (
        <section className="card stack podcast-player">
          <h2 className="section-title" lang={language}>
            {saved.script.title}
          </h2>
          {done ? (
            <div className="game-result-card">
              <Sticker name="music" size={72} className="sticker-lead" />
              <p className="game-result-headline">Bitti</p>
            </div>
          ) : null}
          <ol className="podcast-lines plain stack gap-2">
            {lines.map((l, i) => (
              <li key={i} className={`podcast-line speaker-${l.speaker}${i === index && !done ? ' podcast-now' : ''}`} aria-current={i === index && !done ? 'true' : undefined}>
                <span className="podcast-who" aria-hidden>
                  {l.speaker}
                </span>
                <span>
                  <span lang={language}>{l.text}</span>
                  {showTurkish && (
                    <>
                      <br />
                      <span className="small muted">{l.translation}</span>
                    </>
                  )}
                </span>
              </li>
            ))}
          </ol>
          <div className="row justify-center">
            {playing ? (
              <button className="btn btn-lg btn-quiet" onClick={stop}>
                <PauseIcon size={18} /> Duraklat
              </button>
            ) : (
              <button className="btn btn-lg" onClick={() => void play(done ? 0 : index)}>
                <PlayIcon size={16} /> {done ? 'Baştan dinle' : index === 0 ? 'Dinle' : 'Devam et'}
              </button>
            )}
            <button className="btn btn-lg btn-quiet" onClick={() => step(-1)} disabled={index === 0} aria-label="Önceki cümle">
              <ChevronLeftIcon size={16} className="inline-icon" />
            </button>
            <button className="btn btn-lg btn-quiet" onClick={() => step(1)} disabled={done} aria-label="Sonraki cümle">
              <ChevronRightIcon size={16} className="inline-icon is-end" />
            </button>
          </div>
          <div className="choice-row">
            <button className="chip chip-sm" aria-pressed={showTurkish} onClick={() => setShowTurkish(!showTurkish)}>
              Türkçesi
            </button>
            <button className="chip chip-sm" aria-pressed={slow} onClick={() => setSlow(!slow)}>
              Yavaş
            </button>
          </div>
        </section>
      )}
    </div>
  )
}
