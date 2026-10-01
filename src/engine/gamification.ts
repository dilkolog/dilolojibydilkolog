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
}

/** Meeting a new word. */
export const INTRO_XP = 3
/** A run of correct answers breaks after a wrong one or this long a pause. */
export const COMBO_GAP_MS = 10 * 60_000

export interface XpInput {
  exerciseType: ExerciseType
  verdict: Verdict
  hintsUsed: number
  responseMs: number
  mode: ReviewMode
  /** Correct answers in a row before this one. */
  combo: number
}

export function comboMultiplier(combo: number): number {
  if (combo >= 20) return 2
  if (combo >= 10) return 1.5
  if (combo >= 5) return 1.2
  return 1
}

export function xpForAnswer(a: XpInput): number {
  if (a.verdict === 'wrong') return a.mode === 'practice' ? 0 : 1
  const base = BASE_XP[a.exerciseType] * (a.verdict === 'near' ? 0.5 : 1)
  const hintFactor = Math.max(0.25, 1 - 0.25 * a.hintsUsed)
  const meta = EXERCISES[a.exerciseType]
  const fast = meta.input === 'typed' && a.hintsUsed === 0 && a.responseMs < meta.expectedMs * 0.5 ? 2 : 0
  const xp = (base * hintFactor + fast) * comboMultiplier(a.combo) * (a.mode === 'practice' ? 0.3 : 1)
  return Math.max(1, Math.round(xp))
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
  let combo = 0
  let maxCombo = 0
  let last = 0
  let total = 0
  for (const e of sorted) {
    if (e.timestamp.getTime() - last > COMBO_GAP_MS) combo = 0
    last = e.timestamp.getTime()
    const xp = xpForAnswer({ exerciseType: e.exerciseType, verdict: e.verdict, hintsUsed: e.hintsUsed, responseMs: e.responseMs, mode: e.mode, combo })
    total += xp
    add(e.timestamp, xp)
    if (e.mode === 'normal') {
      combo = e.verdict === 'wrong' ? 0 : combo + 1
      maxCombo = Math.max(maxCombo, combo)
    }
  }
  for (const d of introductions) {
    total += INTRO_XP
    add(d, INTRO_XP)
  }
  for (const [day, xp] of questBonus(events, introductions)) {
    total += xp
    byDay.set(day, (byDay.get(day) ?? 0) + xp)
  }
  return { total, today: byDay.get(localDate(now)) ?? 0, maxCombo, byDay }
}

// ---------------------------------------------------------------------------
// Levels
// ---------------------------------------------------------------------------

/**
 * XP needed to go from `level` to `level + 1`. Deliberately steep: level 10 takes weeks of daily
 * practice, level 30 months, level 50 years.
 */
export const xpToNext = (level: number) => Math.round(80 * Math.pow(level, 1.7))

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

export interface GameStats {
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
  { id: 'first-word', icon: '🌱', title: 'İlk adım', description: 'İlk kelimeni öğrenmeye başla', goal: 1, stat: 'wordsIntroduced' },
  { id: 'words-50', icon: '📚', title: 'Koleksiyoncu', description: '50 kelimeyle tanış', goal: 50, stat: 'wordsIntroduced' },
  { id: 'words-250', icon: '🏛️', title: 'Kelime hazinesi', description: '250 kelimeyle tanış', goal: 250, stat: 'wordsIntroduced' },
  { id: 'words-1000', icon: '🌌', title: 'Sözlük', description: '1000 kelimeyle tanış', goal: 1000, stat: 'wordsIntroduced' },
  { id: 'streak-3', icon: '🔥', title: 'Isınma turu', description: '3 gün üst üste çalış', goal: 3, stat: 'longestStreak' },
  { id: 'streak-7', icon: '📅', title: 'Bir hafta', description: '7 gün üst üste çalış', goal: 7, stat: 'longestStreak' },
  { id: 'streak-30', icon: '🗓️', title: 'Bir ay', description: '30 gün üst üste çalış', goal: 30, stat: 'longestStreak' },
  { id: 'streak-100', icon: '💯', title: 'Yüz gün', description: '100 gün üst üste çalış', goal: 100, stat: 'longestStreak' },
  { id: 'answers-100', icon: '✍️', title: 'Isındın', description: '100 soru cevapla', goal: 100, stat: 'totalAnswers' },
  { id: 'answers-1000', icon: '⚡', title: 'Bin soru', description: '1000 soru cevapla', goal: 1000, stat: 'totalAnswers' },
  { id: 'answers-10000', icon: '🏔️', title: 'Zirve', description: '10.000 soru cevapla', goal: 10000, stat: 'totalAnswers' },
  { id: 'mastered-10', icon: '⭐', title: 'Oturdu', description: '10 kelimeyi "Oturdu" seviyesine çıkar', goal: 10, stat: 'mastered' },
  { id: 'mastered-100', icon: '🌟', title: 'Aktif sözcük dağarcığı', description: '100 kelimeyi "Oturdu" seviyesine çıkar', goal: 100, stat: 'mastered' },
  { id: 'perfect-day', icon: '💎', title: 'Kusursuz gün', description: 'Bir günde en az 20 soruyu hiç yanlışsız cevapla', goal: 1, stat: 'perfectDays' },
  { id: 'combo-10', icon: '🎯', title: 'Seri atış', description: '10 doğru üst üste', goal: 10, stat: 'maxCombo' },
  { id: 'combo-30', icon: '🚀', title: 'Durdurulamaz', description: '30 doğru üst üste', goal: 30, stat: 'maxCombo' },
  { id: 'polyglot', icon: '🌍', title: 'Üç dil', description: 'İngilizce, Fransızca ve İspanyolca çalış', goal: 3, stat: 'languagesStudied' },
  { id: 'pictures-10', icon: '🖼️', title: 'Görsel hafıza', description: '10 kelimeye görsel ekle', goal: 10, stat: 'wordsWithPicture' },
  { id: 'voice-10', icon: '🎙️', title: 'Kendi sesin', description: '10 kelimeyi kendi sesinle kaydet', goal: 10, stat: 'wordsWithRecording' },
  { id: 'writer-25', icon: '🖋️', title: 'Yazar', description: '25 doğru cümle kur', goal: 25, stat: 'freeSentencesCorrect' },
  { id: 'level-10', icon: '🥉', title: 'Seviye 10', description: '10. seviyeye ulaş', goal: 10, stat: 'level' },
  { id: 'level-25', icon: '🥈', title: 'Seviye 25', description: '25. seviyeye ulaş', goal: 25, stat: 'level' },
  { id: 'level-50', icon: '🥇', title: 'Seviye 50', description: '50. seviyeye ulaş', goal: 50, stat: 'level' },
]

export interface AchievementState extends Achievement {
  value: number
  unlocked: boolean
}

export function achievements(stats: GameStats): AchievementState[] {
  return ACHIEVEMENTS.map((a) => ({ ...a, value: Math.min(stats[a.stat], a.goal), unlocked: stats[a.stat] >= a.goal }))
}

/** Longest run of consecutive study days (real answers only). */
export function longestStreak(events: readonly Pick<ReviewEvent, 'timestamp' | 'mode'>[]): number {
  const days = [...new Set(events.filter((e) => e.mode === 'normal').map((e) => localDate(e.timestamp)))].sort()
  let best = 0
  let run = 0
  let prev: Date | null = null
  for (const d of days) {
    const date = new Date(`${d}T12:00:00`)
    run = prev && Math.round((date.getTime() - prev.getTime()) / 86_400_000) === 1 ? run + 1 : 1
    best = Math.max(best, run)
    prev = date
  }
  return best
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
