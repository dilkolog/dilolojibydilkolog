import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { Health } from '../engine/growth'
import { MASTERY_STAGES } from '../engine/mastery'
import { STAGE_NAME } from './labels'

const HEALTH_TEXT: Record<Health, string> = { fresh: 'canlı', thirsty: 'susamış', wilting: 'soluyor' }

const HEALTH_RANK: Record<Health, number> = { fresh: 0, thirsty: 1, wilting: 2 }

/**
 * A word drawn as a plant: stage -1 (not started) is a seed, 0–5 follow the mastery stages from
 * sprout to full bloom. Health tilts and discolours it as the word is being forgotten.
 * The flower takes the language's colour.
 *
 * It moves in answer to what happens to it: a new stage draws the stem, unfurls the leaves and
 * opens the petals one by one; a watered plant gets a few drops and perks up. `live` adds an
 * ambient sway (and a breathing flower) for plants that are the point of the screen, not for
 * hundreds of list icons; `phase` keeps neighbours from swaying in step.
 */
export function Plant({ stage, health = 'fresh', size = 24, live = false, phase = 0 }: { stage: number; health?: Health; size?: number; live?: boolean; phase?: number }) {
  const [fx, setFx] = useState<'grow' | 'water' | null>(null)
  const last = useRef({ stage, health })
  useEffect(() => {
    const before = last.current
    last.current = { stage, health }
    const kind = stage > before.stage ? 'grow' : stage === before.stage && HEALTH_RANK[health] < HEALTH_RANK[before.health] ? 'water' : null
    if (!kind) return
    setFx(kind)
    const t = setTimeout(() => setFx(null), kind === 'grow' ? 1900 : 1500)
    return () => clearTimeout(t)
  }, [stage, health])

  const tilt = health === 'wilting' ? 22 : health === 'thirsty' ? 9 : 0
  const leaf = health === 'wilting' ? 'var(--plant-dry)' : health === 'thirsty' ? 'var(--plant-thirsty)' : 'var(--plant-leaf)'
  const stem = [0, 6, 11, 16, 21, 23][Math.max(0, stage)]
  const top = 34 - stem
  const label = stage < 0 ? 'Henüz ekilmedi' : `${STAGE_NAME[MASTERY_STAGES[stage]]}, ${HEALTH_TEXT[health]}`
  return (
    // A seed or a sprout is tiny on the full 40-unit ground; its own, closer frame keeps it legible.
    <svg width={size} height={size} viewBox={stage <= 0 ? '6 12 28 28' : '0 0 40 40'} role="img" aria-label={label} className={`plant plant-${health}${live ? ' is-live' : ''}${fx ? ` is-${fx}` : ''}`}
      style={live ? ({ '--sway-d': `${-((phase * 1.7) % 4.5)}s` } as CSSProperties) : undefined}
    >
      <title>{label}</title>
      <ellipse cx="20" cy="35.5" rx="12" ry="3.2" fill="var(--plant-soil)" />
      {stage < 0 ? (
        <ellipse cx="20" cy="33" rx="3" ry="2.2" fill="var(--plant-seed)" />
      ) : (
        <g transform={`rotate(${tilt} 20 34)`}>
          <g className="plant-body">
            {stage === 0 ? (
              <>
                <ellipse cx="20" cy="33" rx="3" ry="2.2" fill="var(--plant-seed)" />
                <path d="M20 32 q0.5 -3 2.5 -4.5" stroke={leaf} strokeWidth="1.8" fill="none" strokeLinecap="round" />
              </>
            ) : (
              <>
                <path className="plant-stem" pathLength={1} d={`M20 34 C19.2 ${34 - stem / 2} 20.8 ${34 - stem / 2} 20 ${top}`} stroke={leaf} strokeWidth="2" fill="none" strokeLinecap="round" />
                {/* Leaves: one pair from stage 1, a second, higher pair from stage 3. */}
                <Leaf x={20} y={34 - Math.max(4, stem * 0.35)} side={-1} size={stage >= 2 ? 6 : 4.5} fill={leaf} delay={250} />
                <Leaf x={20} y={34 - Math.max(4, stem * 0.35)} side={1} size={stage >= 2 ? 6 : 4.5} fill={leaf} delay={330} />
                {stage >= 3 && (
                  <>
                    <Leaf x={20} y={34 - stem * 0.68} side={-1} size={5} fill={leaf} delay={450} />
                    <Leaf x={20} y={34 - stem * 0.68} side={1} size={5} fill={leaf} delay={530} />
                  </>
                )}
                {stage === 4 && <path className="plant-bud" d={`M20 ${top + 1} c-3 -2 -3 -6 0 -8 c3 2 3 6 0 8z`} fill="var(--lang)" opacity={health === 'wilting' ? 0.55 : 1} />}
                {stage === 5 && (
                  <g className="plant-bloom" opacity={health === 'wilting' ? 0.55 : 1}>
                    {[0, 72, 144, 216, 288].map((a, i) => (
                      <g key={a} transform={`rotate(${a} 20 ${top})`}>
                        <ellipse className="plant-petal" style={{ '--i': i } as CSSProperties} cx="20" cy={top - 4.2} rx="2.6" ry="4" fill="var(--lang)" />
                      </g>
                    ))}
                    <circle className="plant-core" cx="20" cy={top} r="2.4" fill="var(--gold)" />
                  </g>
                )}
              </>
            )}
          </g>
        </g>
      )}
      {fx === 'water' && (
        <g className="plant-rain" aria-hidden>
          {[14, 20, 26].map((x, i) => (
            <path key={x} d={`M${x} ${top - 8} q-1.6 3 0 4.2 q1.6 -1.2 0 -4.2z`} style={{ '--i': i } as CSSProperties} />
          ))}
        </g>
      )}
    </svg>
  )
}

function Leaf({ x, y, side, size, fill, delay }: { x: number; y: number; side: 1 | -1; size: number; fill: string; delay: number }) {
  const tip = x + side * size * 1.6
  return <path className={`plant-leaf ${side === 1 ? 'is-r' : 'is-l'}`} style={{ '--d': `${delay}ms` } as CSSProperties} d={`M${x} ${y} Q${x + side * size * 0.6} ${y - size} ${tip} ${y - size * 0.7} Q${x + side * size * 0.9} ${y + size * 0.1} ${x} ${y}z`} fill={fill} />
}

/** A plant shown at the stage it had, then growing into the stage it reached after `delay` ms (the session summary's moment). */
export function GrowingPlant({ from, to, delay, size }: { from: number; to: number; delay: number; size: number }) {
  const [stage, setStage] = useState(from)
  useEffect(() => {
    const t = setTimeout(() => setStage(to), delay)
    return () => clearTimeout(t)
  }, [to, delay])
  return <Plant stage={stage} size={size} />
}
