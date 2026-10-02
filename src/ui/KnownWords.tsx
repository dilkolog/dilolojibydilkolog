import { useEffect, useState } from 'react'
import { State } from 'ts-fsrs'
import type { KelimeDB } from '../data/db'
import { localDate } from '../engine/progress'
import { readingKey } from '../engine/reading'
import type { TargetLanguage, UserWordState, VocabularyEntry } from '../engine/types'
import { LANGUAGE_NAME } from './labels'

/**
 * The known-word count, the main yardstick of extensive-reading tools (LingQ): words marked
 * known while reading plus list words that have graduated. Milestones give it a next target.
 */
export const KNOWN_MILESTONES = [500, 1000, 2000, 3000, 5000, 7500, 10_000, 12_500, 15_000, 20_000, 25_000, 30_000, 40_000, 50_000]

export function knownTotal(known: ReadonlySet<string>, vocabulary: readonly VocabularyEntry[], states: readonly UserWordState[], language: TargetLanguage): number {
  const keys = new Set(known)
  const graduated = new Set(states.filter((s) => s.skills.recognition?.state === State.Review).map((s) => s.entryId))
  for (const e of vocabulary) if (e.language === language && graduated.has(e.id)) keys.add(readingKey(e.lemma, language))
  return keys.size
}

export function milestone(total: number): { from: number; to: number } {
  const to = KNOWN_MILESTONES.find((m) => m > total) ?? Math.ceil((total + 1) / 10_000) * 10_000
  const i = KNOWN_MILESTONES.indexOf(to)
  return { from: i > 0 ? KNOWN_MILESTONES[i - 1] : i === 0 ? 0 : to - 10_000, to }
}

/** Daily snapshots (kept short) so the card can say how much the count grew this week. */
type Log = { day: string; total: number }[]

async function logTotal(db: KelimeDB, language: TargetLanguage, total: number): Promise<Log> {
  const key = `knownLog:${language}`
  const log = ((await db.meta.get(key))?.value as Log | undefined) ?? []
  const today = localDate(new Date())
  const next = [...log.filter((x) => x.day !== today), { day: today, total }].slice(-120)
  await db.meta.put({ key, value: next })
  return next
}

export function weeklyGrowth(log: Log, total: number, now = new Date()): number | null {
  const weekAgo = localDate(new Date(now.getTime() - 7 * 86_400_000))
  const base = [...log].reverse().find((x) => x.day <= weekAgo)
  return base ? total - base.total : null
}

export interface KnownGoal {
  target: number
  /** YYYY-MM-DD */
  by: string
}

export interface GoalForecast {
  /** Known words gained per day lately (null: not enough history yet). */
  pace: number | null
  /** When the target is reached at that pace. */
  eta: Date | null
  /** Words per day needed to make the date. */
  needed: number
  onTrack: boolean
  daysLeft: number
}

/** Pace from the daily snapshots of the last month (at least a week of them). */
export function goalForecast(log: Log, total: number, goal: KnownGoal, now = new Date()): GoalForecast {
  const monthAgo = localDate(new Date(now.getTime() - 30 * 86_400_000))
  const base = log.find((x) => x.day >= monthAgo) ?? log[0]
  const days = base ? (now.getTime() - new Date(`${base.day}T12:00:00`).getTime()) / 86_400_000 : 0
  const pace = base && days >= 7 ? Math.max(0, (total - base.total) / days) : null
  const daysLeft = Math.max(0, Math.ceil((new Date(`${goal.by}T23:59:59`).getTime() - now.getTime()) / 86_400_000))
  const left = Math.max(0, goal.target - total)
  const eta = pace && pace > 0 ? new Date(now.getTime() + (left / pace) * 86_400_000) : left === 0 ? now : null
  return { pace, eta, needed: daysLeft ? Math.ceil(left / daysLeft) : left, onTrack: left === 0 || (!!eta && eta.getTime() <= new Date(`${goal.by}T23:59:59`).getTime()), daysLeft }
}

