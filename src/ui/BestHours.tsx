import { useEffect, useMemo, useState } from 'react'
import { BulbIcon } from './icons'
import type { KelimeDB } from '../data/db'
import { hourAdvice, hourBuckets, MIN_ANSWERS, type HourAdvice } from '../engine/hours'
import type { ReviewEvent } from '../engine/types'

function useHourData(db: KelimeDB) {
  const [events, setEvents] = useState<ReviewEvent[] | null>(null)
  useEffect(() => {
    void db.eventsSince(new Date(Date.now() - 90 * 86_400_000)).then(setEvents)
  }, [db])
  return useMemo(() => {
    if (!events) return null
    const buckets = hourBuckets(events, new Date())
    return { buckets, advice: hourAdvice(buckets) }
  }, [events])
}

const pct = (x: number) => Math.round(x * 100)

/** Accuracy by time of day over the last 90 days (all languages). */
export function BestHoursCard({ db }: { db: KelimeDB }) {
  const data = useHourData(db)
  if (!data || data.buckets.filter((b) => b.total >= MIN_ANSWERS).length < 2) return null
  const { buckets, advice } = data
  return (
    <section className="section stack">
      <h2 className="section-title">Günün hangi saatinde daha iyisin</h2>
      <p className="small muted">
        Son 90 günün cevapları saat dilimlerine göre. Dikkat ve hatırlama gün içinde kişiden kişiye değişen bir ritim izler; senin ritmin bu. (En az {MIN_ANSWERS}{' '}
        cevabı olan dilimler karşılaştırılır.)
      </p>
      <ul className="hour-list">
        {buckets.map((b) => (
          <li key={b.from} className={`${b.total < MIN_ANSWERS ? 'is-thin' : ''}${advice?.best.from === b.from ? ' is-best' : ''}`}>
            <span className="hour-label">{b.label}</span>
            <span className="hour-bar">
              <span style={{ width: `${b.total >= MIN_ANSWERS ? pct(b.accuracy) : 0}%` }} />
            </span>
            <span className="hour-pct">{b.total >= MIN_ANSWERS ? `%${pct(b.accuracy)}` : '—'}</span>
            <span className="small muted">{b.total} cevap</span>
          </li>
        ))}
      </ul>
      {advice && (
        <p className="small">
          En iyi dilimin <strong>{advice.best.label}</strong> (%{pct(advice.best.accuracy)} doğru), en zayıfı {advice.worst.label} (%{pct(advice.worst.accuracy)}). Zor
          işleri (yeni kelimeler, üretim) iyi saatlerine koymaya çalış; hatırlatıcıyı Ayarlar'dan {advice.reminder}'e alabilirsin.
        </p>
      )}
    </section>
  )
}

/** One line under the reminder setting: the suggested time and a button to use it. */
export function ReminderSuggestion({ db, current, onApply }: { db: KelimeDB; current: string; onApply: (time: string) => void }) {
  const data = useHourData(db)
  const advice: HourAdvice | null | undefined = data?.advice
  if (!advice || advice.reminder === current) return null
  return (
    <p className="small">
      <BulbIcon size={16} className="inline-icon" />Cevaplarına göre en iyi saatlerin {advice.best.label} (%{pct(advice.best.accuracy)} doğru).{' '}
      <button className="link small" onClick={() => onApply(advice.reminder)}>
        Hatırlatıcıyı {advice.reminder}'e al
      </button>
    </p>
  )
}
