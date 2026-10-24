import { useState } from 'react'
import { AiError, weekNote } from '../ai'
import type { TargetLanguage } from '../engine/types'
import { weekChange, weekDigest, type WeekSummary } from '../engine/weekly'
import { AskMonki } from './monki/AskMonki'
import { weekPlanAsk } from './monki/asks'
import { useAi } from './aiContext'
import { ChartIcon, CloseIcon, SparkleIcon } from './icons'
import { ERROR_NAME } from './labels'
import { shareCard } from './shareCard'

const KEY = 'kelime-koc:week-seen'
/** The coach's remark on this week, kept so the card shows it again without asking (and paying) twice. */
const NOTE_KEY = 'kelime-koc:week-note'

/** The Sunday of the weekend the card shows on (Sunday and the Monday after it share a key): dismissed on one, hidden on both. */
const weekKey = (d: Date) => {
  const sunday = new Date(d)
  if (d.getDay() === 1) sunday.setDate(d.getDate() - 1)
  return sunday.toDateString()
}

function savedNote(key: string): string {
  try {
    const saved = JSON.parse(localStorage.getItem(NOTE_KEY) ?? 'null') as { key: string; note: string } | null
    return saved?.key === key ? saved.note : ''
  } catch {
    return ''
  }
}

/** With an AI key and a week with enough answers: a coach's short remark on it, asked for with a tap. */
function WeekNote({ language, summary, lemmaOf, week }: { language: TargetLanguage; summary: WeekSummary; lemmaOf: (entryId: string) => string | undefined; week: string }) {
  const { apiKey } = useAi()
  const key = `${week}|${language}`
  const [note, setNote] = useState(() => savedNote(key))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const lines = weekDigest(summary, lemmaOf, (t) => ERROR_NAME[t as keyof typeof ERROR_NAME] ?? t)
  if (!apiKey || !lines) return null
  const plan = <AskMonki label="Monki'yle gelecek haftayı planla" ask={() => weekPlanAsk(lines)} />
  if (note)
    return (
      <>
        <p className="small week-note" role="status">
          <SparkleIcon size={14} className="inline-icon icon-star" /> {note}
        </p>
        {plan}
      </>
    )
  const ask = async () => {
    setBusy(true)
    setError('')
    try {
      const out = await weekNote(apiKey, { language, lines })
      try {
        localStorage.setItem(NOTE_KEY, JSON.stringify({ key, note: out }))
      } catch {
        // Shown now only.
      }
      setNote(out)
    } catch (e) {
      setError(e instanceof AiError ? e.message : 'Yorum hazırlanamadı.')
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <button type="button" className="btn btn-quiet" onClick={() => void ask()} disabled={busy}>
        <SparkleIcon size={16} className="inline-icon icon-star" />
        {busy ? 'Hazırlanıyor…' : 'YZ koçundan yorum'}
      </button>
      {plan}
      {error && (
        <p className="small muted" role="alert">
          {error}
        </p>
      )}
    </>
  )
}

/**
 * The week on Today, on Sunday and Monday (the week's end and the next one's start): days
 * studied, answers and how many were right, new words, readings, how it compares with the week
 * before, and the words missed twice or more.
 */
export function WeeklyNudge({
  language,
  line,
  summary,
  lemmaOf,
  now,
  onOpen,
  onWord,
}: {
  /** For the AI coach's remark (none without it). */
  language?: TargetLanguage
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
        {language && <WeekNote language={language} summary={summary} lemmaOf={lemmaOf} week={weekKey(now)} />}
        <button type="button" className="btn btn-quiet" onClick={onOpen}>
          İlerleme'ye bak
        </button>
        <button
          type="button"
          className="btn btn-quiet"
          onClick={async () => {
            const text = `${summary.days} gün çalıştım, ${summary.answers} cevap verdim${summary.answers ? ` (%${Math.round(summary.right * 100)} doğru)` : ''}, ${summary.newWords} yeni kelime.`
            await shareCard({ kicker: 'Haftam', title: `${summary.days}/7 gün`, text, art: 'week' }, `Haftam: ${text}`)
          }}
        >
          Paylaş
        </button>
      </div>
    </section>
  )
}
