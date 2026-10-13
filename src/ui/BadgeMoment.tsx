import { useEffect, useState } from 'react'
import { medalTier, type AchievementState } from '../engine/gamification'
import { Burst } from './Burst'
import { shareCard } from './shareCard'
import { Medal } from './Medal'
import { byTier, TIER_NAME } from './badgeTier'

/**
 * A new badge, full screen, once: the medal is struck (it springs in, a ring leaves it in its
 * metal's colour, a glint crosses it), a line on what it was for, confetti. Several at once (two
 * or three; more go in quietly, see BadgeWatcher) share one screen, side by side, the best last:
 * one moment, not a row of "Sonraki".
 */
export function BadgeMoment({ badges, onClose, onProfile }: { badges: AchievementState[]; onClose: () => void; onProfile?: () => void }) {
  const ordered = [...badges].sort(byTier)
  const [i, setI] = useState(0)
  const a = ordered[i]
  const last = i === ordered.length - 1
  const tier = medalTier(a)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopImmediatePropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])

  const share = async () => {
    await shareCard({ kicker: 'Yeni rozet', title: a.title, text: a.description }, `Yeni rozet: ${a.title}. ${a.description}`)
  }

  if (ordered.length > 1)
    return (
      <div className="dialog-backdrop milestone-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        <div className="dialog milestone badge-moment" role="dialog" aria-modal="true" aria-labelledby="badge-moment-title">
          <Burst />
          <h2 id="badge-moment-title" className="milestone-title">
            {ordered.length} yeni rozet
          </h2>
          <ul className="badge-moment-group">
            {ordered.map((b) => (
              <li key={b.id} className={`badge-moment-art tier-${medalTier(b)}`}>
                <Medal icon={b.icon} tier={medalTier(b)} unlocked size={72} />
                <strong>{b.title}</strong>
                <span className="small muted">{b.description}</span>
              </li>
            ))}
          </ul>
          <div className="dialog-actions milestone-actions">
            {onProfile && (
              <button className="btn btn-quiet" onClick={onProfile}>
                Profilde gör
              </button>
            )}
            <button className="btn" onClick={onClose} autoFocus>
              Devam
            </button>
          </div>
        </div>
      </div>
    )

  return (
    <div className="dialog-backdrop milestone-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog milestone badge-moment" role="dialog" aria-modal="true" aria-labelledby="badge-moment-title">
        <p className="eyebrow">{ordered.length > 1 ? `Yeni rozet ${i + 1}/${ordered.length}` : 'Yeni rozet!'}</p>
        {/* Keyed by the badge, so each one is struck afresh. */}
        <div className={`milestone-art badge-moment-art tier-${tier}`} key={a.id}>
          <Burst />
          <span className="badge-moment-ring" aria-hidden />
          <Medal icon={a.icon} tier={tier} unlocked size={104} />
        </div>
        <span className={`badge-tier tier-${tier}`}>{TIER_NAME[tier]} rozet</span>
        <h2 id="badge-moment-title" className="milestone-title">
          {a.title}
        </h2>
        <p className="muted">{a.description}</p>
        {ordered.length > 1 && (
          <span className="moment-dots" aria-hidden>
            {ordered.map((b, n) => (
              <i key={b.id} className={n === i ? 'is-now' : n < i ? 'is-done' : undefined} />
            ))}
          </span>
        )}
        <div className="dialog-actions milestone-actions">
          {last && 'share' in navigator && (
            <button className="btn btn-quiet" onClick={share}>
              Paylaş
            </button>
          )}
          {last && onProfile && (
            <button className="btn btn-quiet" onClick={onProfile}>
              Profilde gör
            </button>
          )}
          <button className="btn" onClick={() => (last ? onClose() : setI(i + 1))} autoFocus>
            {last ? 'Devam' : 'Sonraki'}
          </button>
        </div>
      </div>
    </div>
  )
}
