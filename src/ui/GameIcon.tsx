import { Glyph } from './Glyph'
import { GAME_ART } from './gameArt'
import type { GameId } from './gameList'

/** A game's sign: its drawing when it has one, else its emoji glyph. */
export function GameIcon({ id, emoji, size }: { id: string; emoji: string; size: number }) {
  const art = GAME_ART[id as GameId]
  return art ? <img className="game-art" src={art} width={size} height={size} alt="" draggable={false} /> : <Glyph emoji={emoji} size={size} />
}
