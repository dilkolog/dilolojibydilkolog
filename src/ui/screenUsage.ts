/**
 * How often each screen (and game) is opened, counted per day on this device only: never synced,
 * never sent. Settings shows it so tabs that are never used can leave the menu.
 */
const KEY = 'kelime-koc:screen-usage'
/** Days kept; older counts are dropped on the next visit. */
const KEEP_DAYS = 60

/** screen → day (YYYY-MM-DD, local) → opens. */
export type UsageLog = Record<string, Record<string, number>>

const dayOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const daysAgo = (now: Date, n: number) => dayOf(new Date(now.getFullYear(), now.getMonth(), now.getDate() - n))

/** The log with one more open of `screen` today, days older than two months dropped. */
export function addVisit(log: UsageLog, screen: string, now: Date): UsageLog {
  const today = dayOf(now)
  const oldest = daysAgo(now, KEEP_DAYS - 1)
  const next: UsageLog = {}
  for (const [s, days] of Object.entries(log)) {
    const kept = Object.fromEntries(Object.entries(days).filter(([d]) => d >= oldest))
    if (Object.keys(kept).length) next[s] = kept
  }
  next[screen] = { ...next[screen], [today]: (next[screen]?.[today] ?? 0) + 1 }
  return next
}

export interface ScreenUse {
  screen: string
  opens: number
  /** Days with at least one open. */
  days: number
}

/**
 * Opens per screen over the last `days` days, most used first. Parts of a screen are counted as
 * "screen:part" (the verb lab's tabs and modes): left out here, listed by `partsSummary`.
 */
export function usageSummary(log: UsageLog, now: Date, days = 30): ScreenUse[] {
  return summarise(log, now, days).filter((u) => !u.screen.includes(':'))
}

/** The parts of one screen ("verbs:practice:type"), most used first. */
export function partsSummary(log: UsageLog, screen: string, now: Date, days = 30): ScreenUse[] {
  return summarise(log, now, days).filter((u) => u.screen.startsWith(`${screen}:`))
}

function summarise(log: UsageLog, now: Date, days: number): ScreenUse[] {
  const since = daysAgo(now, days - 1)
  return Object.entries(log)
    .map(([screen, byDay]) => {
      const recent = Object.entries(byDay).filter(([d]) => d >= since)
      return { screen, opens: recent.reduce((s, [, n]) => s + n, 0), days: recent.length }
    })
    .filter((u) => u.opens > 0)
    .sort((a, b) => b.opens - a.opens || a.screen.localeCompare(b.screen))
}

/** The first day anything was counted: "never opened" means something only after a while. */
export function trackedSince(log: UsageLog): string | null {
  const all = Object.values(log).flatMap((d) => Object.keys(d))
  return all.length ? all.reduce((a, b) => (a < b ? a : b)) : null
}

export function readUsage(): UsageLog {
  try {
    return (JSON.parse(localStorage.getItem(KEY) ?? '{}') as UsageLog) ?? {}
  } catch {
    return {}
  }
}

export function recordVisit(screen: string, now = new Date()) {
  try {
    localStorage.setItem(KEY, JSON.stringify(addVisit(readUsage(), screen, now)))
  } catch {
    // Storage full or off: not counted.
  }
}

/** Screen names as the learner knows them. */
export const SCREEN_LABEL: Record<string, string> = {
  home: 'Bugün',
  session: 'Çalışma oturumu',
  words: 'Kelimeler',
  word: 'Kelime sayfası',
  dictionary: 'Sözlük',
  translate: 'Çeviri',
  mistakes: 'Hatalar',
  reading: 'Okuma',
  story: 'Hikaye',
  games: 'Oyunlar',
  verbs: 'Fiiller',
  produce: 'Yaz & konuş',
  progress: 'İlerleme',
  vocabtest: 'Kelime testi',
  exam: 'Hatırlama sınavı',
  profile: 'Profil',
  settings: 'Ayarlar',
}

/** The verb lab's tabs, practice modes and learn views, as `recordVisit("verbs:…")` counts them. */
const LAB_PART: Record<string, string> = {
  learn: 'Öğren',
  'learn:compare': 'Öğren · Kıyasla',
  'learn:detail': 'Öğren · Detaylı',
  practice: 'Alıştırma',
  'practice:type': 'Alıştırma · Yaz',
  'practice:choose': 'Alıştırma · Seç',
  'practice:listen': 'Alıştırma · Dinle',
  'practice:speak': 'Alıştırma · Söyle',
  'practice:match': 'Alıştırma · Eşleştir',
  'practice:sentence': 'Alıştırma · Cümlede',
  'practice:tense': 'Alıştırma · Zamanı bul',
  'practice:mood': 'Alıştırma · Kip seç',
  'practice:reverse': 'Alıştırma · Hangi fiil?',
  'practice:timed': 'Alıştırma · Zamana karşı',
  review: 'İlerleme · Tekrar sırası',
  patterns: 'Öğren · Kalıplar',
  mastery: 'İlerleme',
}

/** A counted name as the learner knows it: a screen, or a part of the verb lab. */
export function usageLabel(screen: string): string {
  if (screen.startsWith('verbs:')) return LAB_PART[screen.slice(6)] ?? screen.slice(6)
  return SCREEN_LABEL[screen] ?? screen
}

/** Tabs that may leave the menu: the second and later ones of a place (the first is the place itself). */
export const HIDEABLE_TABS = ['dictionary', 'translate', 'mistakes', 'story', 'verbs', 'produce'] as const
