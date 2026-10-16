import { useEffect, useState } from 'react'
import type { Milestone } from '../engine/gamification'
import { Burst } from './Burst'
import { Glyph } from './Glyph'
import { shareCard } from './shareCard'
import { sfx } from './sounds'

/** The new level: the badge shows the old number, flips to the new one with a ring, as if it were struck. */
export function LevelUpBadge({ from, to }: { from: number; to: number }) {
  const [level, setLevel] = useState(from)
  useEffect(() => {
    const t = setTimeout(() => setLevel(to), 800)
    return () => clearTimeout(t)
  }, [to])
  return (
    <span className={`level-strike${level === to ? ' is-up' : ''}`}>
      <span className="level-badge level-badge-lg" key={level}>
        {level}
      </span>
    </span>
  )
}

/** A crossed milestone, once, full screen: big sign, a line on what it means, confetti, share. */
export function MilestoneMoment({ milestone, onClose }: { milestone: Milestone; onClose: () => void }) {
  useEffect(() => {
    sfx.levelUp()
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
    await shareCard(
      {
        kicker: milestone.level ? 'Seviye atladım' : 'Yeni kilometre taşı',
        title: milestone.title,
        text: milestone.text,
        art: milestone.level ? 'level' : 'trophy',
      },
      `${milestone.emoji} ${milestone.title} ${milestone.text}`,
    )
  }

  return (
    <div className="dialog-backdrop milestone-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog milestone" role="dialog" aria-modal="true" aria-labelledby="ms-title">
        <div className="milestone-art">
          <Burst />
          {milestone.level ? (
            <span className="milestone-level" aria-hidden>
              <LevelUpBadge from={milestone.level.from} to={milestone.level.to} />
            </span>
          ) : (
            <span className="milestone-emoji" aria-hidden>
              <Glyph emoji={milestone.emoji} size={64} />
            </span>
          )}
        </div>
        <h2 id="ms-title" className="milestone-title">
          {milestone.title}
        </h2>
        <p className="muted">{milestone.text}</p>
        <div className="dialog-actions milestone-actions">
          {'share' in navigator && (
            <button className="btn btn-quiet" onClick={share}>
              Paylaş
            </button>
          )}
          <button className="btn" onClick={onClose} autoFocus>
            Devam
          </button>
        </div>
      </div>
    </div>
  )
}
