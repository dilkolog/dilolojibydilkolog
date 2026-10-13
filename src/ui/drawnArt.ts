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
import lvl0 from '../assets/art/monki-lvl-0.webp'
import lvl1 from '../assets/art/monki-lvl-1.webp'
import lvl2 from '../assets/art/monki-lvl-2.webp'
import lvl3 from '../assets/art/monki-lvl-3.webp'
import lvl4 from '../assets/art/monki-lvl-4.webp'
import lvl5 from '../assets/art/monki-lvl-5.webp'
import streak0 from '../assets/art/streak-0.webp'
import streak1 from '../assets/art/streak-1.webp'
import streak2 from '../assets/art/streak-2.webp'
import streak3 from '../assets/art/streak-3.webp'
import streak4 from '../assets/art/streak-4.webp'
import acctDoor from '../assets/art/acct-door.webp'
import acctWait from '../assets/art/acct-wait.webp'
import acctOk from '../assets/art/acct-ok.webp'
import acctNo from '../assets/art/acct-no.webp'
import setAccount from '../assets/art/set-account.webp'
import setStudy from '../assets/art/set-study.webp'
import setQuestions from '../assets/art/set-questions.webp'
import setSound from '../assets/art/set-sound.webp'
import setLook from '../assets/art/set-look.webp'
import setBell from '../assets/art/set-bell.webp'
import setTools from '../assets/art/set-tools.webp'
import setData from '../assets/art/set-data.webp'
import coverFood from '../assets/art/cover-food.webp'
import coverTravel from '../assets/art/cover-travel.webp'
import coverFamily from '../assets/art/cover-family.webp'
import coverWork from '../assets/art/cover-work.webp'
import coverHealth from '../assets/art/cover-health.webp'
import coverHome from '../assets/art/cover-home.webp'
import coverNature from '../assets/art/cover-nature.webp'
import coverSchool from '../assets/art/cover-school.webp'
import coverShopping from '../assets/art/cover-shopping.webp'
import coverWeather from '../assets/art/cover-weather.webp'
import coverFeelings from '../assets/art/cover-feelings.webp'
import coverCity from '../assets/art/cover-city.webp'
import questNewword from '../assets/art/quest-newword.webp'
import questAnswers from '../assets/art/quest-answers.webp'
import questCorrect from '../assets/art/quest-correct.webp'
import questStreak from '../assets/art/quest-streak.webp'
import questTyped from '../assets/art/quest-typed.webp'
import questListen from '../assets/art/quest-listen.webp'
import questNohint from '../assets/art/quest-nohint.webp'
import questRead from '../assets/art/quest-read.webp'
import questSpeak from '../assets/art/quest-speak.webp'
import stickerHello from '../assets/art/sticker-hello.webp'
import stickerThumbs from '../assets/art/sticker-thumbs.webp'
import stickerThink from '../assets/art/sticker-think.webp'
import stickerLaugh from '../assets/art/sticker-laugh.webp'
import stickerCry from '../assets/art/sticker-cry.webp'
import stickerSleep from '../assets/art/sticker-sleep.webp'
import stickerParty from '../assets/art/sticker-party.webp'
import stickerRead from '../assets/art/sticker-read.webp'
import stickerMusic from '../assets/art/sticker-music.webp'
import stickerCoffee from '../assets/art/sticker-coffee.webp'
import stickerFacepalm from '../assets/art/sticker-facepalm.webp'
import stickerHeart from '../assets/art/sticker-heart.webp'
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

/** Monki grows with the learner: none, scarf, student cap, explorer hat, graduation cap, crown (the titles' ladder 1·3·5·8·15·25). */
const LEVEL_MONKI = [lvl0, lvl1, lvl2, lvl3, lvl4, lvl5]
export const levelMonki = (level: number): string => LEVEL_MONKI[level >= 25 ? 5 : level >= 15 ? 4 : level >= 8 ? 3 : level >= 5 ? 2 : level >= 3 ? 1 : 0]

/** The other three badge emblems: a trophy for what was won, a chat bubble and a microphone for Monki's modes. */
export const EMBLEM = { chat: emChat, mic: emMic, trophy: emTrophy }

