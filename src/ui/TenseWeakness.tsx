import { useEffect, useMemo, useState } from 'react'
import { TENSE_GUIDE } from '../engine/tenseGuide'
import { tenseStats, type TenseStat } from '../engine/tenses'
import type { VocabularyEntry } from '../engine/types'
import { db } from '../data/instance'
import { useTenses } from './ConjugationTable'
import { PlayIcon } from './icons'

/** Answers needed in a tense before it is called weak or strong. */
const MIN_ANSWERS = 3
const DAYS = 90

/** Conjugation answers of the last 90 days per tense (sessions and the drill). */
export function useTenseStats(language: VocabularyEntry['language'], vocabulary: readonly VocabularyEntry[]): TenseStat[] {
  const ready = useTenses(language)
  const [stats, setStats] = useState<TenseStat[]>([])
  const byId = useMemo(() => new Map(vocabulary.map((v) => [v.id, v])), [vocabulary])
  useEffect(() => {
    if (!ready || language === 'en') return
    let live = true
    void db.eventsSince(new Date(Date.now() - DAYS * 86_400_000), language).then((events) => live && setStats(tenseStats(events, byId)))
    return () => {
      live = false
    }
  }, [ready, language, byId])
  return stats
}

/** The weakest tense with enough answers, if it is clearly weaker than right (under 80%). */
export function weakestTense(stats: TenseStat[]): TenseStat | undefined {
  return stats
    .filter((s) => s.correct + s.wrong >= MIN_ANSWERS && s.correct / (s.correct + s.wrong) < 0.8)
    .sort((a, b) => a.correct / (a.correct + a.wrong) - b.correct / (b.correct + b.wrong))[0]
}

/** Mistakes page: how each tense is going, the weakest one with a way to practise it. */
export function TenseWeakness({ language, vocabulary, onPractice }: { language: VocabularyEntry['language']; vocabulary: readonly VocabularyEntry[]; onPractice?: () => void }) {
  const stats = useTenseStats(language, vocabulary).filter((s) => s.correct + s.wrong > 0)
  if (language === 'en' || !stats.length) return null
  const weak = weakestTense(stats)
  const order = Object.keys(TENSE_GUIDE)
  const rows = [...stats].sort((a, b) => order.indexOf(a.tense) - order.indexOf(b.tense))
  return (
    <section className="section stack tense-weakness">
      <header className="field-head">
        <h2 className="section-title">Çekim: zamanlara göre</h2>
        {onPractice && (
          <button className="btn btn-sm btn-quiet" onClick={onPractice}>
            <PlayIcon size={14} /> Fiil laboratuvarı
          </button>
        )}
      </header>
      <p className="small muted">
        Son {DAYS} günün çekim cevapları.
        {weak
          ? ` En çok ${TENSE_GUIDE[weak.tense].name} zorluyor; antrenmanda bu zaman daha sık gelir.`
          : stats.some((s) => s.correct + s.wrong >= MIN_ANSWERS)
            ? ' Belirgin bir zayıf zaman yok.'
            : ` Bir zamanı değerlendirmek için en az ${MIN_ANSWERS} cevap gerekiyor.`}
      </p>
      <ul className="tense-bars">
        {rows.map((s) => {
          const n = s.correct + s.wrong
          const pct = Math.round((s.correct / n) * 100)
          return (
            <li key={s.tense} className={s === weak ? 'is-weak' : undefined}>
              <span className="tense-bar-name" lang={language}>
                {TENSE_GUIDE[s.tense].name}
              </span>
              <span className="tense-bar" role="img" aria-label={`%${pct} doğru`}>
                <span style={{ width: `${pct}%` }} />
              </span>
              <span className="tense-bar-num">
                {s.correct}/{n}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
