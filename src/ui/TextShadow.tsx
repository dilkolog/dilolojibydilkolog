import { useMemo, useState } from 'react'
import { lastTry, progressLine, shadowKey } from '../engine/shadowScores'
import type { TargetLanguage } from '../engine/types'
import { ShadowControls } from './Shadow'
import { assessPronunciation, azureEnabled } from './pronunciation'
import { loadShadowLog, saveShadowScore } from './shadowStore'

/** Time to say a sentence back: its length when heard (or guessed from its letters), plus a breath. */
const sayMs = (text: string, seconds?: number) => Math.min(15_000, Math.max(2500, seconds ? seconds * 1200 + 1200 : text.length * 85 + 1200))

/**
 * Shadowing the text being read, sentence by sentence: hear it (from the text's own recording
 * when its subtitles time it, else the device's voice), say it straight back in the same rhythm,
 * then hear both in turn. A real speaker's rhythm and linking is what a learner's speech lacks most.
 * Recordings stay in memory and are never saved.
 */
export function TextShadow({
  sentences,
  language,
  start = 0,
  voice,
  hear,
  seconds,
  onClose,
}: {
  sentences: string[]
  language: TargetLanguage
  start?: number
  voice: 'recording' | 'device'
  /** Plays sentence `i` and resolves when it has been heard. */
  hear: (i: number) => Promise<void>
  /** How long sentence `i` lasts in the recording, when known. */
  seconds?: (i: number) => number | undefined
  onClose: () => void
}) {
  // One-word sentences have no rhythm to copy.
  const order = useMemo(() => sentences.map((s, i) => [s, i] as const).filter(([s, i]) => i >= start && s.split(/\s+/).filter(Boolean).length >= 2).map(([, i]) => i), [sentences, start])
  const [step, setStep] = useState(0)
  const [log, setLog] = useState(loadShadowLog)
  const [recording, setRecording] = useState<Blob | null>(null)
  const [scoring, setScoring] = useState<'idle' | 'busy' | 'error'>('idle')
  const [score, setScore] = useState<number | null>(null)
  const index = order[step]
  if (index === undefined) return null
  const sentence = sentences[index]
  const last = step + 1 >= order.length
  const key = shadowKey(language, sentence)
  const before = lastTry(log[key], new Date())

  // Scored with the learner's own pronunciation key, the same one the word check uses.
  const rate = async () => {
    if (!recording) return
    setScoring('busy')
    try {
      const result = await assessPronunciation(recording, sentence, language)
      setLog(saveShadowScore(key, result.score))
      setScore(result.score)
      setScoring('idle')
    } catch {
      setScoring('error')
    }
  }
  const go = (to: number) => {
    setStep(to)
    setRecording(null)
    setScore(null)
    setScoring('idle')
  }

  return (
    <section className="card stack" aria-label="Gölgeleme">
      <div className="row justify-between">
        <strong>
          Gölgeleme · {step + 1} / {order.length}
        </strong>
        <button className="link small" onClick={onClose}>
          Gölgelemeyi bitir
        </button>
      </div>
      <p className="sentence" lang={language}>
        {sentence}
      </p>
      <p className="small muted">
        Dinle, hemen ardından aynı ritimle söyle; sonra ikisini art arda dinle. {voice === 'recording' ? 'Metnin kendi kaydından.' : 'Cihazın sesiyle.'} Kayıt
        saklanmaz.
      </p>
      <ShadowControls
        key={index}
        hear={() => hear(index)}
        ms={sayMs(sentence, seconds?.(index))}
        startLabel="Dinle ve söyle"
        onRecorded={(blob) => {
          setRecording(blob)
          setScore(null)
          setScoring('idle')
        }}
      />
      {azureEnabled() && (
        <div className="stack gap-2 shadow-score">
          {before && score === null && (
            <p className="small muted">
              Bu cümleyi {before.days === 0 ? 'bugün' : before.days === 1 ? 'dün' : `${before.days} gün önce`} söylemiştin: %{before.try.score}.
            </p>
          )}
          {recording && score === null && (
            <div className="row">
              <button type="button" className="btn btn-sm" onClick={() => void rate()} disabled={scoring === 'busy'}>
                {scoring === 'busy' ? 'Puanlanıyor…' : 'Puanla'}
              </button>
            </div>
          )}
          {scoring === 'error' && <p className="small error">Puanlanamadı; Ayarlar’daki Azure anahtarını ve bağlantını kontrol et.</p>}
          {score !== null && (
            <p role="status" className="small">
              <strong>Puanın: %{score}.</strong> {progressLine(log[key])}
            </p>
          )}
        </div>
      )}
      <div className="row">
        <button className="btn btn-quiet btn-sm" disabled={step === 0} onClick={() => go(step - 1)}>
          Önceki
        </button>
        <button className="btn btn-sm" onClick={() => (last ? onClose() : go(step + 1))}>
          {last ? 'Tamam' : 'Sonraki'}
        </button>
      </div>
    </section>
  )
}
