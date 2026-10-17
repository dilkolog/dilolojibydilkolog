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
  const captionText = grown.length ? `${grown.length} kelime büyüdü` : `${words.length} kelime sulandı`
  return (
    <section className="summary-scene" aria-label={`Bahçen: ${words.length} bitki, ${grown.length} tanesi büyüdü`}>
      <GardenSky now={now} flowers={flowers} growing={grown.length} />
      <div className="scene-ground" aria-hidden>
        <svg className="scene-ground-svg" viewBox="0 0 400 48" preserveAspectRatio="none">
          <defs>
            <linearGradient id="summary-ground-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="color-mix(in srgb, var(--plant-leaf) 85%, #15803d)" />
              <stop offset="38%" stopColor="color-mix(in srgb, var(--plant-leaf) 65%, #14532d)" />
              <stop offset="100%" stopColor="color-mix(in srgb, var(--plant-leaf) 35%, #052e16)" />
            </linearGradient>
          </defs>
          {/* Back crest for lush depth */}
          <path d="M0 48 V16 Q95 7 205 13 T400 9 V48Z" fill="color-mix(in srgb, var(--plant-leaf) 55%, #064e3b)" opacity="0.45" />
          {/* Main rolling lawn */}
          <path d="M0 48 V13 Q110 5 210 11 T400 8 V48Z" fill="url(#summary-ground-grad)" />
          {/* Sunlight shimmer rim on grass crest */}
          <path d="M0 13 Q110 5 210 11 T400 8" stroke="rgb(255 255 255 / 0.3)" strokeWidth="1.6" fill="none" />
        </svg>
      </div>
      <ul className="scene-plants" aria-hidden>
        {words.map((w, i) => {
          const from = rank(w.stageBefore)
          const to = rank(w.stageAfter ?? w.stageBefore)
          const willGrow = to > from
          return (
            <li
              key={w.entryId}
              style={{
                ['--i' as string]: i,
                ['--stagger-y' as string]: `${((i * 5) % 7) - 3}px`,
              }}
            >
              {willGrow ? (
                <GrowingPlant from={from} to={to} delay={500 + i * 220} size={68} />
              ) : (
                <Plant stage={to} size={58} live phase={i} watered />
              )}
            </li>
          )
        })}
      </ul>
      <div className="scene-caption-wrap">
        <p className="scene-caption scene-caption-pill small">
          <span className="caption-icon" aria-hidden>{grown.length ? '🌱' : '💧'}</span>
          <span>{captionText}</span>
        </p>
      </div>
    </section>
  )
}
