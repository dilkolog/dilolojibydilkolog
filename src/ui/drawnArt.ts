import books from '../assets/art/medal-books.webp'
import flame from '../assets/art/medal-flame.webp'
import hundred from '../assets/art/medal-hundred.webp'
import lotus from '../assets/art/medal-lotus.webp'
import dragon from '../assets/art/medal-dragon.webp'
import headphones from '../assets/art/medal-headphones.webp'
import mic from '../assets/art/medal-mic.webp'
import daynight from '../assets/art/medal-daynight.webp'
import compass from '../assets/art/medal-compass.webp'
import diamond from '../assets/art/medal-diamond.webp'
import emSprout from '../assets/art/emblem-sprout.webp'
import emFlame from '../assets/art/emblem-flame.webp'
import emBolt from '../assets/art/emblem-bolt.webp'
import emBook from '../assets/art/emblem-book.webp'
import emStar from '../assets/art/emblem-star.webp'
import emChat from '../assets/art/emblem-chat.webp'
import emMic from '../assets/art/emblem-mic.webp'
import emTrophy from '../assets/art/emblem-trophy.webp'
import srcVideo from '../assets/art/src-video.webp'
import srcEbook from '../assets/art/src-ebook.webp'
import srcNotes from '../assets/art/src-notes.webp'
import pot0 from '../assets/art/pot-0.webp'
import pot2 from '../assets/art/pot-2.webp'
import pot4 from '../assets/art/pot-4.webp'
import morning from '../assets/art/time-morning.webp'
import noon from '../assets/art/time-noon.webp'
import evening from '../assets/art/time-evening.webp'
import night from '../assets/art/time-night.webp'
import perfect from '../assets/art/result-perfect.webp'
import great from '../assets/art/result-great.webp'
import good from '../assets/art/result-good.webp'
import hard from '../assets/art/result-hard.webp'
import streak from '../assets/art/result-streak.webp'
import record from '../assets/art/result-record.webp'
import pot1 from '../assets/art/pot-1.webp'
import pot3 from '../assets/art/pot-3.webp'
import pot5 from '../assets/art/pot-5.webp'
import posNoun from '../assets/art/pos-noun.webp'
import posVerb from '../assets/art/pos-verb.webp'
import posAdjective from '../assets/art/pos-adjective.webp'
import posAdverb from '../assets/art/pos-adverb.webp'
import posPreposition from '../assets/art/pos-preposition.webp'
import posPronoun from '../assets/art/pos-pronoun.webp'
import posPhrase from '../assets/art/pos-phrase.webp'
import posConjunction from '../assets/art/pos-conjunction.webp'
import type { PartOfSpeech } from '../engine/types'
import type { BadgeCategory } from '../engine/gamification'

/** A badge's own drawn medal, by what it counts (the badges without one keep the metal medal). */
const MEDAL_OF: Record<string, string> = {
  textsRead: books,
  longestStreak: flame,
  typedCorrect: hundred,
  freeSentencesCorrect: hundred,
  mastered: lotus,
  bossesDefeated: dragon,
  listeningCorrect: headphones,
  speakCorrect: mic,
  nightDays: daynight,
  earlyDays: daynight,
  languagesStudied: compass,
  level: diamond,
  totalXp: diamond,
}
export const drawnMedal = (stat: string): string | undefined => MEDAL_OF[stat]

export const CATEGORY_EMBLEM: Record<BadgeCategory, string> = { words: emSprout, habit: emFlame, skills: emBolt, writing: emBook, level: emStar }

/** The light of the hour: dawn → morning, day → noon, dusk → evening. */
export const TIME_SCENE: Record<string, string> = { dawn: morning, day: noon, dusk: evening, night }

export type ResultKind = 'perfect' | 'great' | 'good' | 'hard' | 'streak' | 'record'
export const RESULT_ART: Record<ResultKind, string> = { perfect, great, good, hard, streak, record }
/** How a session went, as Monki's reaction: a level-up is a record, a saved streak a shield, else by accuracy. */
export function resultKind(accuracy: number, answered: number, opts: { leveledUp?: boolean; streakSaved?: boolean } = {}): ResultKind {
  if (opts.leveledUp) return 'record'
  if (opts.streakSaved) return 'streak'
  if (accuracy >= 0.95 && answered >= 5) return 'perfect'
  if (accuracy >= 0.8) return 'great'
  if (accuracy >= 0.6) return 'good'
  return 'hard'
}

/** A word's whole life in six pots (seed, sprout, young plant, flowers, tree, gold) for the first-run garden. */
export const POTS = [pot0, pot1, pot2, pot3, pot4, pot5]

/** The other three badge emblems: a trophy for what was won, a chat bubble and a microphone for Monki's modes. */
export const EMBLEM = { chat: emChat, mic: emMic, trophy: emTrophy }

/** Small drawn icons for adding one's own text: a file of notes, a book, a video. */
export const ADD_ART = { notes: srcNotes, ebook: srcEbook, video: srcVideo }

/** Monki acting out a part of speech (nothing drawn for 'other'). */
export const POS_ART: Partial<Record<PartOfSpeech, string>> = {
  noun: posNoun, verb: posVerb, adjective: posAdjective, adverb: posAdverb, preposition: posPreposition, pronoun: posPronoun, phrase: posPhrase, conjunction: posConjunction,
}
