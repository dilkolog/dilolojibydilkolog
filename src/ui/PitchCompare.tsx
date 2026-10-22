import { useEffect, useRef, useState } from 'react'
import { contour, melodySimilarity, pitchTrack, resample } from '../engine/pitch'
import { trendLine, type ShadowTry } from '../engine/shadowScores'
import { canRecord, recordingType } from './audioRecord'
import { MicIcon, PlayIcon, StopIcon } from './icons'
import { loadPitchLog, savePitchScore } from './pitchStore'
import { StatusPicture } from './StatusArt'

const W = 560
const H = 140
const RANGE = 10 // semitones shown above and below the median

async function decode(source: ArrayBuffer): Promise<(number | null)[]> {
  const ctx = new AudioContext()
  try {
    const audio = await ctx.decodeAudioData(source)
    return contour(pitchTrack(audio.getChannelData(0), audio.sampleRate))
  } finally {
    void ctx.close()
  }
}

/**
 * Melody comparison: the native recording's pitch contour and yours, drawn over each other, with
 * a similarity score. Stress and intonation become visible, which listening alone rarely shows.
 * `reference` must be readable by the page (a Wiktionary recording, a natural-voice clip).
 */
export function PitchCompare({
  reference,
  label,
  maxSeconds = 4,
  scoreKey,
}: {
  reference: () => Promise<string | undefined>
  label: string
  maxSeconds?: number
  /** Where each try's score is kept (a word), so its line over time can be shown; none keeps nothing. */
  scoreKey?: string
}) {
  const [tries, setTries] = useState<ShadowTry[]>(() => (scoreKey ? (loadPitchLog()[scoreKey] ?? []) : []))
  const [native, setNative] = useState<(number | null)[] | null>(null)
  const [nativeUrl, setNativeUrl] = useState<string>()
  const [mine, setMine] = useState<(number | null)[] | null>(null)
  const [mineUrl, setMineUrl] = useState<string>()
  const [phase, setPhase] = useState<'idle' | 'recording' | 'working'>('idle')
  const [error, setError] = useState('')
  const [micBlocked, setMicBlocked] = useState(false)
  const recorder = useRef<MediaRecorder | null>(null)

  useEffect(
    () => () => {
      if (mineUrl) URL.revokeObjectURL(mineUrl)
    },
    [mineUrl],
  )

  const loadNative = async () => {
    if (native) return native
    const url = await reference()
    if (!url) throw new Error('no reference')
    const c = await decode(await (await fetch(url)).arrayBuffer())
    setNative(c)
    setNativeUrl(url)
    return c
  }

  const playNative = async () => {
    setError('')
    try {
      await loadNative()
      const url = nativeUrl ?? (await reference())
      if (url) void new Audio(url).play()
    } catch {
      setError('Doğru telaffuz kaydı açılamadı.')
    }
  }

  const record = async () => {
    setError('')
    if (phase === 'recording') return recorder.current?.stop()
    setMicBlocked(false)
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      setMicBlocked(true)
      setError('Mikrofona erişilemedi.')
      return
    }
    const rec = new MediaRecorder(stream, { mimeType: recordingType() })
    recorder.current = rec
    const chunks: Blob[] = []
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)
    rec.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop())
      setPhase('working')
      try {
        const blob = new Blob(chunks, { type: rec.mimeType })
        setMineUrl(URL.createObjectURL(blob))
        const [c, ref] = await Promise.all([decode(await blob.arrayBuffer()), loadNative()])
        setMine(c)
        if (!c.length) setError('Sesin algılanamadı; mikrofona biraz daha yakın ve net söyle.')
        const s = c.length ? melodySimilarity(ref, c) : null
        if (s !== null && scoreKey) setTries(savePitchScore(scoreKey, s))
      } catch {
        setError('Kayıt çözümlenemedi.')
      } finally {
        setPhase('idle')
      }
    }
    setPhase('recording')
    rec.start()
    setTimeout(() => rec.state === 'recording' && rec.stop(), maxSeconds * 1000)
  }

  if (!canRecord()) return null
  const score = native && mine?.length ? melodySimilarity(native, mine) : null
  const path = (c: (number | null)[]) => {
    const pts = resample(c, 120)
    let d = ''
    let pen = false
    pts.forEach((v, i) => {
      if (v === null) {
        pen = false
        return
      }
      const x = 8 + (i / (pts.length - 1)) * (W - 16)
      const y = H / 2 - (Math.max(-RANGE, Math.min(RANGE, v)) / RANGE) * (H / 2 - 10)
      d += `${pen ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`
      pen = true
    })
    return d
  }

  return (
    <div className="pitch stack">
      <div className="row">
        <button className="btn btn-sm btn-quiet" onClick={playNative}>
          <PlayIcon size={16} /> Doğrusu
        </button>
        <button className={`btn btn-sm${phase === 'recording' ? ' btn-bad' : ''}`} onClick={record} disabled={phase === 'working'}>
          {phase === 'recording' ? <><StopIcon size={14} className="inline-icon" />Bitir</> : phase === 'working' ? 'Çözümleniyor…' : <><MicIcon size={16} className="inline-icon" />Sen söyle</>}
        </button>
        {mineUrl && (
          <button className="btn btn-sm btn-quiet" onClick={() => void new Audio(mineUrl).play()}>
            <PlayIcon size={16} /> Seninki
          </button>
        )}
        <span className="small muted">{label}</span>
      </div>
      {(native || mine) && (
        <svg viewBox={`0 0 ${W} ${H}`} className="pitch-chart" role="img" aria-label="Ezgi karşılaştırması">
          <line x1={0} x2={W} y1={H / 2} y2={H / 2} className="mc-grid" />
          {native && <path d={path(native)} className="pitch-native" />}
          {mine && mine.length > 0 && <path d={path(mine)} className="pitch-mine" />}
        </svg>
      )}
      {(native || mine) && (
        <p className="small muted">
          <span className="mc-key pitch-key-native" /> ana dili konuşan <span className="mc-key pitch-key-mine" /> sen
          {score !== null && (
            <>
              {' '}
              · Ezgi benzerliği <strong>%{score}</strong>
              {score >= 75 ? ': çok yakın' : score >= 50 ? ': iniş çıkışlar kısmen tutuyor, vurguyu dinleyip tekrar dene' : ': ezgi farklı; doğrusunu birkaç kez dinle, vurgulu heceye dikkat et'}
            </>
          )}
        </p>
      )}
      {tries.length >= 2 && <PitchTrend tries={tries} />}
      {micBlocked && <StatusPicture kind="nomic" small />}
      {error && <p className="error small">{error}</p>}
    </div>
  )
}

/** A word's melody scores over its tries: a small line from the first to the latest, and the change in words. */
function PitchTrend({ tries }: { tries: readonly ShadowTry[] }) {
  const w = 120
  const h = 28
  const points = tries.map((t, i) => `${(4 + (i / Math.max(1, tries.length - 1)) * (w - 8)).toFixed(1)},${(h - 4 - (t.score / 100) * (h - 8)).toFixed(1)}`).join(' ')
  return (
    <p className="small muted row gap-2 pitch-trend">
      <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} aria-hidden="true">
        <polyline points={points} />
      </svg>
      <span>{trendLine(tries)}</span>
    </p>
  )
}
