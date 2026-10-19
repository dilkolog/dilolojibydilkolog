import { useEffect, useState } from 'react'
import { db } from '../data/instance'
import type { Settings } from '../data/db'
import { memoryAdvice } from '../engine/memoryAdvice'
import { historiesFrom, MIN_REVIEWS, scoredReviews } from '../engine/optimizer'
import { BrainIcon } from './icons'
import { getTried } from './memoryAdvice'

/**
 * One line on Today when the memory model can be fitted to the learner (enough answers, no personal model
 * yet) or refitted (it is old and the history has doubled). It opens Settings, where the fit runs.
 */
export function MemoryNudge({ settings, onOpen }: { settings: Settings; onOpen: () => void }) {
  const [advice, setAdvice] = useState<'fit' | 'refit' | null>(null)
  const { fsrsWeights, fsrsFit } = settings
  useEffect(() => {
    let live = true
    void (async () => {
      // A cheap look first: the answers are only walked once there could be enough of them.
      if ((await db.events.count()) < MIN_REVIEWS) return
      const scored = scoredReviews(historiesFrom(await db.allEvents()))
      const next = memoryAdvice({ scored, fit: fsrsFit, hasWeights: !!fsrsWeights, tried: getTried(), now: new Date() })
      if (live) setAdvice(next)
    })()
    return () => {
      live = false
    }
  }, [fsrsWeights, fsrsFit])
  if (!advice) return null
  return (
    <div className="habit-nudge">
      <button type="button" className="habit-nudge-main" onClick={onOpen}>
        <BrainIcon size={18} />
        <span>
          <strong>{advice === 'fit' ? 'Tekrar zamanları sana göre ayarlanabilir.' : 'Hafıza modelin yenilenebilir.'}</strong>{' '}
          <span className="muted">{advice === 'fit' ? 'Yeterince cevabın var; unutma hızına göre planlansın.' : 'Cevapların epeyce arttı; model yeni halinle yeniden hesaplanabilir.'}</span>
        </span>
        <span className="habit-nudge-cta">Ayarla</span>
      </button>
    </div>
  )
}
