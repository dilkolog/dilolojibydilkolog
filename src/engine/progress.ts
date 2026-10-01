import { MASTERY_STAGES, masteryStage, type MasteryStage } from './mastery'
import type { Scheduler } from './scheduler'
import type { ReviewEvent, UserWordState } from './types'

/**
 * A production-ready word counts toward active vocabulary only while it is still retrievable
 * without hints — the spec's North Star ("can still produce it after a meaningful delay").
 */
export const ACTIVE_RETRIEVABILITY = 0.85

export interface DayActivity {
  /** Local date, YYYY-MM-DD. */
  date: string
  answers: number
  correct: number
}

export interface ProgressStats {
  stageCounts: Record<MasteryStage, number>
  notStarted: number
  activeVocabulary: number
  activity: DayActivity[]
  daysPractised: number
}

export function localDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function progressStats(input: {
  vocabularyCount: number
  states: readonly UserWordState[]
  events: readonly ReviewEvent[]
  scheduler: Scheduler
  now: Date
  days?: number
}): ProgressStats {
  const { states, events, scheduler, now, days = 14 } = input
  const stageCounts = Object.fromEntries(MASTERY_STAGES.map((s) => [s, 0])) as Record<MasteryStage, number>
  let activeVocabulary = 0
  for (const st of states) {
    const stage = masteryStage(st)
    stageCounts[stage]++
    const prod = st.skills.production
    if (
      (stage === 'production_ready' || stage === 'mastered') &&
      prod &&
      scheduler.retrievability(prod, now) >= ACTIVE_RETRIEVABILITY
    )
      activeVocabulary++
  }

  const activity: DayActivity[] = []
  const index = new Map<string, DayActivity>()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    const row = { date: localDate(d), answers: 0, correct: 0 }
    activity.push(row)
    index.set(row.date, row)
  }
  // Practice-mode answers are deliberately low-stakes and are not counted as progress.
  for (const e of events) {
    if (e.mode !== 'normal') continue
    const row = index.get(localDate(e.timestamp))
    if (!row) continue
    row.answers++
    if (e.correct) row.correct++
  }

  return {
    stageCounts,
    notStarted: Math.max(0, input.vocabularyCount - states.length),
    activeVocabulary,
    activity,
    daysPractised: activity.filter((a) => a.answers > 0).length,
  }
}
