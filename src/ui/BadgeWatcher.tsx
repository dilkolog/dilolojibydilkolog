import { useEffect, useRef, useState } from 'react'
import { db } from '../data/instance'
import type { AchievementState, BadgeLog } from '../engine/gamification'
import { BadgeMoment } from './BadgeMoment'
import { markBadgesSeen, seenBadges } from './badgeSeen'
import type { GameState } from './game'
import { showToast } from './toastFeed'

/** More new badges than this at once did not just happen: a backup restored, a sync, a new device. */
export const CELEBRATE_MAX = 3

/**
 * Gives a badge its moment wherever it was earned (marking hard words, adding words, writing a
 * journal entry), and writes it into the badge log with the date, so it is kept and synced. A
 * session's own badges are celebrated on its summary; this waits (`paused`) while the learner is in
 * one. Badges already celebrated on this device before the log existed go in quietly, without a
 * date; a pile of them at once (a restore, a sync) goes in quietly too, with one line saying so.
 */
export function BadgeWatcher({ game, paused, onProfile, onLogged }: { game: GameState | null; paused: boolean; onProfile: () => void; onLogged?: () => void }) {
  const [queue, setQueue] = useState<AchievementState[]>([])
  const handled = useRef(new Set<string>())
  useEffect(() => {
    if (!game || paused || queue.length) return
    // Earned by its number but not yet in the log.
    const fresh = game.achievements.filter((a) => a.unlocked && a.unlockedAt === undefined && !handled.current.has(a.id))
    if (!fresh.length) return
    for (const a of fresh) handled.current.add(a.id)
    const seen = seenBadges()
    const before = fresh.filter((a) => seen === null || seen.has(a.id))
    const now = fresh.filter((a) => !before.includes(a))
    const quiet = now.length > CELEBRATE_MAX
    const at = new Date().toISOString()
    const log: BadgeLog = Object.fromEntries([...before.map((a) => [a.id, '']), ...now.map((a) => [a.id, quiet ? '' : at])])
    markBadgesSeen(fresh.map((a) => a.id))
    void db.logBadges(log).then(() => onLogged?.())
    if (quiet) showToast(`${now.length} rozetin kaydedildi; Profil'de görebilirsin.`)
    else if (now.length) setQueue(now)
  }, [game, paused, queue.length, onLogged])
  if (!queue.length) return null
  return (
    <BadgeMoment
      badges={queue}
      onProfile={() => {
        setQueue([])
        onProfile()
      }}
      onClose={() => setQueue([])}
    />
  )
}
