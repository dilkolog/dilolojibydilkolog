import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { displayForm } from '../../engine/exercises'
import { pickAudioWords, type AudioSet } from '../../engine/practice'
import { createRng } from '../../engine/rng'
import { scheduler } from '../../data/instance'
import { playWordAsync, preloadRecording, speakAsync, speakTurkishAsync, speechPrefs, stopSpeaking } from '../speech'
import type { Props } from './shared'
import { ChevronRightIcon, HeadphonesIcon, PauseIcon, PlayIcon } from '../icons'

const AUDIO_SETS: [AudioSet, string][] = [
  ['weak', 'Zayıf kelimeler'],
  ['today', 'Bugün tanıştıklarım'],
  ['all', 'Karışık'],
]
const GAPS = [2, 4, 6]
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms))

/**
 * Hands-free listening. Word → pause → meaning, or meaning → pause → word (recall: say it in
 * your head before you hear it). Passive, so it never touches the schedule.
 */
export function AudioReview({ language, vocabulary, states, onExit }: Props & { onExit: () => void }) {
  const [set, setSet] = useState<AudioSet>('weak')
  const [direction, setDirection] = useState<'target' | 'turkish'>('target')
  const [gap, setGap] = useState(4)
  const [withExample, setWithExample] = useState(false)
  const words = useMemo(() => pickAudioWords(vocabulary, states, scheduler, new Date(), set, createRng(Date.now())), [vocabulary, states, set])
  const [index, setIndex] = useState(0)
  const [reveal, setReveal] = useState(false)
  const [playing, setPlaying] = useState(false)
  const run = useRef(0)
  const lock = useRef<{ release: () => Promise<void> } | null>(null)

  useEffect(() => {
    for (const w of words) void preloadRecording(w.audioId)
  }, [words])

  const stop = useCallback(() => {
    run.current++
    stopSpeaking()
    setPlaying(false)
    void lock.current?.release().catch(() => {})
    lock.current = null
  }, [])
  useEffect(() => stop, [stop])

  const play = async (from: number) => {
    const me = ++run.current
    setPlaying(true)
    // Keep the screen on while listening, where the browser allows it.
    try {
      const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }
      lock.current = (await nav.wakeLock?.request('screen')) ?? null
    } catch {
      // Not available: the screen may dim, audio continues while the page is open.
    }
    const live = () => run.current === me
    for (let i = from; i < words.length && live(); i++) {
      const w = words[i]
      const gloss = w.senses[0].gloss
      setIndex(i)
      setReveal(false)
      if (direction === 'target') {
        await playWordAsync(w)
        if (!live()) return
        await pause(gap * 1000)
        if (!live()) return
        setReveal(true)
        await speakTurkishAsync(gloss)
      } else {
        await speakTurkishAsync(gloss)
        if (!live()) return
        await pause(gap * 1000)
        if (!live()) return
        setReveal(true)
        await playWordAsync(w)
      }
      const example = w.senses[0].examples[0]
      if (withExample && example && live()) {
        await pause(500)
        await speakAsync(example.text, language, speechPrefs.rate * 0.95)
      }
      if (live()) await pause(1200)
    }
    if (live()) {
      setPlaying(false)
      setIndex(words.length)
    }
  }

  const w = words[index]
  const done = index >= words.length && words.length > 0
  return (
    <div className="stack">
      <div className="game-top">
        <button className="link" onClick={() => (stop(), onExit())}>
          ← Oyunlar
        </button>
        {words.length > 0 && !done && (
          <span className="game-timer">
            {index + 1} / {words.length}
          </span>
        )}
        <span />
      </div>
      <h1 className="greeting">Sesli tekrar</h1>
      {!playing && (
        <div className="stack audio-options">
          <div className="choice-row">
            {AUDIO_SETS.map(([v, label]) => (
              <button key={v} className="chip chip-sm" aria-pressed={set === v} onClick={() => (setSet(v), setIndex(0))}>
                {label}
              </button>
            ))}
          </div>
          <div className="choice-row">
            <button className="chip chip-sm" aria-pressed={direction === 'target'} onClick={() => setDirection('target')}>
              Kelime → anlamı
            </button>
            <button className="chip chip-sm" aria-pressed={direction === 'turkish'} onClick={() => setDirection('turkish')}>
              Anlamı → kelime (hatırla)
            </button>
          </div>
          <div className="choice-row">
            <span className="small muted">Düşünme payı:</span>
            {GAPS.map((g) => (
              <button key={g} className="chip chip-sm" aria-pressed={gap === g} onClick={() => setGap(g)}>
                {g} sn
              </button>
            ))}
            <button className="chip chip-sm" aria-pressed={withExample} onClick={() => setWithExample(!withExample)}>
              Örnek cümle de
            </button>
          </div>
        </div>
      )}
      {words.length === 0 ? (
        <p className="muted">Bu seçimde dinlenecek kelime yok.</p>
      ) : done ? (
        <div className="game-result">
          <div className="game-result-card">
            <span className="game-result-badge" aria-hidden>
              <HeadphonesIcon size={32} />
            </span>
            <h2 className="game-result-title">Bitti</h2>
            <p className="game-result-headline">{words.length} kelime dinledin</p>
            <p className="muted game-result-note">Sesli tekrar takvimi etkilemez; asıl tekrarlar günlük görevde.</p>
          </div>
          <div className="game-result-actions">
            <button className="btn btn-lg" onClick={() => play(0)}>
              Baştan dinle
            </button>
          </div>
        </div>
      ) : (
        w && (
          <div className="audio-card card stack">
            <p className="audio-word" lang={language}>
              {direction === 'turkish' && !reveal ? '…' : displayForm(w)}
            </p>
            <p className="gloss">{direction === 'target' && !reveal ? '…' : w.senses[0].gloss}</p>
            <div className="row justify-center">
              {playing ? (
                <button className="btn btn-lg btn-quiet" onClick={stop}>
                  <PauseIcon size={18} /> Duraklat
                </button>
              ) : (
                <button className="btn btn-lg" onClick={() => play(index)} autoFocus>
                  <PlayIcon size={16} /> {index === 0 ? 'Başlat' : 'Devam et'}
                </button>
              )}
              <button
                className="btn btn-lg btn-quiet"
                onClick={() => {
                  const was = playing
                  stop()
                  const next = Math.min(words.length - 1, index + 1)
                  setIndex(next)
                  if (was) void play(next)
                }}
              >
                Sonraki<ChevronRightIcon size={16} className="inline-icon is-end" />
              </button>
            </div>
          </div>
        )
      )}
    </div>
  )
}
