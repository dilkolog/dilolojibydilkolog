import type { Health } from '../engine/growth'
import { MASTERY_STAGES } from '../engine/mastery'
import { STAGE_NAME } from './labels'

const HEALTH_TEXT: Record<Health, string> = { fresh: 'canlı', thirsty: 'susamış', wilting: 'soluyor' }

/**
 * A word drawn as a plant: stage -1 (not started) is a seed, 0–5 follow the mastery stages from
 * sprout to full bloom. Health tilts and discolours it as the word is being forgotten.
 * The flower takes the language's colour.
 */
export function Plant({ stage, health = 'fresh', size = 24 }: { stage: number; health?: Health; size?: number }) {
  const tilt = health === 'wilting' ? 22 : health === 'thirsty' ? 9 : 0
  const leaf = health === 'wilting' ? 'var(--plant-dry)' : health === 'thirsty' ? 'var(--plant-thirsty)' : 'var(--plant-leaf)'
  const stem = [0, 6, 11, 16, 21, 23][Math.max(0, stage)]
  const top = 34 - stem
  const label = stage < 0 ? 'Henüz ekilmedi' : `${STAGE_NAME[MASTERY_STAGES[stage]]}, ${HEALTH_TEXT[health]}`
  return (
    // A seed or a sprout is tiny on the full 40-unit ground; its own, closer frame keeps it legible.
    <svg width={size} height={size} viewBox={stage <= 0 ? '6 12 28 28' : '0 0 40 40'} role="img" aria-label={label} className={`plant plant-${health}`}>
      <title>{label}</title>
      <ellipse cx="20" cy="35.5" rx="12" ry="3.2" fill="var(--plant-soil)" />
      {stage < 0 ? (
        <ellipse cx="20" cy="33" rx="3" ry="2.2" fill="var(--plant-seed)" />
      ) : (
        <g transform={`rotate(${tilt} 20 34)`}>
          {stage === 0 ? (
            <>
              <ellipse cx="20" cy="33" rx="3" ry="2.2" fill="var(--plant-seed)" />
              <path d="M20 32 q0.5 -3 2.5 -4.5" stroke={leaf} strokeWidth="1.8" fill="none" strokeLinecap="round" />
            </>
          ) : (
            <>
              <path d={`M20 34 C19.2 ${34 - stem / 2} 20.8 ${34 - stem / 2} 20 ${top}`} stroke={leaf} strokeWidth="2" fill="none" strokeLinecap="round" />
              {/* Leaves: one pair from stage 1, a second, higher pair from stage 3. */}
              <Leaf x={20} y={34 - Math.max(4, stem * 0.35)} side={-1} size={stage >= 2 ? 6 : 4.5} fill={leaf} />
              <Leaf x={20} y={34 - Math.max(4, stem * 0.35)} side={1} size={stage >= 2 ? 6 : 4.5} fill={leaf} />
              {stage >= 3 && (
                <>
                  <Leaf x={20} y={34 - stem * 0.68} side={-1} size={5} fill={leaf} />
                  <Leaf x={20} y={34 - stem * 0.68} side={1} size={5} fill={leaf} />
                </>
              )}
              {stage === 4 && <path d={`M20 ${top + 1} c-3 -2 -3 -6 0 -8 c3 2 3 6 0 8z`} fill="var(--lang)" opacity={health === 'wilting' ? 0.55 : 1} />}
              {stage === 5 && (
                <g opacity={health === 'wilting' ? 0.55 : 1}>
                  {[0, 72, 144, 216, 288].map((a) => (
                    <ellipse key={a} cx="20" cy={top - 4.2} rx="2.6" ry="4" fill="var(--lang)" transform={`rotate(${a} 20 ${top})`} />
                  ))}
                  <circle cx="20" cy={top} r="2.4" fill="var(--gold)" />
                </g>
              )}
            </>
          )}
        </g>
      )}
    </svg>
  )
}

function Leaf({ x, y, side, size, fill }: { x: number; y: number; side: 1 | -1; size: number; fill: string }) {
  const tip = x + side * size * 1.6
  return <path d={`M${x} ${y} Q${x + side * size * 0.6} ${y - size} ${tip} ${y - size * 0.7} Q${x + side * size * 0.9} ${y + size * 0.1} ${x} ${y}z`} fill={fill} />
}
