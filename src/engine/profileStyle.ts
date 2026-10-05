import { levelTitle, type GameStats } from './gamification'

/** What a profile style may ask of the learner to be unlocked. */
export interface Unlockables {
  level: number
  stats: GameStats
  /** Ids of the badges earned. */
  badges: ReadonlySet<string>
}

export interface StyleOption {
  id: string
  name: string
  /** What opens it (shown while locked) and the test for it; no `unlock` = free from the start. */
  unlock?: { text: string; test: (u: Unlockables) => boolean }
}

export const isUnlocked = (o: StyleOption, u: Unlockables): boolean => !o.unlock || o.unlock.test(u)

/** The profile card's banner. `color` follows the learner's own colour. */
export const BANNERS: StyleOption[] = [
  { id: 'color', name: 'Kendi rengin' },
  { id: 'sunrise', name: 'Gün doğumu' },
  { id: 'ocean', name: 'Okyanus' },
  { id: 'forest', name: 'Orman' },
  { id: 'dusk', name: 'Alacakaranlık' },
  { id: 'night', name: 'Gece', unlock: { text: '7 gün üst üste çalış', test: (u) => u.stats.longestStreak >= 7 } },
  { id: 'garden', name: 'Bahçe', unlock: { text: '10 kelimeyi oturt', test: (u) => u.stats.mastered >= 10 } },
  { id: 'gold', name: 'Altın', unlock: { text: '10. seviyeye ulaş', test: (u) => u.level >= 10 } },
  { id: 'galaxy', name: 'Galaksi', unlock: { text: '25. seviyeye ulaş', test: (u) => u.level >= 25 } },
]

/** The ring around the avatar. `ring` shows the way to the next level. */
export const FRAMES: StyleOption[] = [
  { id: 'ring', name: 'Seviye halkası' },
  { id: 'plain', name: 'Düz' },
  { id: 'dots', name: 'Noktalı' },
  { id: 'leaf', name: 'Yaprak', unlock: { text: '5 kelimeyi oturt', test: (u) => u.stats.mastered >= 5 } },
  { id: 'flame', name: 'Alev', unlock: { text: '7 gün üst üste çalış', test: (u) => u.stats.longestStreak >= 7 } },
  { id: 'crown', name: 'Taç', unlock: { text: '15. seviyeye ulaş', test: (u) => u.level >= 15 } },
  { id: 'rainbow', name: 'Gökkuşağı', unlock: { text: '30. seviyeye ulaş', test: (u) => u.level >= 30 } },
]

export const DEFAULT_BANNER = 'color'
export const DEFAULT_FRAME = 'ring'

export const bannerOf = (id: string | undefined): string => (BANNERS.some((b) => b.id === id) ? id! : DEFAULT_BANNER)
export const frameOf = (id: string | undefined): string => (FRAMES.some((f) => f.id === id) ? id! : DEFAULT_FRAME)

/** Titles beyond the level ones, each earned by a badge. */
const BADGE_TITLES: { id: string; badge: string; name: string }[] = [
  { id: 'dragon', badge: 'boss-10', name: 'Ejderha Avcısı' },
  { id: 'perfect', badge: 'weekly-perfect', name: 'Kusursuz' },
  { id: 'writer', badge: 'writer-25', name: 'Yazar' },
  { id: 'hundred', badge: 'streak-100', name: 'Yüz Günlük' },
  { id: 'gardener', badge: 'mastered-100', name: 'Bahçıvan' },
  { id: 'polyglot3', badge: 'polyglot', name: 'Üç Dilli' },
]

export interface TitleOption {
  /** 'auto' follows the level; level titles are 'level:N'; the rest are badge titles. */
  id: string
  name: string
}

/** Every title the learner may show: the level ones reached so far (newest first) and the badge ones earned. */
export function availableTitles(u: Unlockables): TitleOption[] {
  const levels = [1, 3, 5, 8, 11, 15, 20, 25, 30, 40, 50].filter((l) => u.level >= l).reverse()
  return [
    { id: 'auto', name: `${levelTitle(u.level)} (seviyene göre)` },
    ...levels.slice(1).map((l) => ({ id: `level:${l}`, name: levelTitle(l) })),
    ...BADGE_TITLES.filter((t) => u.badges.has(t.badge)).map((t) => ({ id: t.id, name: t.name })),
  ]
}

/** The title to show for a choice; an unknown or no-longer-available choice falls back to the level's. */
export function titleName(choice: string | undefined, u: Unlockables): string {
  return availableTitles(u).find((t) => t.id === choice && t.id !== 'auto')?.name ?? levelTitle(u.level)
}

export const PIN_LIMIT = 3
export const INTEREST_LIMIT = 6
export const INTERESTS = ['Seyahat', 'Yemek', 'İş', 'Müzik', 'Film ve dizi', 'Spor', 'Teknoloji', 'Doğa', 'Sanat', 'Alışveriş', 'Aile', 'Sağlık', 'Kitaplar', 'Oyunlar']
export const GOAL_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const

/** Badges to show on the card: the chosen ones that are still earned, at most PIN_LIMIT, in the order chosen. */
export function pinnedBadges(pinned: readonly string[] | undefined, earned: ReadonlySet<string>): string[] {
  return (pinned ?? []).filter((id) => earned.has(id)).slice(0, PIN_LIMIT)
}

/** A choice toggled in a list with a ceiling: removed when there, added when there is room, otherwise unchanged. */
export function toggleLimited(list: readonly string[] | undefined, id: string, limit: number): string[] {
  const now = list ?? []
  if (now.includes(id)) return now.filter((x) => x !== id)
  return now.length < limit ? [...now, id] : [...now]
}

/** Whole days from `now` to an ISO date (negative once past); null for no or a bad date. */
export function daysUntil(date: string | undefined, now: Date): number | null {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null
  const target = new Date(`${date}T12:00:00`)
  if (Number.isNaN(target.getTime())) return null
  const today = new Date(now)
  today.setHours(12, 0, 0, 0)
  return Math.round((target.getTime() - today.getTime()) / 86_400_000)
}
