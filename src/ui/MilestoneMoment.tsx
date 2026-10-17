import { useEffect, useState } from 'react'
import type { Milestone } from '../engine/gamification'
import { Burst } from './Burst'
import { Glyph } from './Glyph'
import { shareCard } from './shareCard'
import { sfx } from './sounds'
import { CloseIcon } from './icons'

/** The new level: the badge shows the old number, charges with anticipation, and bursts to the new one with rings and sparkles. */
export function LevelUpBadge({ from, to, size = 'md' }: { from: number; to: number; size?: 'md' | 'xl' }) {
  const [level, setLevel] = useState(from)
  useEffect(() => {
    const t = setTimeout(() => setLevel(to), 800)
    return () => clearTimeout(t)
  }, [to])
  const isUp = level === to
  const isXl = size === 'xl'

  return (
    <span className={`level-strike${isXl ? ' level-strike-xl' : ''}${isUp ? ' is-up' : ''}`}>
      <span className={`level-badge ${isXl ? 'level-badge-xl' : 'level-badge-lg'}`} key={level}>
        {level}
      </span>
      {isUp && (
        <span className="level-sparkles" aria-hidden="true">
          <span className="level-sparkle sp-1" />
          <span className="level-sparkle sp-2" />
          <span className="level-sparkle sp-3" />
          <span className="level-sparkle sp-4" />
        </span>
      )}
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

  const rankMatch = milestone.text.match(/^Yeni unvanın:\s*([^.]+)\.\s*(.*)$/i)
  const isLevel = Boolean(milestone.level)

  return (
    <div className="dialog-backdrop milestone-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="milestone-burst-wrap" aria-hidden="true">
        <Burst />
      </div>
      <div className="dialog milestone" role="dialog" aria-modal="true" aria-labelledby="ms-title">
        <button type="button" className="icon-btn milestone-close" onClick={onClose} aria-label="Kapat">
          <CloseIcon size={18} />
        </button>

        <span className="milestone-kicker">
          {isLevel ? '🎉 Yeni Seviye' : '🏆 Kilometre Taşı'}
        </span>

        <div className="milestone-art">
          <div className="milestone-aura" aria-hidden="true" />
          {milestone.level ? (
            <span className="milestone-level" aria-hidden>
              <LevelUpBadge from={milestone.level.from} to={milestone.level.to} size="xl" />
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

        {rankMatch ? (
          <div className="milestone-rank-card">
            <span className="milestone-rank-label">Yeni Unvan</span>
            <strong className="milestone-rank-title">{rankMatch[1]}</strong>
          </div>
        ) : null}

        <p className="milestone-text muted">
          {rankMatch ? rankMatch[2] : milestone.text}
        </p>

        <div className="dialog-actions milestone-actions">
          {'share' in navigator && (
            <button className="btn btn-quiet milestone-share-btn" onClick={share}>
              Paylaş
            </button>
          )}
          <button className="btn milestone-continue-btn" onClick={onClose} autoFocus>
            Devam
          </button>
        </div>
      </div>
    </div>
  )
}
