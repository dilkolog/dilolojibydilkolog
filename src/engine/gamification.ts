import type { ActivityStats } from './badgeStats'
import { EXERCISES } from './exercises'
import { localDate } from './progress'
import { questBonus } from './quests'
import type { ExerciseType, ReviewEvent, ReviewMode, Verdict } from './types'

/**
 * XP rewards effort that builds memory, not volume: harder retrieval earns more, hints and
 * guessing earn less, and a wrong answer still earns a point so trying is never punished.
 */
export const BASE_XP: Record<ExerciseType, number> = {
  mc_meaning: 5,
  picture_choice: 5,
  listen_choose: 6,
  mc_context: 6,
  discriminate: 7,
  collocation_choice: 8,
  typed_translation: 10,
  listen_type: 10,
  cloze_typed: 12,
  word_form: 12,
  free_sentence: 20,
  dictation: 14,
  speak_word: 10,
  article_choice: 3,
  conjugation: 8,
  back_translation: 20,
  idiom_complete: 7,
  family_choice: 6,
  aspect_choice: 6,
}

/** Meeting a new word. */
export const INTRO_XP = 3
/** A run of correct answers breaks after a wrong one or this long a pause. */
export const COMBO_GAP_MS = 10 * 60_000

/** Recall chance below which a right answer saved a word about to be forgotten (the daily plan's FORGOTTEN_R). */
export const RESCUE_R = 0.7
/** Flat XP for such an answer: what spaced repetition is for. */
export const RESCUE_XP = 3
/** A word answered wrong this often (over at least `HARD_MIN_REVIEWS` answers) is a hard one: right answers weigh more. */
export const HARD_WRONG_SHARE = 0.4
export const HARD_MIN_REVIEWS = 4
export const HARD_FACTOR = 1.2
/** Answers in one day after which each earns less: a long grind builds memory slower than a rested short session. */
export const DAY_SOFT_CAP = 150
export const DAY_HARD_CAP = 300
/** XP for the first real answers of a day after a few days away. */
export const COMEBACK_GAP_DAYS = 3
export const COMEBACK_MIN_ANSWERS = 5
export const COMEBACK_XP = 10

export interface XpInput {
  exerciseType: ExerciseType
  verdict: Verdict
  hintsUsed: number
  responseMs: number
  mode: ReviewMode
  /** The run before this one (see `nextCombo`). */
  combo: number
  /** The word's recall chance before the answer; 0 or missing for a first meeting. */
  retrievability?: number
  /** The word's earlier answers and how many of them were wrong (the word's own counters). */
  wordReviews?: number
  wordWrong?: number
  /** Answers already given today, of any kind. */
  answersToday?: number
}

export function comboMultiplier(combo: number): number {
  if (combo >= 20) return 2
  if (combo >= 10) return 1.5
  if (combo >= 5) return 1.2
  return 1
}

/**
 * The run after an answer. Right keeps it going; a wrong answer halves it instead of ending it (a long run is
 * not lost to one slip), and a wrong answer on a short run still ends it. Introductions do not count.
 */
export const nextCombo = (combo: number, verdict: Verdict): number => (verdict === 'wrong' ? Math.floor(combo / 2) : combo + 1)

/** Whether a word has been missed often enough to count as a hard one. */
export const isHardWord = (reviews = 0, wrong = 0): boolean => reviews >= HARD_MIN_REVIEWS && wrong / reviews >= HARD_WRONG_SHARE

/** What a day's answers past the soft and hard caps are worth: half, then a quarter. */
export const fatigueFactor = (answersToday = 0): number => (answersToday >= DAY_HARD_CAP ? 0.25 : answersToday >= DAY_SOFT_CAP ? 0.5 : 1)

export function xpForAnswer(a: XpInput): number {
  if (a.verdict === 'wrong') return a.mode === 'practice' ? 0 : 1
  const base = BASE_XP[a.exerciseType] * (a.verdict === 'near' ? 0.5 : 1)
  const hintFactor = Math.max(0.25, 1 - 0.25 * a.hintsUsed)
  const meta = EXERCISES[a.exerciseType]
  const fast = meta.input === 'typed' && a.hintsUsed === 0 && a.responseMs < meta.expectedMs * 0.5 ? 2 : 0
  const hard = isHardWord(a.wordReviews, a.wordWrong) ? HARD_FACTOR : 1
  const xp = (base * hintFactor * hard + fast) * comboMultiplier(a.combo) * (a.mode === 'practice' ? 0.3 : 1) * fatigueFactor(a.answersToday)
  const rescued = a.mode === 'normal' && a.verdict === 'correct' && a.hintsUsed === 0 && !!a.retrievability && a.retrievability > 0 && a.retrievability < RESCUE_R
  return Math.max(1, Math.round(xp)) + (rescued ? RESCUE_XP : 0)
}

