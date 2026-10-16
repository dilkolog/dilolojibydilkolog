import type { ReactNode } from 'react'
import { GAME_ART } from './gameArt'
import type { GameId } from './gameList'
import { STAT_ART } from './drawnArt'
import headDictionary from '../assets/art/head-dictionary.webp'
import headGames from '../assets/art/head-games.webp'
import headProduce from '../assets/art/head-produce.webp'
import headSentences from '../assets/art/head-sentences.webp'
import headSettings from '../assets/art/head-settings.webp'
import headStory from '../assets/art/head-story.webp'
import headTranslate from '../assets/art/head-translate.webp'
import headWords from '../assets/art/head-words.webp'
import headMistakes from '../assets/art/head-mistakes.webp'
import headExam from '../assets/art/head-exam.webp'
import headVocabtest from '../assets/art/head-vocabtest.webp'
import guideTeach from '../assets/art/guide-teach.webp'
import progressReport from '../assets/art/progress-report.webp'
import gameGear from '../assets/art/game-gear.webp'
import avatarCat from '../assets/art/avatar-cat.webp'

/**
 * Storybook illustrated icons for every destination and action in the command palette,
 * replacing generic wireframes and system emojis with cohesive Diloloji artwork.
 */
export const SCREEN_PALETTE_ART: Record<string, string> = {
  home: STAT_ART.flame,
  words: headWords,
  dictionary: headDictionary,
  translate: headTranslate,
  mistakes: headMistakes,
  reading: headStory,
  story: headStory,
  games: headGames,
  verbs: gameGear,
  produce: headProduce,
  guide: guideTeach,
  progress: progressReport,
  profile: avatarCat,
  settings: headSettings,
  sentences: headSentences,
}

export const ACTION_PALETTE_ART: Record<string, string> = {
  start: STAT_ART.flame,
  add: STAT_ART.sprout,
  practice: STAT_ART.star,
  'mistakes-practice': headMistakes,
  vocabtest: headVocabtest,
  exam: headExam,
  'add-typed': STAT_ART.sprout,
  'look-up': headDictionary,
}

export function commandArtIcon(id: string, fallback?: ReactNode): ReactNode {
  if (id.startsWith('game-')) {
    const gameId = id.slice(5) as GameId
    const art = GAME_ART[gameId]
    if (art) return <img className="palette-art-icon" src={art} alt="" width={22} height={22} draggable={false} />
  }
  const actionArt = ACTION_PALETTE_ART[id]
  if (actionArt) return <img className="palette-art-icon" src={actionArt} alt="" width={22} height={22} draggable={false} />

  const screenArt = SCREEN_PALETTE_ART[id]
  if (screenArt) return <img className="palette-art-icon" src={screenArt} alt="" width={22} height={22} draggable={false} />

  return fallback
}
