import { useEffect, useRef, useState } from 'react'
import { growthStage, stageProgress } from '../../engine/growth'
import { MASTERY_STAGES } from '../../engine/mastery'
import type { UserWordState } from '../../engine/types'
import { STAGE_NAME } from '../labels'
import { Plant } from '../Plant'

const R = 27
const CIRCUMFERENCE = 2 * Math.PI * R

/**
 * The word's plant beside the question, as in Memrise: the ring is the way to the next stage and
 * fills as answers strengthen the memory; reaching a stage fills it, the plant grows into its next
 * shape and the ring starts again for the stage after.
 */
export function WordPlant({ state }: { state: UserWordState | undefined }) {
  const stage = growthStage(state)
  const progress = stage >= MASTERY_STAGES.length - 1 ? 1 : stageProgress(state)
  const [shown, setShown] = useState({ stage, progress, phase: 'idle' as 'idle' | 'filling' | 'growing' | 'reset' | 'watered' })
  const last = useRef({ stage, progress })

  useEffect(() => {
    const before = last.current
    last.current = { stage, progress }
    if (stage === before.stage && progress === before.progress) return
    const timers: number[] = []
    const later = (ms: number, f: () => void) => timers.push(window.setTimeout(f, ms))
    if (stage > before.stage) {
      // Fill the old ring, grow the plant, then start the new stage's ring from empty.
      setShown({ stage: before.stage, progress: 1, phase: 'filling' })
      later(550, () => setShown({ stage, progress: 1, phase: 'growing' }))
      later(1500, () => setShown({ stage, progress: 0, phase: 'reset' }))
      later(1560, () => setShown({ stage, progress, phase: 'idle' }))
    } else {
      setShown({ stage, progress, phase: progress > before.progress ? 'watered' : 'idle' })
      if (progress > before.progress) later(900, () => setShown((s) => ({ ...s, phase: 'idle' })))
    }
    return () => timers.forEach(clearTimeout)
  }, [stage, progress])

  const name = shown.stage < 0 ? 'Tohum' : STAGE_NAME[MASTERY_STAGES[shown.stage]]
  const percent = Math.round(shown.progress * 100)
  const bloom = shown.stage >= MASTERY_STAGES.length - 1
  return (
    <div
      className={`word-plant is-${shown.phase}`}
      role="img"
      aria-label={bloom ? `Kelime bitkisi: ${name}` : `Kelime bitkisi: ${name}, sonraki aşamaya %${percent}`}
      title={bloom ? name : `${name} · sonraki aşamaya %${percent}`}
    >
      <span className="word-plant-figure">
        <svg className="word-plant-ring" viewBox="0 0 60 60" aria-hidden>
          <circle className="word-plant-track" cx="30" cy="30" r={R} />
          <circle className="word-plant-fill" cx="30" cy="30" r={R} strokeDasharray={CIRCUMFERENCE} strokeDashoffset={CIRCUMFERENCE * (1 - shown.progress)} />
        </svg>
        <Plant stage={shown.stage} size={50} />
      </span>
      <span className="word-plant-name">{name}</span>
    </div>
  )
}