/** Whether `today` picks the studying up again after `COMEBACK_GAP_DAYS` or more away from `previousDay` (the last day before it with real answers). */
export function isComeback(previousDay: string | null | undefined, today: string): boolean {
  if (!previousDay) return false
  const gap = Math.round((new Date(`${today}T12:00:00`).getTime() - new Date(`${previousDay}T12:00:00`).getTime()) / 86_400_000)
  return gap >= COMEBACK_GAP_DAYS
}

/** The days a study streak was picked up again after `COMEBACK_GAP_DAYS` or more away, with the bonus: real answers only, a few of them. */
export function comebackBonus(events: readonly ReviewEvent[]): Map<string, number> {
  const perDay = new Map<string, number>()
  for (const e of events) if (e.mode === 'normal') perDay.set(localDate(e.timestamp), (perDay.get(localDate(e.timestamp)) ?? 0) + 1)
  const days = [...perDay.keys()].sort()
  const bonus = new Map<string, number>()
  for (let i = 1; i < days.length; i++) {
    if (isComeback(days[i - 1], days[i]) && perDay.get(days[i])! >= COMEBACK_MIN_ANSWERS) bonus.set(days[i], COMEBACK_XP)
  }
  return bonus
}

export interface XpSummary {
  total: number
  today: number
  /** Longest run of correct answers ever. */
  maxCombo: number
  byDay: Map<string, number>
}

/** Recomputes XP from the answer history, so it can never drift from what actually happened. */
export function computeXp(events: readonly ReviewEvent[], introductions: readonly Date[], now: Date): XpSummary {
  const sorted = [...events].sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
  const byDay = new Map<string, number>()
  const add = (d: Date, xp: number) => byDay.set(localDate(d), (byDay.get(localDate(d)) ?? 0) + xp)
  // `combo` is the run that multiplies XP (a slip halves it); `run` is the strict streak the badges count.
  let combo = 0
  let run = 0
  let maxCombo = 0
  let last = 0
  let total = 0
  const answersOn = new Map<string, number>()
  const words = new Map<string, { reviews: number; wrong: number }>()
  for (const e of sorted) {
    if (e.timestamp.getTime() - last > COMBO_GAP_MS) combo = run = 0
    last = e.timestamp.getTime()
    const day = localDate(e.timestamp)
    const word = words.get(e.entryId) ?? { reviews: 0, wrong: 0 }
    const xp = xpForAnswer({
      exerciseType: e.exerciseType,
      verdict: e.verdict,
      hintsUsed: e.hintsUsed,
      responseMs: e.responseMs,
      mode: e.mode,
      combo,
      retrievability: e.retrievabilityBefore,
      wordReviews: word.reviews,
      wordWrong: word.wrong,
      answersToday: answersOn.get(day) ?? 0,
    })
    answersOn.set(day, (answersOn.get(day) ?? 0) + 1)
    total += xp
    add(e.timestamp, xp)
    if (e.mode === 'normal') {
      combo = nextCombo(combo, e.verdict)
      run = e.verdict === 'wrong' ? 0 : run + 1
      maxCombo = Math.max(maxCombo, run)
      words.set(e.entryId, { reviews: word.reviews + 1, wrong: word.wrong + (e.verdict === 'wrong' ? 1 : 0) })
    }
  }
  for (const d of introductions) {
    total += INTRO_XP
    add(d, INTRO_XP)
  }
  for (const bonus of [questBonus(events, introductions), comebackBonus(events)]) {
    for (const [day, xp] of bonus) {
      total += xp
      byDay.set(day, (byDay.get(day) ?? 0) + xp)
    }
  }
  return { total, today: byDay.get(localDate(now)) ?? 0, maxCombo, byDay }
}

// ---------------------------------------------------------------------------
// Levels
// ---------------------------------------------------------------------------

/**
 * XP needed to go from `level` to `level + 1`. Still rising, but gently: at about 50 XP a day level 5 comes
 * in under a month, level 11 in about seven months, level 20 in under three years. (The exponent was 1.7
 * until 2026-10: levels are derived from the answer history, so a gentler curve raises everyone's level.)
 */
export const xpToNext = (level: number) => Math.round(80 * Math.pow(level, 1.45))

const TITLES: [number, string][] = [
  [50, 'Efsane'],
  [40, 'Bilge'],
  [30, 'Poliglot'],
  [25, 'Dil Cambazı'],
  [20, 'Kelime Ustası'],
  [15, 'Söz Avcısı'],
  [11, 'Gezgin'],
  [8, 'Çırak'],
  [5, 'Kaşif'],
  [3, 'Meraklı'],
  [1, 'Çaylak'],
]

export const levelTitle = (level: number) => TITLES.find(([min]) => level >= min)![1]

export interface LevelInfo {
  level: number
  title: string
  /** XP earned inside the current level. */
  into: number
  /** XP the current level takes in total. */
  needed: number
  progress: number
}

