import { MASTERY_STAGES } from '../engine/mastery'
import type { SessionSummary, WordResult } from '../engine/session'
import { GardenSky } from './GardenSky'
import { skyPhase } from './gardenSkyCalculations'
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
  const hour = now.getHours() + now.getMinutes() / 60
  const phase = skyPhase(hour)

  return (
    <section className={`summary-scene is-${phase}`} aria-label={`Bahçen: ${words.length} bitki, ${grown.length} tanesi büyüdü`}>
      <GardenSky now={now} flowers={flowers} growing={grown.length} />
      <div className="scene-ground" aria-hidden>
        <svg className="scene-ground-svg" viewBox="0 0 400 54" preserveAspectRatio="none">
          <defs>
            <linearGradient id="summary-ground-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--ground-top, #15803d)" />
              <stop offset="40%" stopColor="var(--ground-mid, #14532d)" />
              <stop offset="100%" stopColor="var(--ground-base, #052e16)" />
            </linearGradient>
            <linearGradient id="summary-ground-glow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--crest-glow, rgba(255, 255, 255, 0.15))" />
              <stop offset="100%" stopColor="transparent" />
            </linearGradient>
          </defs>
          {/* Distant soft hill ridge for atmospheric depth */}
          <path d="M0 54 V19 Q100 11 205 16 T400 12 V54Z" fill="var(--ground-back, #064e3b)" opacity="0.5" />
          {/* Main rolling lawn */}
          <path d="M0 54 V15 Q105 8 210 13 T400 9 V54Z" fill="url(#summary-ground-grad)" />
          {/* Ambient sheen across upper lawn */}
          <path d="M0 54 V15 Q105 8 210 13 T400 9 V54Z" fill="url(#summary-ground-glow)" opacity="0.75" />
          {/* Delicate crest highlight rim */}
          <path d="M0 15 Q105 8 210 13 T400 9" stroke="var(--crest-shimmer, rgba(255, 255, 255, 0.35))" strokeWidth="1.6" fill="none" />
          {/* Organic grass tufts along crest */}
          <g stroke="var(--crest-shimmer, rgba(255, 255, 255, 0.3))" strokeWidth="1" strokeLinecap="round" opacity="0.55">
            <path d="M42 17 l-1 -3 M44 17 l1.4 -3.4" />
            <path d="M118 10 l-1.2 -3.2 M120 10 l1.2 -3" />
            <path d="M198 14 l-1 -3 M200 14 l1.5 -3.3" />
            <path d="M285 11 l-1.2 -3 M287 11 l1.2 -3.2" />
            <path d="M362 10 l-1 -3.2 M364 10 l1.5 -3" />
          </g>
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
                ['--stagger-y' as string]: `${((i * 3) % 5) - 2}px`,
              }}
            >
              {willGrow ? (
                <GrowingPlant from={from} to={to} delay={500 + i * 220} size={62} garden />
              ) : (
                <Plant stage={to} size={62} live phase={i} watered garden />
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
