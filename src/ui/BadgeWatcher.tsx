import { useEffect, useState } from 'react'
import type { AchievementState } from '../engine/gamification'
import { BadgeMoment } from './BadgeMoment'
import { markBadgesSeen, newBadgeIds } from './badgeSeen'
import type { GameState } from './game'

/**
 * Gives a badge its moment wherever it was earned: marking hard words, adding words, writing a
 * journal entry. A session's own badges are celebrated on its summary; this waits (`paused`) while
 * the learner is in one and shows whatever is still new afterwards.
 */
export function BadgeWatcher({ game, paused, onProfile }: { game: GameState | null; paused: boolean; onProfile: () => void }) {
  const [queue, setQueue] = useState<AchievementState[]>([])
  useEffect(() => {
    if (!game || paused || queue.length) return
    const earned = game.achievements.filter((a) => a.unlocked)
    const fresh = new Set(newBadgeIds(earned.map((a) => a.id)))
    if (fresh.size) setQueue(earned.filter((a) => fresh.has(a.id)))
  }, [game, paused, queue.length])
  if (!queue.length) return null
  return (
    <BadgeMoment
      badges={queue}
      onProfile={() => {
        markBadgesSeen(queue.map((a) => a.id))
        setQueue([])
        onProfile()
      }}
      onClose={() => {
        markBadgesSeen(queue.map((a) => a.id))
        setQueue([])
      }}
    />
  )
}
