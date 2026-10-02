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

export function KnownWordsCard({ db, language, vocabulary, states }: { db: KelimeDB; language: TargetLanguage; vocabulary: readonly VocabularyEntry[]; states: readonly UserWordState[] }) {
  const [view, setView] = useState<{ total: number; growth: number | null; estimate: number | null } | null>(null)

  useEffect(() => {
    let alive = true
    void (async () => {
      const [known, tests] = await Promise.all([db.getKnownWords(language), db.getVocabTests()])
      const total = knownTotal(known, vocabulary, states, language)
      const log = await logTotal(db, language, total)
      const estimate = tests.filter((t) => t.language === language).sort((a, b) => b.at.localeCompare(a.at))[0]?.estimate ?? null
      if (alive) setView({ total, growth: weeklyGrowth(log, total), estimate })
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
    </section>
  )
}
