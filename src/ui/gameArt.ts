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
import gTwins from '../assets/art/game-twins.webp'
import swap from '../assets/art/game-swap.webp'
import target from '../assets/art/game-target.webp'
import tiles from '../assets/art/game-tiles.webp'
import book from '../assets/art/game-book.webp'
import cards from '../assets/art/game-cards.webp'
import chat from '../assets/art/game-chat.webp'
import headphones from '../assets/art/game-headphones.webp'
import headBack from '../assets/art/head-back.webp'
import gSwipe from '../assets/art/game-swipe.webp'
import gTruefalse from '../assets/art/game-truefalse.webp'
import gStrip from '../assets/art/game-strip.webp'
import gMonster from '../assets/art/game-monster.webp'
import gMusic from '../assets/art/game-music.webp'
import gEar from '../assets/art/game-ear.webp'
import gWaves from '../assets/art/game-waves.webp'
import gBolt from '../assets/art/game-bolt.webp'
import gShoe from '../assets/art/game-shoe.webp'
import gTags from '../assets/art/game-tags.webp'
import gGear from '../assets/art/game-gear.webp'
import gGifts from '../assets/art/game-gifts.webp'
import gGaps from '../assets/art/game-gaps.webp'
import gDuel from '../assets/art/game-duel.webp'
import gPodcast from '../assets/art/game-podcast.webp'
import gSong from '../assets/art/game-song.webp'
import gSpotError from '../assets/art/game-spot-error.webp'
import gRewrite from '../assets/art/game-rewrite.webp'
import gCollocations from '../assets/art/game-collocations.webp'

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
  duel: gDuel,
  podcast: gPodcast,
  song: gSong,
  dictation: headphones,
  back: headBack,
  pron: mic,
  aspect: hourglass,
  test: target,
  accent: tiles,
  notes: book,
  swipe: gSwipe,
  truefalse: gTruefalse,
  sentences: gStrip,
  boss: gMonster,
  audio: gMusic,
  ear: gEar,
  pairs: gWaves,
  blitz: gBolt,
  fluency: gShoe,
  article: gTags,
  conjugation: gGear,
  gender: gGifts,
  context: gGaps,
  'spot-error': gSpotError,
  rewrite: gRewrite,
  collocations: gCollocations,
  // A stopgap: the swap sign mirrored, until the owner draws twins.
  confusables: gTwins,
}