export function levelFromXp(xp: number): LevelInfo {
  let level = 1
  let rest = Math.max(0, xp)
  while (rest >= xpToNext(level)) {
    rest -= xpToNext(level)
    level++
  }
  const needed = xpToNext(level)
  return { level, title: levelTitle(level), into: rest, needed, progress: rest / needed }
}

// ---------------------------------------------------------------------------
// Achievements
// ---------------------------------------------------------------------------

export interface GameStats extends ActivityStats {
  wordsIntroduced: number
  mastered: number
  totalAnswers: number
  longestStreak: number
  /** Days with at least 20 real answers, all correct. */
  perfectDays: number
  maxCombo: number
  languagesStudied: number
  wordsWithPicture: number
  wordsWithRecording: number
  freeSentencesCorrect: number
  level: number
  bossesDefeated: number
  /** Weekly challenges completed, all weeks. */
  challengesDone: number
  /** Weeks with all three challenges done. */
  perfectWeeks: number
  /** Words the learner added or imported themselves (not the bundled samples). */
  wordsAdded: number
  /** Words with a note or a memory aid of the learner's own. */
  wordsWithNotes: number
  /** Words at "Sağlam" or beyond. */
  wordsStrong: number
  /** Words marked hard, and of those the ones that have since become strong. */
  hardMarked: number
  hardConquered: number
  /** Reading texts opened and read, and journal entries written. */
  textsRead: number
  journalEntries: number
  /** Mistakes put right in the Mistake Bank. */
  mistakesFixed: number
  /** Verb forms practised in the verb lab, and those known to the full (60 points). */
  formsPracticed: number
  formsMastered: number
  /** Verbs known to the full in all their core tenses. */
  verbsMastered: number
  /** Days the verb lab's daily round was finished. */
  tourDays: number
  totalXp: number
  /** Lessons learned in the grammar guide (their check passed). */
  guideLessonsLearned: number
  /** Whole level certificates earned in the guide. */
  guideCertsEarned: number
  /** Placement test completed to find starting level. */
  guidePlacementDone: number
}

/** Nothing done yet: the starting point for tests and for a fresh install. */
export const emptyStats: GameStats = {
  daysStudied: 0, maxDayAnswers: 0, nightDays: 0, earlyDays: 0, weekendDays: 0, comebacks: 0, listeningCorrect: 0, typedCorrect: 0, speakCorrect: 0,
  articleCorrect: 0, conjugationCorrect: 0, fastCorrect: 0,
  wordsIntroduced: 0, mastered: 0, totalAnswers: 0, longestStreak: 0, perfectDays: 0, maxCombo: 0, languagesStudied: 0, wordsWithPicture: 0,
  wordsWithRecording: 0, freeSentencesCorrect: 0, level: 1, bossesDefeated: 0, challengesDone: 0, perfectWeeks: 0,
  wordsAdded: 0, wordsWithNotes: 0, wordsStrong: 0, hardMarked: 0, hardConquered: 0, textsRead: 0, journalEntries: 0, mistakesFixed: 0, formsPracticed: 0, formsMastered: 0, verbsMastered: 0, tourDays: 0, totalXp: 0, rescued: 0,
  guideLessonsLearned: 0, guideCertsEarned: 0, guidePlacementDone: 0,
}

