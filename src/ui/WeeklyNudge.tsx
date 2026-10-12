import { useState } from 'react'
import { weekChange, type WeekSummary } from '../engine/weekly'
import { ChartIcon, CloseIcon } from './icons'

const KEY = 'kelime-koc:week-seen'

/** The Sunday of the weekend the card shows on (Sunday and the Monday after it share a key): dismissed on one, hidden on both. */
const weekKey = (d: Date) => {
  const sunday = new Date(d)
  if (d.getDay() === 1) sunday.setDate(d.getDate() - 1)
  return sunday.toDateString()
}

/**
 * The week on Today, on Sunday and Monday (the week's end and the next one's start): days
 * studied, answers and how many were right, new words, readings, how it compares with the week
 * before, and the words missed twice or more.
 */
export function WeeklyNudge({
  line,
  summary,
  lemmaOf,
  now,
  onOpen,
  onWord,
}: {
  line: string
  summary: WeekSummary | null
  lemmaOf: (entryId: string) => string | undefined
  now: Date
  onOpen: () => void
  onWord: (entryId: string) => void
}) {
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(KEY) === weekKey(now)
    } catch {
      return false
    }
  })
  const day = now.getDay()
  if (!line || !summary || hidden || (day !== 0 && day !== 1)) return null
  const missed = (summary.missed ?? []).flatMap((m) => {
    const lemma = lemmaOf(m.entryId)
    return lemma ? [{ ...m, lemma }] : []
  })
  const change = weekChange(summary.answers, summary.lastAnswers)
  const figures: [string, string][] = [
    ['gün çalıştın', `${summary.days}/7`],
    ['cevap', String(summary.answers)],
    ['doğru', summary.answers ? `%${Math.round(summary.right * 100)}` : '—'],
    ['yeni kelime', String(summary.newWords)],
    ['metin', String(summary.texts)],
  ]
  return (
    <section className="card week-card" aria-label="Haftanın özeti">
      <div className="row justify-between items-baseline gap-2">
        <h2 className="section-title">
          <ChartIcon size={18} className="inline-icon" /> Haftanın özeti
        </h2>
        <button
          type="button"
          className="icon-btn icon-btn-sm"
          aria-label="Bu hafta gösterme"
          title="Bu hafta gösterme"
          onClick={() => {
            try {
              localStorage.setItem(KEY, weekKey(now))
            } catch {
              // Hidden for now only.
            }
            setHidden(true)
          }}
        >
          <CloseIcon size={16} />
        </button>
      </div>
      <dl className="week-card-figures">
        {figures.map(([label, value]) => (
          <div key={label}>
            <dd>{value}</dd>
            <dt>{label}</dt>
          </div>
        ))}
      </dl>
      {change && <p className="small muted">{change}</p>}
      {missed.length > 0 && (
        <div className="stack">
          <p className="small muted">Bu hafta takıldığın kelimeler:</p>
          <div className="choice-row">
            {missed.map((m) => (
              <button key={m.entryId} type="button" className="chip chip-sm" onClick={() => onWord(m.entryId)} title={`${m.wrong} kez yanlış`}>
                {m.lemma} · {m.wrong}×
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="row">
        <button type="button" className="btn btn-quiet" onClick={onOpen}>
          İlerleme'ye bak
        </button>
      </div>
    </section>
  )
}
