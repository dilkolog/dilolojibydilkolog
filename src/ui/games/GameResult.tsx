import type { ReactNode } from 'react'
import type { TargetLanguage } from '../../engine/types'
import { FlagIcon, TrophyIcon } from '../icons'
import { Ring } from '../Ring'

/**
 * The end of every game in one layout: the result (a ring for accuracy, or a badge), the headline
 * figure, a strip of figures, the words to look at again, and the same two buttons.
 */
export function GameResult({
  record,
  title,
  headline,
  accuracy,
  stats = [],
  note,
  missed = [],
  missedLabel = 'Tekrar bakmaya değer',
  language,
  children,
  onAgain,
  onExit,
}: {
  record?: boolean
  title: string
  headline: ReactNode
  /** 0–1; shown as a ring. Without it a badge stands in. */
  accuracy?: number
  stats?: { label: string; value: ReactNode }[]
  note?: ReactNode
  missed?: string[]
  missedLabel?: string
  language?: TargetLanguage
  children?: ReactNode
  onAgain: () => void
  onExit: () => void
}) {
  return (
    <div className="game-result">
      <div className="game-result-card">
        {accuracy !== undefined ? (
          <Ring value={accuracy} size={116} stroke={11} label={`%${Math.round(accuracy * 100)}`} doneLabel="%100" />
        ) : (
          <span className={`game-result-badge${record ? ' is-record' : ''}`} aria-hidden>
            {record ? <TrophyIcon size={34} /> : <FlagIcon size={32} />}
          </span>
        )}
        <h1 className="game-result-title">
          {record && accuracy !== undefined && <TrophyIcon size={22} className="inline-icon record-icon" />}
          {title}
        </h1>
        <p className="game-result-headline">{headline}</p>
        {note && <p className="muted game-result-note">{note}</p>}
        {children}
        {stats.length > 0 && (
          <dl className="celebrate-stats game-result-stats" style={{ gridTemplateColumns: `repeat(${stats.length}, minmax(0, 1fr))` }}>
            {stats.map((s) => (
              <div key={s.label}>
                <dd>{s.value}</dd>
                <dt>{s.label}</dt>
              </div>
            ))}
          </dl>
        )}
      </div>
      {missed.length > 0 && (
        <div className="game-missed">
          <span className="small muted">{missedLabel}</span>
          {missed.map((m) => (
            <span key={m} className="missed-chip" lang={language}>
              {m}
            </span>
          ))}
        </div>
      )}
      <div className="game-result-actions">
        <button className="btn btn-lg" onClick={onAgain} autoFocus>
          Tekrar oyna
        </button>
        <button className="btn btn-lg btn-quiet" onClick={onExit}>
          Oyunlara dön
        </button>
      </div>
    </div>
  )
}