export interface Achievement {
  id: string
  icon: string
  title: string
  description: string
  goal: number
  stat: keyof GameStats
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-word', icon: '🌱', title: 'İlk adım', description: 'İlk kelimenle tanış', goal: 1, stat: 'wordsIntroduced' },
  { id: 'words-50', icon: '📚', title: 'Koleksiyoncu', description: '50 kelimeyle tanış', goal: 50, stat: 'wordsIntroduced' },
  { id: 'words-250', icon: '🏛️', title: 'Kelime hazinesi', description: '250 kelimeyle tanış', goal: 250, stat: 'wordsIntroduced' },
  { id: 'words-1000', icon: '🌌', title: 'Sözlük', description: '1000 kelimeyle tanış', goal: 1000, stat: 'wordsIntroduced' },
  { id: 'streak-3', icon: '🔥', title: 'Isınma turu', description: '3 gün üst üste çalış', goal: 3, stat: 'longestStreak' },
  { id: 'streak-7', icon: '📅', title: 'Bir hafta', description: '7 gün üst üste çalış', goal: 7, stat: 'longestStreak' },
  { id: 'streak-30', icon: '🗓️', title: 'Bir ay', description: '30 gün üst üste çalış', goal: 30, stat: 'longestStreak' },
  { id: 'streak-100', icon: '💯', title: 'Yüz gün', description: '100 gün üst üste çalış', goal: 100, stat: 'longestStreak' },
  { id: 'answers-100', icon: '✍️', title: 'Yüz soru', description: '100 soru cevapla', goal: 100, stat: 'totalAnswers' },
  { id: 'answers-1000', icon: '⚡', title: 'Bin soru', description: '1000 soru cevapla', goal: 1000, stat: 'totalAnswers' },
  { id: 'answers-10000', icon: '🏔️', title: 'Zirve', description: '10.000 soru cevapla', goal: 10000, stat: 'totalAnswers' },
  { id: 'mastered-10', icon: '⭐', title: 'Çiçek demeti', description: '10 kelimeyi "Oturdu" seviyesine çıkar', goal: 10, stat: 'mastered' },
  { id: 'mastered-100', icon: '🌟', title: 'Bahçıvan', description: '100 kelimeyi "Oturdu" seviyesine çıkar', goal: 100, stat: 'mastered' },
  { id: 'perfect-day', icon: '💎', title: 'Kusursuz gün', description: 'Bir günde en az 20 soruyu yanlışsız cevapla', goal: 1, stat: 'perfectDays' },
  { id: 'combo-10', icon: '🎯', title: 'Seri atış', description: 'Üst üste 10 doğru cevap ver', goal: 10, stat: 'maxCombo' },
  { id: 'combo-30', icon: '🚀', title: 'Durdurulamaz', description: 'Üst üste 30 doğru cevap ver', goal: 30, stat: 'maxCombo' },
  { id: 'polyglot', icon: '🌍', title: 'Üç dil', description: 'İngilizce, Fransızca ve İspanyolca çalış', goal: 3, stat: 'languagesStudied' },
  { id: 'pictures-10', icon: '🖼️', title: 'Görsel hafıza', description: '10 kelimeye görsel ekle', goal: 10, stat: 'wordsWithPicture' },
  { id: 'voice-10', icon: '🎙️', title: 'Kendi sesin', description: '10 kelimeyi kendi sesinle kaydet', goal: 10, stat: 'wordsWithRecording' },
  { id: 'writer-25', icon: '🖋️', title: 'Yazar', description: '25 doğru cümle kur', goal: 25, stat: 'freeSentencesCorrect' },
  { id: 'boss-1', icon: '⚔️', title: 'İlk boss', description: '1 boss kelimeyi yen', goal: 1, stat: 'bossesDefeated' },
  { id: 'boss-10', icon: '🐉', title: 'Ejderha avcısı', description: '10 boss kelimeyi yen', goal: 10, stat: 'bossesDefeated' },
  { id: 'weekly-1', icon: '🗓️', title: 'Haftanın işi', description: '1 haftalık meydan okumayı tamamla', goal: 1, stat: 'challengesDone' },
  { id: 'weekly-perfect', icon: '🏆', title: 'Kusursuz hafta', description: 'Bir haftada 3 meydan okumanın 3\'ünü de tamamla', goal: 1, stat: 'perfectWeeks' },
  { id: 'level-10', icon: '🥉', title: 'Seviye 10', description: '10. seviyeye ulaş', goal: 10, stat: 'level' },
  { id: 'level-25', icon: '🥈', title: 'Seviye 25', description: '25. seviyeye ulaş', goal: 25, stat: 'level' },
  { id: 'level-50', icon: '🥇', title: 'Seviye 50', description: '50. seviyeye ulaş', goal: 50, stat: 'level' },
  // ── More: words ──
  { id: 'words-100', icon: '📖', title: 'Yüzlük', description: '100 kelimeyle tanış', goal: 100, stat: 'wordsIntroduced' },
  { id: 'words-500', icon: '🏛️', title: 'Kelime kütüphanesi', description: '500 kelimeyle tanış', goal: 500, stat: 'wordsIntroduced' },
  { id: 'mastered-1', icon: '🌸', title: 'İlk çiçek', description: 'İlk kelimeni "Oturdu" seviyesine çıkar', goal: 1, stat: 'mastered' },
  { id: 'mastered-500', icon: '🌟', title: 'Çiçek bahçesi', description: '500 kelimeyi "Oturdu" seviyesine çıkar', goal: 500, stat: 'mastered' },
  { id: 'strong-25', icon: '🌟', title: 'Sağlam kökler', description: '25 kelimeyi "Sağlam" seviyesine çıkar', goal: 25, stat: 'wordsStrong' },
  { id: 'strong-100', icon: '⭐', title: 'Derin kökler', description: '100 kelimeyi "Sağlam" seviyesine çıkar', goal: 100, stat: 'wordsStrong' },
  { id: 'added-25', icon: '📚', title: 'Kütüphaneci', description: 'Kendi 25 kelimeni ekle', goal: 25, stat: 'wordsAdded' },
  { id: 'added-100', icon: '🏛️', title: 'Baş kütüphaneci', description: 'Kendi 100 kelimeni ekle', goal: 100, stat: 'wordsAdded' },
  { id: 'notes-10', icon: '🧠', title: 'Hafıza ustası', description: '10 kelimeye kendi notunu ekle', goal: 10, stat: 'wordsWithNotes' },
  { id: 'hard-5', icon: '⚡', title: 'Zorluk avcısı', description: '5 kelimeyi zor diye işaretle', goal: 5, stat: 'hardMarked' },
  { id: 'hard-conquered-5', icon: '⚔️', title: 'Zor fatihi', description: 'Zor işaretlediğin 5 kelimeyi "Sağlam" seviyesine çıkar', goal: 5, stat: 'hardConquered' },
  // ── More: showing up ──
  { id: 'streak-14', icon: '🔥', title: 'İki hafta', description: '14 gün üst üste çalış', goal: 14, stat: 'longestStreak' },
  { id: 'streak-60', icon: '🗓️', title: 'İki ay', description: '60 gün üst üste çalış', goal: 60, stat: 'longestStreak' },
  { id: 'streak-365', icon: '🏆', title: 'Bir yıl', description: '365 gün üst üste çalış', goal: 365, stat: 'longestStreak' },
  { id: 'days-30', icon: '📅', title: 'Düzenli', description: '30 farklı günde çalış', goal: 30, stat: 'daysStudied' },
  { id: 'days-100', icon: '🗓️', title: 'Adanmış', description: '100 farklı günde çalış', goal: 100, stat: 'daysStudied' },
  { id: 'days-365', icon: '🏆', title: 'Sadık', description: '365 farklı günde çalış', goal: 365, stat: 'daysStudied' },
  { id: 'comeback-1', icon: '🌱', title: 'Geri dönüş', description: '1 haftadan uzun aradan sonra yeniden çalış', goal: 1, stat: 'comebacks' },
  { id: 'night-5', icon: '🦉', title: 'Gece kuşu', description: '5 gün gece 22.00–05.00 arasında çalış', goal: 5, stat: 'nightDays' },
  { id: 'early-5', icon: '🌅', title: 'Erken kuş', description: '5 gün sabah 05.00–08.00 arasında çalış', goal: 5, stat: 'earlyDays' },
  { id: 'weekend-10', icon: '🏠', title: 'Hafta sonu savaşçısı', description: '10 hafta sonu gününde çalış', goal: 10, stat: 'weekendDays' },
  { id: 'marathon-100', icon: '🏎️', title: 'Maraton', description: 'Bir günde 100 soru cevapla', goal: 100, stat: 'maxDayAnswers' },
  { id: 'marathon-300', icon: '⚡', title: 'Ultra maraton', description: 'Bir günde 300 soru cevapla', goal: 300, stat: 'maxDayAnswers' },
  // ── More: skills ──
  { id: 'answers-500', icon: '✍️', title: 'Beş yüz soru', description: '500 soru cevapla', goal: 500, stat: 'totalAnswers' },
  { id: 'answers-5000', icon: '🏔️', title: 'Beş bin soru', description: '5000 soru cevapla', goal: 5000, stat: 'totalAnswers' },
  { id: 'combo-5', icon: '🎯', title: 'Isınma atışı', description: 'Üst üste 5 doğru cevap ver', goal: 5, stat: 'maxCombo' },
  { id: 'combo-50', icon: '🚀', title: 'Kesintisiz', description: 'Üst üste 50 doğru cevap ver', goal: 50, stat: 'maxCombo' },
  { id: 'perfect-5', icon: '💎', title: 'Kusursuz beşli', description: '5 ayrı günü yanlışsız tamamla', goal: 5, stat: 'perfectDays' },
  { id: 'listen-50', icon: '👂', title: 'İnce kulak', description: '50 dinleme sorusunu doğru cevapla', goal: 50, stat: 'listeningCorrect' },
  { id: 'listen-250', icon: '🎧', title: 'Dinleme ustası', description: '250 dinleme sorusunu doğru cevapla', goal: 250, stat: 'listeningCorrect' },
  { id: 'typed-100', icon: '⌨️', title: 'Hızlı parmaklar', description: '100 yazılı soruyu doğru cevapla', goal: 100, stat: 'typedCorrect' },
  { id: 'speak-25', icon: '🎙️', title: 'Konuşkan', description: '25 konuşma sorusunu doğru cevapla', goal: 25, stat: 'speakCorrect' },
  { id: 'article-50', icon: '🏷️', title: 'Artikel ustası', description: '50 artikel sorusunu doğru cevapla', goal: 50, stat: 'articleCorrect' },
  { id: 'conj-50', icon: '🕰️', title: 'Fiil ustası', description: '50 fiil çekimini doğru yaz', goal: 50, stat: 'conjugationCorrect' },
  { id: 'forms-25', icon: '🌿', title: 'Fiil bahçıvanı', description: 'Fiil laboratuvarında 25 çekim çalış', goal: 25, stat: 'formsPracticed' },
  { id: 'forms-10-master', icon: '🌻', title: 'Çekim ustası', description: 'Fiil laboratuvarında 10 çekimde tam ustalığa ulaş', goal: 10, stat: 'formsMastered' },
  { id: 'forms-50-master', icon: '🌳', title: 'Baş çekim ustası', description: 'Fiil laboratuvarında 50 çekimde tam ustalığa ulaş', goal: 50, stat: 'formsMastered' },
  // Learning itself: words saved from forgetting, whole verbs known, the daily verb round kept up.
  { id: 'rescue-10', icon: '🧠', title: 'Kurtarıcı', description: 'Unutmak üzere olduğun 10 kelimeyi doğru hatırla', goal: 10, stat: 'rescued' },
  { id: 'rescue-50', icon: '🧠', title: 'Hafıza bekçisi', description: 'Unutmak üzere olduğun 50 kelimeyi doğru hatırla', goal: 50, stat: 'rescued' },
  { id: 'rescue-250', icon: '🧠', title: 'Çelik hafıza', description: 'Unutmak üzere olduğun 250 kelimeyi doğru hatırla', goal: 250, stat: 'rescued' },
  { id: 'verb-whole-1', icon: '🏔', title: 'Tam fiil', description: '1 fiilin 4 temel zamanında tam ustalığa ulaş', goal: 1, stat: 'verbsMastered' },
  { id: 'verb-whole-10', icon: '🏔', title: 'Fiil zirvesi', description: '10 fiilin 4 temel zamanında tam ustalığa ulaş', goal: 10, stat: 'verbsMastered' },
  { id: 'tour-7', icon: '🕰', title: 'Tur alışkanlığı', description: 'Günlük fiil turunu 7 gün tamamla', goal: 7, stat: 'tourDays' },
  { id: 'tour-30', icon: '🕰', title: 'Fiil ritmi', description: 'Günlük fiil turunu 30 gün tamamla', goal: 30, stat: 'tourDays' },
  { id: 'fast-100', icon: '🏎️', title: 'Şimşek', description: '100 soruyu 2 saniyeden kısa sürede doğru cevapla', goal: 100, stat: 'fastCorrect' },
  { id: 'fixed-10', icon: '🧩', title: 'Hatadan öğrenen', description: 'Hata bankasından 10 hatayı düzelt', goal: 10, stat: 'mistakesFixed' },
  { id: 'fixed-50', icon: '🧠', title: 'Hata avcısı', description: 'Hata bankasından 50 hatayı düzelt', goal: 50, stat: 'mistakesFixed' },
  // ── More: reading, writing, XP, levels ──
  { id: 'read-5', icon: '📖', title: 'Okur', description: '5 metin oku', goal: 5, stat: 'textsRead' },
  { id: 'read-25', icon: '📚', title: 'Kitap kurdu', description: '25 metin oku', goal: 25, stat: 'textsRead' },
  { id: 'journal-7', icon: '🖋️', title: 'Günlükçü', description: '7 günlük yaz', goal: 7, stat: 'journalEntries' },
  { id: 'journal-30', icon: '✍️', title: 'Günlük ustası', description: '30 günlük yaz', goal: 30, stat: 'journalEntries' },
  { id: 'xp-1000', icon: '🌟', title: 'Bin XP', description: '1000 XP kazan', goal: 1000, stat: 'totalXp' },
  { id: 'xp-10000', icon: '⭐', title: 'On bin XP', description: '10.000 XP kazan', goal: 10000, stat: 'totalXp' },
  { id: 'level-5', icon: '🥉', title: 'Seviye 5', description: '5. seviyeye ulaş', goal: 5, stat: 'level' },
  { id: 'level-40', icon: '🥇', title: 'Seviye 40', description: '40. seviyeye ulaş', goal: 40, stat: 'level' },
  // ── Rehber: dersler, sertifikalar, seviye testi ──
  { id: 'guide-lesson-1', icon: '🌱', title: 'İlk ders', description: 'Rehberde 1 ders öğren', goal: 1, stat: 'guideLessonsLearned' },
  { id: 'guide-lessons-5', icon: '📖', title: 'Çırak öğrenci', description: 'Rehberde 5 ders öğren', goal: 5, stat: 'guideLessonsLearned' },
  { id: 'guide-lessons-10', icon: '🎓', title: 'On ders', description: 'Rehberde 10 ders öğren', goal: 10, stat: 'guideLessonsLearned' },
  { id: 'guide-lessons-25', icon: '🏛️', title: 'Dil bilgini', description: 'Rehberde 25 ders öğren', goal: 25, stat: 'guideLessonsLearned' },
  { id: 'guide-lessons-50', icon: '🌟', title: 'Rehber ustası', description: 'Rehberde 50 ders öğren', goal: 50, stat: 'guideLessonsLearned' },
  { id: 'guide-lessons-100', icon: '👑', title: 'Gramer piri', description: 'Rehberde 100 ders öğren', goal: 100, stat: 'guideLessonsLearned' },
  { id: 'guide-cert-1', icon: '📜', title: 'İlk sertifika', description: 'Bir seviyenin tüm derslerini tamamlayıp ilk sertifikanı al', goal: 1, stat: 'guideCertsEarned' },
  { id: 'guide-cert-2', icon: '🥈', title: 'İki seviye', description: '2 seviye sertifikası kazan', goal: 2, stat: 'guideCertsEarned' },
  { id: 'guide-cert-3', icon: '🎖️', title: 'Üç seviye', description: '3 seviye sertifikası kazan', goal: 3, stat: 'guideCertsEarned' },
  { id: 'guide-cert-4', icon: '🏆', title: 'Gramer ustası', description: '4 seviye sertifikası kazan (A1–B2)', goal: 4, stat: 'guideCertsEarned' },
  { id: 'guide-placement-1', icon: '🧭', title: 'Seviyeni keşfettin', description: 'Rehber seviye testini tamamla', goal: 1, stat: 'guidePlacementDone' },
]


