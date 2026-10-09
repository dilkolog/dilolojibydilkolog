import { useEffect, useState } from 'react'
import type { KelimeDB } from '../data/db'
import { usualStudyHour } from '../engine/hours'

/** The hour the learner usually starts studying (last 30 days), or null until there are enough days. */
export function useUsualStudyHour(db: KelimeDB): number | null | undefined {
  const [hour, setHour] = useState<number | null | undefined>(undefined)
  useEffect(() => {
    const now = new Date()
    void db.eventsSince(new Date(now.getTime() - 30 * 86_400_000)).then((events) => setHour(usualStudyHour(events, now)))
  }, [db])
  return hour
}
