import type { StudyGains } from '../engine/gains'
import { BrainIcon } from './icons'

const pct = (x: number) => Math.round(x * 100)

/**
 * What the studying has bought, in one line on Today: words that now come to mind from their
 * meaning (and how many got there this week), and how often a due word is still remembered next
 * to the target. Shown once there is something to show.
 */
export function GainsNudge({ gains, target, onOpen }: { gains: StudyGains; target: number; onOpen: () => void }) {
  if (!gains.recallable && gains.recallRate === null) return null
  const parts = [
    gains.recallable > 0 && `${gains.recallable} kelimeyi artık Türkçesinden yazabiliyorsun${gains.newThisWeek ? ` (bu hafta +${gains.newThisWeek})` : ''}`,
    gains.recallRate !== null && `tekrarlarda %${pct(gains.recallRate)} hatırladın (hedef %${pct(target)})`,
  ].filter(Boolean)
  return (
    <div className="habit-nudge">
      <button type="button" className="habit-nudge-main" onClick={onOpen}>
        <BrainIcon size={18} />
        <span>
          <strong>Kazandıkların:</strong> <span className="muted">{parts.join('; ')}.</span>
        </span>
        <span className="habit-nudge-cta">İlerleme</span>
      </button>
    </div>
  )
}
