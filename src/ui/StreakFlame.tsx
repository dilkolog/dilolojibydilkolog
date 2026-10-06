import { FlameIcon } from './icons'

/** Streak milestones: the flame grows and changes colour as the run gets longer. */
export function flameTier(streak: number): 0 | 1 | 2 | 3 | 4 {
  return streak >= 100 ? 4 : streak >= 30 ? 3 : streak >= 7 ? 2 : streak >= 3 ? 1 : 0
}

const TIER_NAME = ['', '3 gün', '1 hafta', '1 ay', '100 gün']

/**
 * The streak flame: small and orange for a fresh streak, bigger and redder after a week, blue-hot
 * after a month, gold after a hundred days. Frost rings it when a freeze saved yesterday. It
 * flickers (more lively the longer the run), a longer run throws embers, and `ignite` flares it
 * when today's session just made the streak longer.
 */
export function StreakFlame({ streak, frozen = false, size = 22, ignite = false }: { streak: number; frozen?: boolean; size?: number; ignite?: boolean }) {
  const tier = flameTier(streak)
  const scale = [0.9, 1, 1.12, 1.22, 1.3][tier]
  return (
    <span
      className={`streak-flame tier-${tier}${frozen ? ' is-frozen' : ''}${streak === 0 ? ' is-out' : ''}${ignite ? ' is-igniting' : ''}`}
      title={frozen ? 'Dün seri dondurma serini korudu' : tier ? `${TIER_NAME[tier]} serisi` : undefined}
    >
      <FlameIcon size={Math.round(size * scale)} />
    </span>
  )
}
