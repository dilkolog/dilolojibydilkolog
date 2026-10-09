import { useEffect, useState } from 'react'
import { TargetIcon } from './icons'
import type { KelimeDB } from '../data/db'
import { localDate } from '../engine/progress'
import type { TargetLanguage, UserWordState, VocabularyEntry } from '../engine/types'
import { LANGUAGE_NAME } from './labels'
import {
  knownTotal,
  milestone,
  weeklyGrowth,
  goalForecast,
  type KnownLog,
  type KnownGoal,
  type GoalForecast,
} from './knownMilestones'

async function logTotal(db: KelimeDB, language: TargetLanguage, total: number): Promise<KnownLog> {
  const key = `knownLog:${language}`
  const log = ((await db.meta.get(key))?.value as KnownLog | undefined) ?? []
  const today = localDate(new Date())
  const next = [...log.filter((x) => x.day !== today), { day: today, total }].slice(-120)
  await db.meta.put({ key, value: next })
  return next
}

export function KnownWordsCard({ db, language, vocabulary, states }: { db: KelimeDB; language: TargetLanguage; vocabulary: readonly VocabularyEntry[]; states: readonly UserWordState[] }) {
  const [view, setView] = useState<{ total: number; growth: number | null; estimate: number | null; log: KnownLog } | null>(null)
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
      <TargetIcon size={16} className="inline-icon" />Hedef: {by} itibarıyla {goal.target.toLocaleString('tr-TR')} kelime.{' '}
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
        <TargetIcon size={16} className="inline-icon" />Hedef koy
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
        <input className="input known-target-input" type="number" min={1} step={100} value={target} onChange={(e) => setTarget(e.target.value)} />
      </label>
      <label className="field">
        <span className="small">Tarih</span>
        <input className="input" type="date" value={by} min={localDate(new Date())} onChange={(e) => setBy(e.target.value)} />
      </label>
      <button className="btn btn-sm self-end" type="submit" disabled={!(n > 0) || !by}>
        Kaydet
      </button>
      {onClear && (
        <button className="link small self-end" type="button" onClick={onClear}>
          Hedefi kaldır
        </button>
      )}
    </form>
  )
}