/** Small drawn icons for adding one's own text: a file of notes, a book, a video. */
export const ADD_ART = { notes: srcNotes, ebook: srcEbook, video: srcVideo }

/** Monki acting out a part of speech (nothing drawn for 'other'). */
export const POS_ART: Partial<Record<PartOfSpeech, string>> = {
  noun: posNoun, verb: posVerb, adjective: posAdjective, adverb: posAdverb, preposition: posPreposition, pronoun: posPronoun, phrase: posPhrase, conjunction: posConjunction,
}

/** The streak as a flame with a face: asleep at none, then growing with the run (flameTier: 3 days, a week, a month, a hundred days). */
const STREAKS = [streak0, streak1, streak2, streak3, streak4]
export const streakPicture = (streak: number, tier: number): string => STREAKS[streak <= 0 ? 0 : Math.min(tier + 1, 4)]

/** Where an account stands, as Monki: at the door with a key, waiting on the bench, approved, not approved. */
export const ACCOUNT_ART = { out: acctDoor, pending: acctWait, approved: acctOk, rejected: acctNo }

/** One drawing per settings group (by the group's id). */
export const SETTINGS_ART: Record<string, string> = {
  's-account': setAccount,
  's-study': setStudy,
  's-answers': setQuestions,
  's-sound': setSound,
  's-look': setLook,
  's-remind': setBell,
  's-tools': setTools,
  's-data': setData,
}

/** Daily quests by what they count. */
export const QUEST_ART: Record<string, string> = {
  newWords: questNewword,
  answers: questAnswers,
  correct: questCorrect,
  combo: questStreak,
  typedCorrect: questTyped,
  listenCorrect: questListen,
  noHintCorrect: questNohint,
  reading: questRead,
  speaking: questSpeak,
}

/** Covers for word lists; a list gets the one its name suggests (Turkish, English, French or Spanish). */
const COVERS: [RegExp, string][] = [
  [/yemek|yiyecek|içecek|mutfak|food|drink|nourriture|boisson|cuisine|comida|bebida|restaurant|restoran/i, coverFood],
  [/seyahat|gezi|tatil|havaalan|travel|trip|airport|voyage|aéroport|viaje|aeropuerto|vacances|vacaciones/i, coverTravel],
  [/aile|akraba|family|famille|familia|arkadaş|friend/i, coverFamily],
  [/iş|işyeri|ofis|meslek|work|office|job|travail|bureau|trabajo|oficina|business/i, coverWork],
  [/sağlık|hastane|vücut|beden|health|body|doctor|santé|corps|salud|cuerpo|médic/i, coverHealth],
  [/ev|eşya|mobilya|home|house|furniture|maison|meuble|casa|mueble/i, coverHome],
  [/doğa|hayvan|bitki|nature|animal|plant|animaux|naturaleza|animales/i, coverNature],
  [/okul|ders|eğitim|kitap|school|study|class|école|escuela|colegio|clase|libro/i, coverSchool],
  [/alışveriş|giyim|kıyafet|shopping|clothes|clothing|vêtement|ropa|compras|magasin|tienda/i, coverShopping],
  [/hava|mevsim|weather|season|météo|temps|tiempo|clima/i, coverWeather],
  [/duygu|his|hisler|feeling|emotion|sentiment|émotion|sentimiento|emoción/i, coverFeelings],
  [/şehir|kent|ulaşım|trafik|city|town|transport|ville|ciudad|transporte/i, coverCity],
]
export const listCover = (name: string): string | undefined => COVERS.find(([re]) => re.test(name))?.[1]

/** Monki stickers: small poses for moments that deserve a face (a day done, a pause, a thank you). */
export const STICKER = {
  hello: stickerHello,
  thumbs: stickerThumbs,
  think: stickerThink,
  laugh: stickerLaugh,
  cry: stickerCry,
  sleep: stickerSleep,
  party: stickerParty,
  read: stickerRead,
  music: stickerMusic,
  coffee: stickerCoffee,
  facepalm: stickerFacepalm,
  heart: stickerHeart,
}
