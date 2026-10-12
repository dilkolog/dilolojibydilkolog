import { useEffect, useRef, useState } from 'react'
import { Help } from './SettingHelp'
import { historiesFrom, MIN_REVIEWS, scoredReviews, type FitResult } from '../engine/optimizer'
import type { Settings } from '../data/db'
import { db } from '../data/instance'

/**
 * Personal memory model: refits FSRS to the learner's own answers. Runs in a worker, and the
 * new weights replace the defaults only if they predict unseen answers better.
 */
export function MemoryModel({ settings, onChange, id }: { settings: Settings; onChange: (s: Settings) => void; id?: string }) {
  const [reviews, setReviews] = useState<number | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    db.events.toArray().then((events) => setReviews(scoredReviews(historiesFrom(events))))
  }, [settings.fsrsFit])

  // The calculation in progress: leaving the screen ends it (it kept running, and answered into a screen that was gone).
  const running = useRef<Worker | null>(null)
  useEffect(() => () => running.current?.terminate(), [])

  const fit = async () => {
    if (running.current) return
    setMessage(null)
    setProgress(0)
    const histories = historiesFrom(await db.events.toArray())
    const worker = new Worker(new URL('../engine/optimizer.worker.ts', import.meta.url), { type: 'module' })
    running.current = worker
    worker.onmessage = (e: MessageEvent<{ type: 'progress'; done: number } | { type: 'done'; result: FitResult }>) => {
      if (e.data.type === 'progress') return setProgress(e.data.done)
      const r = e.data.result
      worker.terminate()
      running.current = null
      setProgress(null)
      const pct = Math.round(r.improvement * 1000) / 10
      if (r.improvement > 0) {
        onChange({ ...settings, fsrsWeights: r.weights, fsrsFit: { at: new Date().toISOString(), reviews: r.reviews, improvement: r.improvement } })
        setMessage({ ok: true, text: `Kişisel model hazır: görmediği cevapları %${pct.toString().replace('.', ',')} daha iyi tahmin ediyor. Bundan sonraki tekrarlar buna göre planlanacak.` })
      } else {
        setMessage({ ok: true, text: 'Varsayılan model seni zaten iyi tahmin ediyor; değiştirmedim. Daha çok tekrardan sonra yeniden dene.' })
      }
    }
    worker.onerror = () => {
      worker.terminate()
      running.current = null
      setProgress(null)
      setMessage({ ok: false, text: 'Model hesaplanamadı.' })
    }
    worker.postMessage(histories)
  }

  const enough = (reviews ?? 0) >= MIN_REVIEWS
  const fitInfo = settings.fsrsFit
  return (
    <section className="card stack" id={id}>
      <h2 className="section-title">Hafıza modeli</h2>
      <Help text="Tekrar zamanlarını FSRS belirler; yeterince cevabın olunca senin unutma hızına göre ayarlanabilir. Varsayılan ayarları milyonlarca kişinin ortalamasıdır. Yeni ayarlar ancak senin görmediği cevaplarını daha iyi tahmin ederse kullanılır." />
      <p className="small">
        {fitInfo && settings.fsrsWeights
          ? `Kişisel model kullanılıyor (${new Date(fitInfo.at).toLocaleDateString('tr-TR')}, ${fitInfo.reviews} tekrardan).`
          : 'Varsayılan model kullanılıyor.'}{' '}
        {reviews !== null && !enough && `Kişiselleştirmek için en az ${MIN_REVIEWS} tekrar gerekiyor (aynı gün içindeki tekrarlar sayılmaz); şu an ${reviews}.`}
      </p>
      {progress !== null && (
        <div className="progress" role="progressbar" aria-label="Kişisel modelin hesaplanması" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
          <div style={{ width: `${Math.max(4, progress * 100)}%` }} />
        </div>
      )}
      <div className="row">
        <button className="btn btn-quiet" onClick={fit} disabled={!enough || progress !== null}>
          {progress !== null ? 'Hesaplanıyor…' : settings.fsrsWeights ? 'Modeli yeniden ayarla' : 'Modeli bana göre ayarla'}
        </button>
        {settings.fsrsWeights && (
          <button className="link small" onClick={() => onChange({ ...settings, fsrsWeights: null, fsrsFit: null })}>
            Varsayılana dön
          </button>
        )}
      </div>
      {message && (
        <p className={message.ok ? 'notice' : 'error'} role="status">
          {message.text}
        </p>
      )}
    </section>
  )
}
