import { useEffect, useRef, useState } from 'react'
import type { TargetLanguage } from '../engine/types'
import { canRecord, recordingType } from './audioRecord'
import { canSpeak, speakAsync, unlockedAudio } from './speech'
import { MicIcon, PlayIcon } from './icons'

/** Time to say a sentence back: about as long as hearing it, plus a breath. */
const answerMs = (text: string) => Math.min(15_000, Math.max(2500, text.length * 85 + 1200))

/**
 * Shadowing: hear the sentence, say it straight back, then hear both one after the other.
 * Repeating whole sentences trains rhythm and connected speech, not just single words.
 * The recording stays in memory and is never saved.
 */
export function ShadowButton({ text, language }: { text: string; language: TargetLanguage }) {
  if (!canSpeak()) return null
  return <ShadowControls hear={() => speakAsync(text, language)} ms={answerMs(text)} />
}

/**
 * The shadowing steps for any voice: `hear` plays the model (the device reading a sentence, or a
 * stretch of a recording) and resolves when it ends; then `ms` of recording, then both in turn.
 */
export function ShadowControls({ hear, ms: answer, startLabel = 'Gölgele' }: { hear: () => Promise<void>; ms: number; startLabel?: string }) {
  const [phase, setPhase] = useState<'idle' | 'hear' | 'speak' | 'done'>('idle')
  const [error, setError] = useState('')
  const [url, setUrl] = useState<string>()
  const [until, setUntil] = useState(0)
  const [, tick] = useState(0)
  const live = useRef(true)

  // Leaving the screen ends a recording in progress; the recording's address is let go when it changes or at the end.
  useEffect(() => {
    live.current = true
    return () => {
      live.current = false
    }
  }, [])
  useEffect(() => () => (url ? URL.revokeObjectURL(url) : undefined), [url])

  useEffect(() => {
    if (phase !== 'speak') return
    const t = setInterval(() => tick((n) => n + 1), 100)
    return () => clearInterval(t)
  }, [phase])

  if (!canRecord()) return null

  const start = async () => {
    setError('')
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setError('Mikrofona erişilemedi.')
      return
    }
    setPhase('hear')
    await hear()
    if (!live.current) return stream.getTracks().forEach((t) => t.stop())
    const rec = new MediaRecorder(stream, { mimeType: recordingType() })
    const chunks: Blob[] = []
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop())
      if (!live.current) return
      setUrl(URL.createObjectURL(new Blob(chunks, { type: rec.mimeType })))
      setPhase('done')
    }
    const ms = answer
    setUntil(performance.now() + ms)
    setPhase('speak')
    rec.start()
    setTimeout(() => rec.state === 'recording' && rec.stop(), ms)
  }

  const compare = async () => {
    if (!url) return
    const mine = await unlockedAudio(url)
    await hear()
    await new Promise((r) => setTimeout(r, 300))
    await mine.play().catch(() => {})
  }

  const left = Math.max(0, until - performance.now())
  return (
    <span className="shadow">
      {phase === 'idle' && (
        <button className="link small" onClick={start} title="Dinle, hemen tekrar et, sonra karşılaştır">
          <MicIcon size={18} /> {startLabel}
        </button>
      )}
      {phase === 'hear' && <span className="small muted">Dinle…</span>}
      {phase === 'speak' && (
        <span className="small shadow-rec">
          ● Şimdi sen söyle <span className="shadow-bar" style={{ transform: `scaleX(${Math.max(0, Math.min(1, left / answer))})` }} />
        </span>
      )}
      {phase === 'done' && (
        <>
          <button className="link small" onClick={compare}>
            <PlayIcon size={16} /> Karşılaştır
          </button>
          <button className="link small" onClick={start}>
            Tekrar
          </button>
        </>
      )}
      {error && <span className="small error">{error}</span>}
    </span>
  )
}
