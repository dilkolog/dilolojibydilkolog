import { useEffect, useRef, useState } from 'react'
import { canRecord, recordingType } from './audioRecord'
import { StatusPicture } from './StatusArt'

/** Max length of a word recording; long enough for a phrase, short enough to stay small. */
const MAX_MS = 8000

/**
 * Record your own pronunciation of a word. Saying it yourself leaves a stronger memory trace
 * than only hearing it, and your recording replaces the synthetic voice for this word.
 */
export function AudioRecorder({ onSave }: { onSave: (blob: Blob) => void }) {
  const [state, setState] = useState<'idle' | 'recording' | 'review'>('idle')
  const [error, setError] = useState('')
  const [micBlocked, setMicBlocked] = useState(false)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [url, setUrl] = useState<string>()
  const recorder = useRef<MediaRecorder | null>(null)
  const timer = useRef<number>(undefined)

  useEffect(() => () => {
    if (url) URL.revokeObjectURL(url)
  }, [url])

  const start = async () => {
    setError('')
    setMicBlocked(false)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const rec = new MediaRecorder(stream, { mimeType: recordingType() })
      const chunks: Blob[] = []
      rec.ondataavailable = (e) => e.data.size && chunks.push(e.data)
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop())
        const b = new Blob(chunks, { type: rec.mimeType })
        if (!b.size) {
          setError('Kayıt boş geldi. Mikrofonun açık olduğundan emin olup tekrar dene.')
          setState('idle')
          return
        }
        setBlob(b)
        setUrl(URL.createObjectURL(b))
        setState('review')
      }
      recorder.current = rec
      rec.start()
      setState('recording')
      timer.current = window.setTimeout(stop, MAX_MS)
    } catch {
      setMicBlocked(true)
      setError('Mikrofona erişilemedi. Tarayıcının mikrofon iznini kontrol et.')
    }
  }

  const stop = () => {
    window.clearTimeout(timer.current)
    if (recorder.current?.state === 'recording') recorder.current.stop()
  }

  if (!canRecord()) return <p className="small muted">Bu tarayıcı ses kaydını desteklemiyor.</p>

  return (
    <div className="stack">
      <div className="row">
        {state === 'recording' ? (
          <button className="btn btn-bad" onClick={stop}>
            <span className="rec-dot" aria-hidden /> Durdur
          </button>
        ) : (
          <button className="btn btn-quiet" onClick={start}>
            <span className="rec-dot" aria-hidden /> {state === 'review' ? 'Yeniden kaydet' : 'Kaydet'}
          </button>
        )}
        {state === 'review' && url && (
          <>
            <audio src={url} controls className="audio-preview" />
            <button className="btn" onClick={() => blob && onSave(blob)}>
              Bu kaydı kullan
            </button>
          </>
        )}
      </div>
      {state === 'recording' && <p className="small muted">Kelimeyi söyle… (en fazla {MAX_MS / 1000} saniye)</p>}
      {micBlocked && <StatusPicture kind="nomic" />}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
