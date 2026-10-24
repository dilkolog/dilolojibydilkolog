import type { DuelComment } from '../../engine/duelComment'
import { MonkiFace } from './MonkiMascot'

/** Monki's few words under a duel's result: a face and a line (set lines, no request). */
export function MonkiVerdict({ comment }: { comment: DuelComment }) {
  return (
    <p className="monki-verdict small" role="note">
      <MonkiFace face={comment.face} size={36} />
      <span>
        <strong>Monki:</strong> {comment.text}
      </span>
    </p>
  )
}
