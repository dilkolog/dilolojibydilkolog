import { useState } from 'react'
import { AlertIcon, UmbrellaIcon } from './icons'
import type { Settings } from '../data/db'
import { localDate } from '../engine/progress'

/** Monday first, as Turkish calendars are; values are Date#getDay indices. */
const WEEK: { day: number; label: string }[] = [
  { day: 1, label: 'Pzt' },
  { day: 2, label: 'Sal' },
  { day: 3, label: 'Çar' },
  { day: 4, label: 'Per' },
  { day: 5, label: 'Cum' },
  { day: 6, label: 'Cmt' },
  { day: 0, label: 'Paz' },
]
const NEXT: Record<string, number> = { '1': 0.5, '0.5': 0, '0': 1 }
const STATE_NAME: Record<string, string> = { '1': 'Normal', '0.5': 'Hafif', '0': 'Dinlenme' }

const fmt = (key: string) => new Date(`${key}T12:00:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })

/**
 * Easy days and holidays: reviews are spread so that light days get about half the load, rest
 * days and holidays none (Anki's "easy days"), and neither breaks the streak.
 */
export function StudyCalendar({ settings, onChange }: { settings: Settings; onChange: (s: Settings) => void }) {
  const today = localDate(new Date())
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(today)
  const weights = settings.dayWeights
  const vacation = settings.vacation && settings.vacation.to >= today ? settings.vacation : null
  const rest = WEEK.filter((d) => weights[d.day] === 0).length

  const setDay = (day: number) => {
    const next = [...weights]
    next[day] = NEXT[String(weights[day] ?? 1)] ?? 1
    // At least one normal-or-light day, or nothing could ever be scheduled.
    if (next.some((w) => w > 0)) onChange({ ...settings, dayWeights: next })
  }

  return (
    <section className="card stack">
      <h2 className="section-title">Çalışma takvimi</h2>
      <p className="small muted">
        Bir güne dokunarak değiştir: <strong>Hafif</strong> günlere tekrarların yaklaşık yarısı, <strong>Dinlenme</strong> günlerine hiç tekrar düşmez; yeni
        kelime de o oranda gelir. Tekrarlar hatırlamanı etkilemeyecek kadar kaydırılır ve kalabalık günlerden boş günlere yayılır. Dinlenme günleri
        seriyi bozmaz.
      </p>
      <div className="week-row" role="group" aria-label="Haftanın günleri">
        {WEEK.map(({ day, label }) => {
          const w = String(weights[day] ?? 1)
          return (
            <button key={day} type="button" className={`week-day w-${w.replace('.', '')}`} onClick={() => setDay(day)} aria-label={`${label}: ${STATE_NAME[w]}`}>
              <strong>{label}</strong>
              <span>{STATE_NAME[w]}</span>
            </button>
          )
        })}
      </div>
      {rest >= 3 && <p className="small muted"><AlertIcon size={14} className="inline-icon" />Haftada {rest} dinlenme günü var; tekrarlar kalan günlere sıkışır.</p>}

      <h3 className="subhead">Tatil</h3>
      {vacation ? (
        <div className="row">
          <span>
            <UmbrellaIcon size={16} className="inline-icon" />{fmt(vacation.from)} – {fmt(vacation.to)} {vacation.from <= today ? 'tatildesin' : 'tatil planlandı'}: bu günlere tekrar düşmez, serin bekler.
          </span>
          <button className="btn btn-sm btn-quiet" onClick={() => onChange({ ...settings, vacation: null })}>
            {vacation.from <= today ? 'Tatili bitir' : 'Tatili iptal et'}
          </button>
        </div>
      ) : (
        <>
          <p className="small muted">Önceden girersen tatilde vadesi gelecek tekrarlar öncesine ve sonrasına yayılır; dönüşte hepsi bir anda gelmez.</p>
          <div className="row">
            <label className="field">
              <span className="small">Başlangıç</span>
              <input type="date" className="input" value={from} min={today} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label className="field">
              <span className="small">Bitiş</span>
              <input type="date" className="input" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
            </label>
            <button className="btn btn-quiet" disabled={!from || !to || to < from} onClick={() => onChange({ ...settings, vacation: { from, to } })} style={{ alignSelf: 'end' }}>
              Tatili planla
            </button>
          </div>
        </>
      )}
    </section>
  )
}