export type BadgeCategory = 'words' | 'habit' | 'skills' | 'writing' | 'level'

export const BADGE_CATEGORIES: { id: BadgeCategory; name: string }[] = [
  { id: 'words', name: 'Kelimeler' },
  { id: 'habit', name: 'Düzen' },
  { id: 'skills', name: 'Beceriler' },
  { id: 'writing', name: 'Okuma ve yazma' },
  { id: 'level', name: 'Seviye ve XP' },
]

const CATEGORY_OF: Record<keyof GameStats, BadgeCategory> = {
  wordsIntroduced: 'words', mastered: 'words', wordsStrong: 'words', wordsAdded: 'words', wordsWithNotes: 'words', wordsWithPicture: 'words', wordsWithRecording: 'words', hardMarked: 'words', hardConquered: 'words',
  longestStreak: 'habit', daysStudied: 'habit', comebacks: 'habit', nightDays: 'habit', earlyDays: 'habit', weekendDays: 'habit', maxDayAnswers: 'habit', perfectDays: 'habit', challengesDone: 'habit', perfectWeeks: 'habit',
  totalAnswers: 'skills', maxCombo: 'skills', listeningCorrect: 'skills', typedCorrect: 'skills', speakCorrect: 'skills', articleCorrect: 'skills', conjugationCorrect: 'skills', formsPracticed: 'skills', formsMastered: 'skills', verbsMastered: 'skills', tourDays: 'habit', rescued: 'skills', fastCorrect: 'skills', mistakesFixed: 'skills', bossesDefeated: 'skills', languagesStudied: 'skills', guideLessonsLearned: 'skills',
  textsRead: 'writing', journalEntries: 'writing', freeSentencesCorrect: 'writing',
  level: 'level', totalXp: 'level', guideCertsEarned: 'level', guidePlacementDone: 'level',
}

