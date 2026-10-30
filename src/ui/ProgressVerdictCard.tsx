import type { ProgressVerdict, VerdictGo } from '../engine/progressVerdict'
import { BulbIcon } from './icons'

/** The top of Progress: what the learner's figures say this week, in a sentence, and the one thing to do about it. */
export function ProgressVerdictCard({ verdict, onGo }: { verdict: ProgressVerdict; onGo?: (go: VerdictGo) => void }) {
  return (
    <section className="card progress-verdict span-2" aria-labelledby="progress-verdict-title">
      <p className="eyebrow eyebrow-icon" id="progress-verdict-title">
        <BulbIcon size={16} /> Bu haftanın yorumu
      </p>
      <p className="progress-verdict-text">{verdict.text}</p>
      {verdict.action && onGo && (
        <button type="button" className="btn progress-verdict-go" onClick={() => onGo(verdict.action!.go)}>
          {verdict.action.label}
        </button>
      )}
    </section>
  )
}
