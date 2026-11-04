import { DEFAULT_SETTINGS, type Settings } from '../data/db'

export type GroupId = 's-account' | 's-study' | 's-answers' | 's-sound' | 's-look' | 's-remind' | 's-tools' | 's-data' | 's-help'

/**
 * The groups with settings behind their "Gelişmiş ayarlar" switch (rows and cards marked `advanced`), and
 * the settings each group's "Varsayılana dön" puts back. Personal things stay: the study plan, the
 * fitted memory model, holidays, reminders and the chosen voice language aside.
 */
export const ADVANCED_GROUPS: GroupId[] = ['s-study', 's-answers', 's-sound', 's-look', 's-remind', 's-tools', 's-data']
export const RESET_KEYS: Partial<Record<GroupId, (keyof Settings)[]>> = {
  's-study': ['dailyMinutes', 'newWordsPerDay', 'dailyXpGoal', 'sessionMax', 'splitLongDays', 'probes', 'retention', 'frequencyFirst', 'autoRetire', 'dayWeights'],
  's-answers': ['typingShare', 'autoAdvance', 'hintDelaySec', 'accentShortcuts', 'confidence', 'hideVosotros', 'accentStrict', 'exercisePrefs', 'typedBlanks', 'skipLongGloss', 'pretest', 'refreshCard', 'targetDefinitions'],
  's-sound': ['autoPlayAudio', 'soundEffects', 'soundVolume', 'soundLevel', 'haptics', 'speechExercises', 'varyVoices', 'speechRate', 'voices'],
  's-look': ['theme', 'textScale', 'keepAwake', 'showKeyLegend', 'hiddenTabs'],
}
/** What an unset optional setting means (each screen reads it with this fallback). */
const RESET_VALUES: Partial<Settings> = {
  ...DEFAULT_SETTINGS,
  splitLongDays: true,
  probes: true,
  autoAdvance: 0,
  hideVosotros: false,
  exercisePrefs: {},
  typedBlanks: true,
  skipLongGloss: false,
  refreshCard: true,
  soundVolume: 0.8,
  soundLevel: 'all',
  keepAwake: true,
  hiddenTabs: [],
}
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)
/** Whether a group's settings differ from the defaults (then "Varsayılana dön" shows). */
export function changedFromDefault(settings: Settings, id: GroupId): boolean {
  return (RESET_KEYS[id] ?? []).some((k) => !same(settings[k] ?? RESET_VALUES[k], RESET_VALUES[k]))
}
export function resetGroup(settings: Settings, id: GroupId): Settings {
  const next = { ...settings }
  for (const k of RESET_KEYS[id] ?? []) Object.assign(next, { [k]: RESET_VALUES[k] })
  return next
}

/** Which groups show their advanced settings (remembered, and carried with the account: devicePrefs.ts). */
export const MORE_KEY = 'diloloji:settings-more'
export function readMore(known: (id: string) => boolean): GroupId[] {
  try {
    const list: unknown = JSON.parse(localStorage.getItem(MORE_KEY) ?? '[]')
    return Array.isArray(list) ? list.filter((id): id is GroupId => typeof id === 'string' && known(id)) : []
  } catch {
    return []
  }
}