/** Where a badge is shelved in the profile: by what it counts. */
export const badgeCategory = (a: Pick<Achievement, 'stat'>): BadgeCategory => CATEGORY_OF[a.stat]

export type MedalTier = 'bronze' | 'silver' | 'gold' | 'special'

/**
 * A badge's medal: its place among the badges of the same kind, in thirds (the first third bronze,
 * the middle silver, the top gold); a badge with no siblings is a special one-off.
 */
export function medalTier(a: Pick<Achievement, 'id' | 'stat'>): MedalTier {
  const family = ACHIEVEMENTS.filter((x) => x.stat === a.stat).sort((x, y) => x.goal - y.goal)
  if (family.length === 1) return 'special'
  const place = family.findIndex((x) => x.id === a.id) / (family.length - 1)
  return place <= 0.34 ? 'bronze' : place <= 0.67 ? 'silver' : 'gold'
}

export interface AchievementState extends Achievement {
  value: number
  unlocked: boolean
  /** When it was earned (ISO); '' when earned before dates were kept. */
  unlockedAt?: string
}

/** Badges earned, by id, with when ('' = earned before dates were kept). Kept, backed up and synced. */
export type BadgeLog = Record<string, string>

/**
 * Every badge with its progress. One earned stays earned (`log`), even if its number later falls
 * (a picture removed, a word deleted): a badge is a moment that happened, not a live reading.
 */
