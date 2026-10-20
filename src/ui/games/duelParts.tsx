import type { DuelResult } from '../../engine/duel'

export function DuelSide({ result, of, you = false, winner = false }: { result: DuelResult; of: number; you?: boolean; winner?: boolean }) {
  return (
    <div className={`duel-side${winner ? ' duel-won' : ''}`}>
      <strong>{you ? `${result.name} (sen)` : result.name}</strong>
      <span className="duel-score">
        {result.score}/{of}
      </span>
      <span className="small muted">{Math.round(result.ms / 1000)} sn</span>
      {winner && <span className="small">🏆</span>}
    </div>
  )
}

