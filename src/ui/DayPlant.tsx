import { useEffect, useState } from 'react'
import { POTS } from './drawnArt'
import { dayStage } from './dayPlantStage'

const key = (language: string) => `kelime-koc:day-plant:${language}`
const today = () => new Date().toLocaleDateString('sv')   // yyyy-mm-dd, local

/** The stage this day's plant was last shown at (so coming back from a session finds it as it was left). */
function lastShown(language: string): number | undefined {
  try {
    const [day, stage] = (localStorage.getItem(key(language)) ?? '').split(':')
    return day === today() && stage !== undefined && stage !== '' ? Number(stage) : undefined
  } catch {
    return undefined
  }
}

/**
 * Inside the Today ring, on a light disc so the language's colour behind it does not swallow the
 * flower: the task as a plant that grows as questions are answered. It starts from
 * the stage it was left at and then moves on to the current one, so after a session the learner
 * sees it grow (the plant animates its own stage changes).
 */
export function DayPlant({ language, progress, done }: { language: string; progress: number; done: boolean }) {
  const target = dayStage(progress, done)
  const [shown, setShown] = useState(() => lastShown(language) ?? (target > 0 ? -1 : target))
  useEffect(() => {
    if (shown === target) return
    // A beat after arriving, so the move is seen, not missed.
    const t = setTimeout(() => setShown(target), 450)
    return () => clearTimeout(t)
  }, [shown, target])
  useEffect(() => {
    try {
      localStorage.setItem(key(language), `${today()}:${shown}`)
    } catch {
      // The plant just starts from the seed next time.
    }
  }, [language, shown])
  return (
    <span className={`day-plant${shown < 0 ? ' plant-waiting' : ''}`}>
      {/* Keyed by stage: a new stage is a new picture, which grows in. The seed waits, hopping now and then. */}
      <img key={shown} className={`day-pot${shown < 0 ? ' plant-seed-hop' : ' is-grow'}`} src={POTS[Math.min(POTS.length - 1, shown + 1)]} alt="" draggable={false} />
    </span>
  )
}