export function achievements(stats: GameStats, log: BadgeLog = {}): AchievementState[] {
  return ACHIEVEMENTS.map((a) => {
    const earned = a.id in log
    return { ...a, value: earned ? a.goal : Math.min(stats[a.stat], a.goal), unlocked: earned || stats[a.stat] >= a.goal, ...(earned ? { unlockedAt: log[a.id] } : {}) }
  })
}

/**
 * Badges counting the same thing (50, 100, 250… words) as one badge with steps: the shelf shows
 * one card per series, its highest step earned, and the stars of the steps.
 */
export interface BadgeSeries {
  stat: keyof GameStats
  /** The steps, smallest goal first. */
  steps: AchievementState[]
  /** Steps earned. */
  earned: number
  /** The highest step earned. */
  top?: AchievementState
  /** The next step to earn; none when the series is complete. */
  next?: AchievementState
}

export function badgeSeries(all: readonly AchievementState[]): BadgeSeries[] {
  const by = new Map<keyof GameStats, AchievementState[]>()
  for (const a of all) by.set(a.stat, [...(by.get(a.stat) ?? []), a])
  return [...by.entries()].map(([stat, list]) => {
    const steps = [...list].sort((a, b) => a.goal - b.goal)
    const won = steps.filter((s) => s.unlocked)
    return { stat, steps, earned: won.length, top: won.at(-1), next: steps.find((s) => !s.unlocked) }
  })
}

