import { useEffect, useState } from 'react'
import type { Milestone } from '../engine/gamification'
import { MilestoneMoment } from './MilestoneMoment'
import { markLevelSeen, seenLevel } from './levelSeen'
import type { GameState } from './game'

/**
 * Celebrates level promotions that happen outside normal study sessions
 * (e.g. from mini-games, verb lab, reading, quests).
 * Pauses while in a session or summary to avoid interfering with their own celebrations.
 */
export function LevelWatcher({ game, paused }: { game: GameState | null; paused: boolean }) {
  const [milestone, setMilestone] = useState<Milestone | null>(null)

  useEffect(() => {
    if (!game || paused || milestone) return
    const current = game.level.level
    const seen = seenLevel()
    if (seen === null) {
      markLevelSeen(current)
      return
    }
    if (current > seen) {
      setMilestone({
        id: `level-${current}`,
        emoji: '⭐',
        title: `Seviye ${current}!`,
        text: `Yeni unvanın: ${game.level.title}. Çalıştıkça XP birikiyor; bir seviye daha atladın!`,
        level: { from: seen, to: current },
      })
      markLevelSeen(current)
    }
  }, [game, paused, milestone])

  if (!milestone) return null
  return <MilestoneMoment milestone={milestone} onClose={() => setMilestone(null)} />
}
