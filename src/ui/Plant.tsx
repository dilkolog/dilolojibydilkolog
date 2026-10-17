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
export function Plant({
  stage,
  health = 'fresh',
  size = 24,
  live = false,
  phase = 0,
  watered = false,
}: {
  stage: number
  health?: Health
  size?: number
  live?: boolean
  phase?: number
  watered?: boolean
}) {
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

  useEffect(() => {
    if (!watered) return
    const delay = 350 + (phase * 160) % 600
    const t1 = setTimeout(() => setFx('water'), delay)
    const t2 = setTimeout(() => setFx(null), delay + 1500)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [watered, phase])

  const tilt = health === 'wilting' ? 22 : health === 'thirsty' ? 9 : 0
  const leaf = health === 'wilting' ? 'var(--plant-dry)' : health === 'thirsty' ? 'var(--plant-thirsty)' : 'var(--plant-leaf)'
  const stem = [0, 6, 11, 16, 21, 23][Math.max(0, stage)]
  const top = 34 - stem
  const label = stage < 0 ? 'Henüz ekilmedi' : `${STAGE_NAME[MASTERY_STAGES[stage]]}, ${HEALTH_TEXT[health]}`
  // Small list icons keep the plain shapes; a plant large enough to look at gets veins, light and shade.
  const fine = size >= 28
  const faded = health === 'wilting' ? 0.6 : 1
  return (
    // A seed or a sprout is tiny on the full 40-unit ground; its own, closer frame keeps it legible.
    <svg width={size} height={size} viewBox={stage <= 0 ? '6 12 28 28' : '0 0 40 40'} role="img" aria-label={label} className={`plant plant-${health}${live ? ' is-live' : ''}${fx ? ` is-${fx}` : ''}`}
      style={live ? ({ '--sway-d': `${-((phase * 1.7) % 4.5)}s` } as CSSProperties) : undefined}
    >
      <title>{label}</title>
      <Soil fine={fine} stage={stage} />
      {stage < 0 ? (
        // Not planted yet: a seed that waits to be noticed (live only): it glows, hops now and then, and sparkles.
        <g className="plant-waiting" transform={live ? 'translate(20 33.4) scale(1.5) translate(-20 -33.4)' : undefined}>
          {live && <ellipse className="plant-seed-glow" cx="20" cy="32.5" rx="7.5" ry="4.5" />}
          <g className="plant-seed-hop">
            <Seed fine={fine} />
          </g>
          {live &&
            [
              [14.2, 27.4],
              [26.2, 25.2],
              [20.6, 21.4],
            ].map(([x, y], i) => <circle key={i} className="plant-twinkle" style={{ '--i': i } as CSSProperties} cx={x} cy={y} r="0.7" />)}
        </g>
      ) : (
        <g transform={`rotate(${tilt} 20 34)`}>
          <g className="plant-body">
            {stage === 0 ? (
              <>
                <Seed fine={fine} />
                <path d="M20 32.5 C20 30.5 20.4 29.2 21.2 28" stroke={leaf} strokeWidth="1.8" fill="none" strokeLinecap="round" />
                <Leaf x={21.2} y={28.4} side={1} size={3.2} fill={leaf} delay={150} fine={fine} />
                <Leaf x={20.6} y={29.6} side={-1} size={2.6} fill={leaf} delay={220} fine={fine} />
              </>
            ) : (
              <>
                <path className="plant-stem" pathLength={1} d={`M20 34 C19 ${34 - stem / 2} 21 ${34 - stem / 2} 20 ${top}`} stroke={leaf} strokeWidth="2.2" fill="none" strokeLinecap="round" />
                {fine && <path d={`M20.7 34 C20 ${34 - stem / 2} 21.8 ${34 - stem / 2} 20.9 ${top + 1}`} stroke="color-mix(in srgb, var(--plant-leaf) 40%, white)" strokeWidth="0.5" fill="none" strokeLinecap="round" opacity="0.55" />}
                {/* Leaves: one pair from stage 1, a second, higher pair from stage 3. */}
                <Leaf x={20} y={34 - Math.max(4, stem * 0.35)} side={-1} size={stage >= 2 ? 6.4 : 4.8} fill={leaf} delay={250} fine={fine} />
                <Leaf x={20} y={34 - Math.max(4, stem * 0.35)} side={1} size={stage >= 2 ? 6.4 : 4.8} fill={leaf} delay={330} fine={fine} />
                {stage >= 3 && (
                  <>
                    <Leaf x={20} y={34 - stem * 0.68} side={-1} size={5.2} fill={leaf} delay={450} fine={fine} />
                    <Leaf x={20} y={34 - stem * 0.68} side={1} size={5.2} fill={leaf} delay={530} fine={fine} />
                  </>
                )}
                {stage === 4 && (
                  <g className="plant-bud" opacity={faded}>
                    <path d={`M20 ${top + 1.4} c-3.4 -1.6 -3.8 -6 0 -9 c3.8 3 3.4 7.4 0 9z`} fill="var(--lang)" />
                    {fine && <path d={`M19 ${top - 2} c0.2 -1.6 0.9 -3 1.8 -4`} stroke="white" strokeWidth="0.8" strokeLinecap="round" fill="none" opacity="0.5" />}
                    <path d={`M20 ${top + 2} c-3.2 -0.2 -4.4 -2.4 -4.6 -4.6 c2.2 0.4 3.8 1.8 4.6 4.6z M20 ${top + 2} c3.2 -0.2 4.4 -2.4 4.6 -4.6 c-2.2 0.4 -3.8 1.8 -4.6 4.6z`} fill={leaf} />
                  </g>
                )}
                {stage === 5 && (
                  <g className="plant-bloom" opacity={faded}>
                    {/* Back petals, a shade deeper and turned half a step, then the front ones with a light tip. */}
                    {fine &&
                      [22, 67, 112, 157, 202, 247, 292, 337].map((a) => (
                        <g key={`b${a}`} transform={`rotate(${a} 20 ${top})`}>
                          <ellipse cx="20" cy={top - 5.4} rx="2.6" ry="4.2" fill="color-mix(in srgb, var(--lang) 72%, black)" />
                        </g>
                      ))}
                    {(fine ? [0, 45, 90, 135, 180, 225, 270, 315] : [0, 72, 144, 216, 288]).map((a, i) => (
                      <g key={a} transform={`rotate(${a} 20 ${top})`}>
                        <ellipse className="plant-petal" style={{ '--i': i } as CSSProperties} cx="20" cy={top - 4.6} rx={fine ? 2.5 : 2.6} ry={fine ? 4.2 : 4} fill="var(--lang)" />
                        {fine && <ellipse cx="20" cy={top - 7.2} rx="1.3" ry="1.5" fill="white" opacity="0.28" />}
                      </g>
                    ))}
                    <g className="plant-core">
                      <circle cx="20" cy={top} r="2.7" fill="var(--gold)" />
                      {fine && (
                        <>
                          <circle cx="20" cy={top} r="2.7" fill="none" stroke="color-mix(in srgb, var(--gold) 55%, #7c2d12)" strokeWidth="0.6" />
                          <circle cx="19.2" cy={top - 0.7} r="0.45" fill="#7c2d12" opacity="0.7" />
                          <circle cx="20.9" cy={top - 0.3} r="0.4" fill="#7c2d12" opacity="0.7" />
                          <circle cx="20" cy={top + 0.9} r="0.4" fill="#7c2d12" opacity="0.7" />
                        </>
                      )}
                    </g>
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

/** A natural mound of dark garden earth, softening into turf and subtle organic crest. */
function Soil({ fine, stage = 1 }: { fine: boolean; stage?: number }) {
  const zoomed = stage <= 0
  const rx = zoomed ? 7.5 : 10.5
  const ry = zoomed ? 1.8 : 2.2
  const left = 20 - rx
  const right = 20 + rx
  const topY = zoomed ? 32.4 : 31.8
  return (
    <g className="plant-soil">
      {/* Soft dark ground fading into turf */}
      <ellipse cx="20" cy="36.4" rx={rx + 1.2} ry={ry} fill="#14361e" opacity="0.25" />
      {/* Grounded natural earth mound */}
      <path
        d={`M${left} 36.4 C${left + 1.5} ${topY} 16.5 ${topY} 20 ${topY} C23.5 ${topY} ${right - 1.5} ${topY} ${right} 36.4 C${right - 1} 36.8 20 37.1 ${left} 36.4 Z`}
        fill="var(--plant-soil)"
      />
      {fine && (
        <>
          {/* Subtle warm earth crest highlight */}
          <path
            d={`M${left + 2} 35.2 Q${20} ${topY + 0.6} ${right - 2} 35.2`}
            stroke="color-mix(in srgb, var(--plant-soil) 80%, white)"
            strokeWidth="0.8"
            strokeLinecap="round"
            fill="none"
            opacity="0.35"
          />
          {/* Natural soil crumbs */}
          <circle cx={zoomed ? 17.2 : 16} cy="35.6" r="0.6" fill="color-mix(in srgb, var(--plant-soil) 50%, black)" opacity="0.45" />
          <circle cx={zoomed ? 22.6 : 23.8} cy="35.8" r="0.5" fill="color-mix(in srgb, var(--plant-soil) 50%, black)" opacity="0.45" />
        </>
      )}
    </g>
  )
}

function Seed({ fine }: { fine: boolean }) {
  return (
    <>
      <ellipse cx="20" cy="33.4" rx="3.2" ry="2.3" fill="var(--plant-seed)" />
      {fine && <path d="M18.4 32.6 Q19.4 31.8 20.8 32" stroke="white" strokeWidth="0.7" strokeLinecap="round" fill="none" opacity="0.45" />}
    </>
  )
}

/** A leaf: its own shape, a lighter upper half and a midrib (the last two only when drawn large). */
function Leaf({ x, y, side, size, fill, delay, fine }: { x: number; y: number; side: 1 | -1; size: number; fill: string; delay: number; fine: boolean }) {
  const tip = x + side * size * 1.6
  const ty = y - size * 0.7
  return (
    <g className={`plant-leaf ${side === 1 ? 'is-r' : 'is-l'}`} style={{ '--d': `${delay}ms` } as CSSProperties}>
      <path d={`M${x} ${y} Q${x + side * size * 0.6} ${y - size} ${tip} ${ty} Q${x + side * size * 0.9} ${y + size * 0.1} ${x} ${y}z`} fill={fill} />
      {fine && (
        <>
          <path d={`M${x} ${y} Q${x + side * size * 0.6} ${y - size} ${tip} ${ty} Q${x + side * size * 0.55} ${y - size * 0.45} ${x} ${y}z`} fill="white" opacity="0.2" />
          <path d={`M${x} ${y} Q${x + side * size * 0.75} ${y - size * 0.45} ${tip - side * 0.5} ${ty + 0.3}`} stroke="color-mix(in srgb, var(--plant-leaf) 50%, black)" strokeWidth="0.4" fill="none" strokeLinecap="round" opacity="0.5" />
        </>
      )}
    </g>
  )
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