/**
 * The badge step closest to being earned, once it is at least half way: one concrete thing to go
 * for, shown at the end of a session (not on Today, which stays about the day's work).
 */
export function closestStep(all: readonly AchievementState[], atLeast = 0.5): AchievementState | undefined {
  return badgeSeries(all)
    .map((s) => s.next)
    .filter((n): n is AchievementState => !!n && n.value / n.goal >= atLeast && n.value < n.goal)
    .sort((a, b) => b.value / b.goal - a.value / a.goal || a.goal - a.value - (b.goal - b.value))[0]
}

/** Two logs together: a badge earned on either, at the earlier date (a known date over an unknown one). */
export function mergeBadgeLogs(a: BadgeLog = {}, b: BadgeLog = {}): BadgeLog {
  const out: BadgeLog = { ...a }
  for (const [id, at] of Object.entries(b)) {
    const mine = out[id]
    out[id] = mine === undefined ? at : !mine ? at : !at ? mine : mine < at ? mine : at
  }
  return out
}

/** Longest run of consecutive study days from sorted unique study day strings. */
export function longestStreakFromDays(sortedDays: readonly string[]): number {
  let best = 0
  let run = 0
  let prev: Date | null = null
  for (const d of sortedDays) {
    const date = new Date(`${d}T12:00:00`)
    run = prev && Math.round((date.getTime() - prev.getTime()) / 86_400_000) === 1 ? run + 1 : 1
    best = Math.max(best, run)
    prev = date
  }
  return best
}

/** Longest run of consecutive study days (real answers only). */
export function longestStreak(events: readonly Pick<ReviewEvent, 'timestamp' | 'mode'>[]): number {
  const days = [...new Set(events.filter((e) => e.mode === 'normal').map((e) => localDate(e.timestamp)))].sort()
  return longestStreakFromDays(days)
}

export function perfectDays(events: readonly ReviewEvent[]): number {
  const days = new Map<string, { n: number; wrong: number }>()
  for (const e of events) {
    if (e.mode !== 'normal') continue
    const d = days.get(localDate(e.timestamp)) ?? { n: 0, wrong: 0 }
    d.n++
    if (e.verdict === 'wrong') d.wrong++
    days.set(localDate(e.timestamp), d)
  }
  return [...days.values()].filter((d) => d.n >= 20 && d.wrong === 0).length
}

export interface Milestone {
  id: string
  emoji: string
  title: string
  text: string
  /** A level reached: the badge strikes from the old number to the new one. */
  level?: { from: number; to: number }
}

const WORD_STEPS = [10, 50, 100, 250, 500, 1000, 2000]
const MASTERED_STEPS = [1, 10, 50, 100, 250, 500]

/**
 * A threshold crossed during a session, worth one full-screen moment: a new level, the first (or
 * Nth) word that settled, the Nth word met. The biggest one wins when several are crossed at once.
 */
export function crossedMilestone(before: { level: number; stats: GameStats }, after: { level: number; stats: GameStats }): Milestone | null {
  if (after.level > before.level) {
    const title = levelTitle(after.level)
    const newTitle = title !== levelTitle(before.level)
    return {
      id: `level-${after.level}`,
      emoji: '⭐',
      title: `Seviye ${after.level}!`,
      text: newTitle ? `Yeni unvanın: ${title}. Çalıştıkça XP birikiyor; bir basamak daha çıktın.` : 'Çalıştıkça XP birikiyor; bir seviye daha atladın.',
      level: { from: before.level, to: after.level },
    }
  }
  const settled = MASTERED_STEPS.filter((n) => before.stats.mastered < n && after.stats.mastered >= n).at(-1)
  if (settled)
    return settled === 1
      ? { id: 'mastered-1', emoji: '🌸', title: 'İlk kelimen çiçek açtı!', text: 'Bir kelime “Oturdu” aşamasına ulaştı: artık onu cümlede kullanabiliyorsun.' }
      : { id: `mastered-${settled}`, emoji: '🌸', title: `${settled} kelime oturdu!`, text: `${settled} kelimeyi artık cümlede kullanabiliyorsun. Bahçen çiçeklendi.` }
  const met = WORD_STEPS.filter((n) => before.stats.wordsIntroduced < n && after.stats.wordsIntroduced >= n).at(-1)
  if (met) return { id: `words-${met}`, emoji: '🌱', title: `${met}. kelimen!`, text: `${met} kelimeyle tanıştın. Her biri bahçende bir tohum.` }
  return null
}
