import { streakPicture } from './drawnArt'
import { flameTier } from './flameTier'

const TIER_NAME = ['', '3 gün', '1 hafta', '1 ay', '100 gün']

/**
 * The streak flame: small and orange for a fresh streak, bigger and redder after a week, blue-hot
 * after a month, gold after a hundred days. Frost rings it when a freeze saved yesterday. It
 * flickers (more lively the longer the run), a longer run throws embers, and `ignite` flares it
 * when today's session just made the streak longer.
 */
export function StreakFlame({ streak, frozen = false, size = 18, ignite = false }: { streak: number; frozen?: boolean; size?: number; ignite?: boolean }) {
  const tier = flameTier(streak)
  return (
    <span
      className={`streak-flame tier-${tier}${frozen ? ' is-frozen' : ''}${streak === 0 ? ' is-out' : ''}${ignite ? ' is-igniting' : ''}`}
      title={frozen ? 'Dün seri dondurma serini korudu' : tier ? `${TIER_NAME[tier]} serisi` : undefined}
    >
      <img
        className="streak-flame-img"
        src={streakPicture(streak, tier)}
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size, verticalAlign: 'middle', display: 'inline-block' }}
        draggable={false}
      />
    </span>
  )
}

/** The streak as a drawn flame with a face (asleep at zero), for places with room; `ignite` pops it when the streak just grew. */
export function StreakPicture({ streak, size = 34, ignite = false }: { streak: number; size?: number; ignite?: boolean }) {
  const tier = flameTier(streak)
  return <img className={`streak-picture${ignite ? ' is-igniting' : ''}`} src={streakPicture(streak, tier)} alt="" height={size} style={{ height: size }} title={tier ? `${TIER_NAME[tier]} serisi` : undefined} />
}
