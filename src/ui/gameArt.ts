import type { GameId } from './gameList'
import drops from '../assets/art/game-drops.webp'
import hourglass from '../assets/art/game-hourglass.webp'
import magnifier from '../assets/art/game-magnifier.webp'
import mask from '../assets/art/game-mask.webp'
import mic from '../assets/art/game-mic.webp'
import paragraph from '../assets/art/game-paragraph.webp'
import picture from '../assets/art/game-picture.webp'
import puzzle from '../assets/art/game-puzzle.webp'
import stopwatch from '../assets/art/game-stopwatch.webp'
import swap from '../assets/art/game-swap.webp'
import target from '../assets/art/game-target.webp'
import tiles from '../assets/art/game-tiles.webp'
import book from '../assets/art/game-book.webp'
import cards from '../assets/art/game-cards.webp'
import chat from '../assets/art/game-chat.webp'
import headphones from '../assets/art/game-headphones.webp'

/** The drawn sign of the games that have one; the others keep their emoji glyph. */
export const GAME_ART: Partial<Record<GameId, string>> = {
  gravity: drops,
  reflex: stopwatch,
  match: cards,
  flow: paragraph,
  register: chat,
  traps: mask,
  affix: magnifier,
  diagram: picture,
  grammar: puzzle,
  dictation: headphones,
  back: swap,
  pron: mic,
  aspect: hourglass,
  test: target,
  accent: tiles,
  notes: book,
}
