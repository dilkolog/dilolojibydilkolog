import { MASTERY_STAGES } from '../engine/mastery'
import type { SessionSummary, WordResult } from '../engine/session'
import { GardenSky } from './GardenSky'
import { GrowingPlant, Plant } from './Plant'
import { sceneWords } from './summaryGardenWords'

const STAGE_FLOWER = MASTERY_STAGES.length - 1

const rank = (s?: WordResult['stageBefore']) => (s ? MASTERY_STAGES.indexOf(s) : -1)

/**
 * The end of a session as a small garden under the sky of the hour: a plant for each word worked on,
 * the ones that grew shown growing. The sun or moon, butterflies and bees are the garden's own.
 */
export function SummaryGarden({ summary, now = new Date() }: { summary: SessionSummary; now?: Date }) {
  const words = sceneWords(summary.words)
  if (!words.length) return null
  const grown = words.filter((w) => rank(w.stageAfter) > rank(w.stageBefore))
  const flowers = words.filter((w) => rank(w.stageAfter ?? w.stageBefore) >= STAGE_FLOWER).length
  return (
    <section className="summary-scene" aria-label={`Bahçen: ${words.length} bitki, ${grown.length} tanesi büyüdü`}>
      <GardenSky now={now} flowers={flowers} growing={grown.length} />
      <div className="scene-ground" aria-hidden />
      <ul className="scene-plants" aria-hidden>
        {words.map((w, i) => {
          const from = rank(w.stageBefore)
          const to = rank(w.stageAfter ?? w.stageBefore)
          return (
            <li key={w.entryId} style={{ ['--i' as string]: i }}>
              {to > from ? <GrowingPlant from={from} to={to} delay={500 + i * 220} size={68} /> : <Plant stage={to} size={58} />}
            </li>
          )
        })}
      </ul>
      <p className="scene-caption small">{grown.length ? `${grown.length} kelime büyüdü` : `${words.length} kelime sulandı`}</p>
    </section>
  )
}
