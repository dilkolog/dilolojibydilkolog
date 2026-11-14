import { useEffect, useRef, useState } from 'react'
import { canSpeak, speakAsync, stopSpeaking } from '../../shared/speech'
import type { PteMode } from './pteMode'

/**
 * The recording of an item, in the device's voice: in exam mode it may be played `listens` times (once on the PTE),
 * in practice mode as often as wanted. `onEnded` runs when a play finishes (the microphone or the clock starts then).
 */
export function usePteAudio(text: string, mode: PteMode, listens: number, onEnded?: () => void) {
  const [plays, setPlays] = useState(0)
  const [playing, setPlaying] = useState(false)
  const alive = useRef(true)
  const ended = useRef(onEnded)
  ended.current = onEnded
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      stopSpeaking()
    }
  }, [])
  const left = mode === 'exam' ? Math.max(0, listens - plays) : Infinity
  const play = async () => {
    if (playing || left <= 0) return
    setPlays((n) => n + 1)
    setPlaying(true)
    try {
      await speakAsync(text, 'en')
    } finally {
      if (alive.current) {
        setPlaying(false)
        ended.current?.()
      }
    }
  }
  return { play, plays, playing, left, canPlay: canSpeak() }
}

/** Seconds left of an exam clock; `onDone` once when it reaches zero. Not running: the full time, nothing happens. */
export function useCountdown(seconds: number | null, running: boolean, onDone: () => void): number | null {
  const [left, setLeft] = useState(seconds)
  const done = useRef(onDone)
  done.current = onDone
  useEffect(() => {
    setLeft(seconds)
    if (!running || seconds === null) return
    const end = Date.now() + seconds * 1000
    const t = window.setInterval(() => {
      const s = Math.max(0, Math.ceil((end - Date.now()) / 1000))
      setLeft(s)
      if (s === 0) {
        window.clearInterval(t)
        done.current()
      }
    }, 250)
    return () => window.clearInterval(t)
  }, [seconds, running])
  return left
}

/** Below this loudness (RMS of the samples) a moment counts as silence. */
const QUIET_RMS = 0.01

/**
 * Calls `onSilent` once when the microphone has carried no sound for `seconds` (counted from now, so saying nothing at
 * all closes it too). Returns a function that stops watching.
 */
export function watchSilence(stream: MediaStream, seconds: number, onSilent: () => void): () => void {
  let ctx: AudioContext
  try {
    ctx = new AudioContext()
  } catch {
    return () => {}
  }
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 2048
  ctx.createMediaStreamSource(stream).connect(analyser)
  const samples = new Float32Array(analyser.fftSize)
  let loudAt = Date.now()
  const t = window.setInterval(() => {
    analyser.getFloatTimeDomainData(samples)
    let sum = 0
    for (const v of samples) sum += v * v
    if (Math.sqrt(sum / samples.length) > QUIET_RMS) loudAt = Date.now()
    else if (Date.now() - loudAt > seconds * 1000) {
      stop()
      onSilent()
    }
  }, 100)
  const stop = () => {
    window.clearInterval(t)
    void ctx.close().catch(() => {})
  }
  return stop
}
