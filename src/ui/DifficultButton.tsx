import { BoltIcon } from './icons'

/**
 * The lightning mark: "this word is hard for me". A marked word is gathered with the others in a
 * practice of its own (Today, and the Zor filter of the word list).
 */
export function DifficultButton({ marked, onToggle, className = 'icon-btn' }: { marked: boolean; onToggle: () => void; className?: string }) {
  return (
    <button
      type="button"
      className={`${className} difficult-btn${marked ? ' is-marked' : ''}`}
      aria-pressed={marked}
      aria-label={marked ? 'Zor işaretini kaldır' : 'Zor diye işaretle'}
      title={marked ? 'Zor işaretli: ayrı bir çalışmada toplanır' : 'Zor diye işaretle: bu kelimeleri ayrı bir çalışmada toplarız'}
      onClick={onToggle}
    >
      <BoltIcon size={20} solid={marked} />
    </button>
  )
}
