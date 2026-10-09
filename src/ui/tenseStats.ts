import { useEffect, useMemo, useState } from 'react'
import { tenseStats, type TenseStat } from '../engine/tenses'
import type { VocabularyEntry } from '../engine/types'
import { db } from '../data/instance'
import { useTenses } from './ConjugationTable'

/** Answers needed in a tense before it is called weak or strong. */
export const MIN_ANSWERS = 3
export const DAYS = 90

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