export function KnownWordsCard({ db, language, vocabulary, states }: { db: KelimeDB; language: TargetLanguage; vocabulary: readonly VocabularyEntry[]; states: readonly UserWordState[] }) {
  const [view, setView] = useState<{ total: number; growth: number | null; estimate: number | null; log: Log } | null>(null)
  const [goal, setGoal] = useState<KnownGoal | null>(null)
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    let alive = true
    void (async () => {
      const [known, tests] = await Promise.all([db.getKnownWords(language), db.getVocabTests()])
      const total = knownTotal(known, vocabulary, states, language)
      const log = await logTotal(db, language, total)
      const estimate = tests.filter((t) => t.language === language).sort((a, b) => b.at.localeCompare(a.at))[0]?.estimate ?? null
      const saved = ((await db.meta.get(`knownGoal:${language}`))?.value as KnownGoal | undefined) ?? null
      if (alive) {
        setView({ total, growth: weeklyGrowth(log, total), estimate, log })
        setGoal(saved)
      }
    })()
    return () => {
      alive = false
    }
  }, [db, language, vocabulary, states])

  if (!view) return null
  const { from, to } = milestone(view.total)
  const pct = Math.max(0, Math.min(1, (view.total - from) / (to - from)))
  return (
    <section className="card stack known-card">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span>
          <strong className="known-number">{view.total.toLocaleString('tr-TR')}</strong> bilinen {LANGUAGE_NAME[language].toLocaleLowerCase('tr-TR')} kelime
        </span>
        {view.growth !== null && view.growth > 0 && <span className="small known-growth">bu hafta +{view.growth.toLocaleString('tr-TR')}</span>}
      </div>
      <div className="known-bar" role="progressbar" aria-valuemin={from} aria-valuemax={to} aria-valuenow={view.total} aria-label="Sonraki hedef">
        <span style={{ width: `${pct * 100}%` }} />
      </div>
      <p className="small muted">
        Sonraki hedef {to.toLocaleString('tr-TR')}: {(to - view.total).toLocaleString('tr-TR')} kelime kaldı. Okuduğun metinlerde bildiğin kelimeler ve listende
        öğrendiklerin sayılır.
        {view.estimate !== null && ` Kelime testine göre tahmini dağarcığın ~${view.estimate.toLocaleString('tr-TR')}; okudukça iki sayı birbirine yaklaşır.`}
      </p>
      {goal && !editing && <GoalStatus goal={goal} forecast={goalForecast(view.log, view.total, goal)} onEdit={() => setEditing(true)} />}
      {(editing || !goal) && (
        <GoalForm
          initial={goal ?? { target: to, by: localDate(new Date(Date.now() + 90 * 86_400_000)) }}
          compact={!goal && !editing}
          onSave={async (g) => {
            await db.meta.put({ key: `knownGoal:${language}`, value: g })
            setGoal(g)
            setEditing(false)
          }}
          onClear={
            goal
              ? async () => {
                  await db.meta.delete(`knownGoal:${language}`)
                  setGoal(null)
                  setEditing(false)
                }
              : undefined
          }
        />
      )}
    </section>
  )
}

const fmtDate = (d: Date) => d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })

function GoalStatus({ goal, forecast, onEdit }: { goal: KnownGoal; forecast: GoalForecast; onEdit: () => void }) {
  const by = fmtDate(new Date(`${goal.by}T12:00:00`))
  return (
    <p className={`small goal-status${forecast.onTrack ? ' is-on' : ''}`}>
      🎯 Hedef: {by} itibarıyla {goal.target.toLocaleString('tr-TR')} kelime.{' '}
      {forecast.pace === null
        ? 'Hızını hesaplamak için bir haftalık kayıt gerekiyor.'
        : forecast.onTrack
          ? `Bu hızla (günde ~${Math.round(forecast.pace)}) ${forecast.eta ? fmtDate(forecast.eta) : ''} civarı ulaşırsın; yoldasın.`
          : `Yetişmek için günde ~${forecast.needed} kelime gerekiyor; şu anki hızın günde ~${Math.round(forecast.pace)}${forecast.eta ? `, bu hızla ${fmtDate(forecast.eta)}` : ''}.`}{' '}
      <button className="link small" onClick={onEdit}>
        Değiştir
      </button>
    </p>
  )
}

function GoalForm({ initial, compact, onSave, onClear }: { initial: KnownGoal; compact: boolean; onSave: (g: KnownGoal) => void; onClear?: () => void }) {
  const [open, setOpen] = useState(!compact)
  const [target, setTarget] = useState(String(initial.target))
  const [by, setBy] = useState(initial.by)
  if (!open)
    return (
      <button className="link small" onClick={() => setOpen(true)}>
        🎯 Hedef koy
      </button>
    )
  const n = Number(target)
  return (
    <form
      className="row"
      onSubmit={(e) => {
        e.preventDefault()
        if (n > 0 && by) onSave({ target: Math.round(n), by })
      }}
    >
      <label className="field">
        <span className="small">Bilinen kelime</span>
        <input className="input" type="number" min={1} step={100} value={target} onChange={(e) => setTarget(e.target.value)} style={{ width: '8rem' }} />
      </label>
      <label className="field">
        <span className="small">Tarih</span>
        <input className="input" type="date" value={by} min={localDate(new Date())} onChange={(e) => setBy(e.target.value)} />
      </label>
      <button className="btn btn-sm" type="submit" disabled={!(n > 0) || !by} style={{ alignSelf: 'end' }}>
        Kaydet
      </button>
      {onClear && (
        <button className="link small" type="button" onClick={onClear} style={{ alignSelf: 'end' }}>
          Hedefi kaldır
        </button>
      )}
    </form>
  )
}
