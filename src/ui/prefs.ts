import type { Settings } from '../data/db'
import { engineFlags } from '../engine/exercisePrefs'
import type { TypingShare } from '../engine/session'
import type { ExerciseType } from '../engine/types'
import { configureScheduler } from '../data/instance'
import { aiConfig } from '../ai/usage'
import { speechPrefs } from './speech'

/** Runtime preferences read by session components; updated whenever settings change. */
export const prefs = {
  autoPlay: true,
  hintDelayMs: 6000,
  accentStrict: false,
  soundEffects: true,
  showKeyLegend: true,
  pretest: true,
  refreshCard: true,
  confidence: true,
  accentShortcuts: true,
  autoRetire: true,
  targetDefinitions: false,
  typingShare: 'balanced' as TypingShare,
  haptics: true,
  autoAdvance: 0,
  keepAwake: true,
  hideVosotros: false,
  /** Question types switched off (Settings → Sorular), for the places that build questions outside the plan. */
  exerciseOff: [] as ExerciseType[],
}

export function applySettings(s: Settings) {
  prefs.autoPlay = s.autoPlayAudio
  prefs.autoRetire = s.autoRetire
  prefs.typingShare = s.typingShare ?? 'balanced'
  prefs.targetDefinitions = s.targetDefinitions
  prefs.hintDelayMs = s.hintDelaySec * 1000
  prefs.accentStrict = s.accentStrict
  prefs.soundEffects = s.soundEffects
  prefs.showKeyLegend = s.showKeyLegend
  prefs.pretest = s.pretest
  prefs.refreshCard = s.refreshCard !== false
  prefs.confidence = s.confidence
  prefs.accentShortcuts = s.accentShortcuts
  aiConfig.model = s.aiModel
  speechPrefs.varyVoices = s.varyVoices
  configureScheduler(s.retention, s.fsrsWeights, { dayWeights: s.dayWeights, vacation: s.vacation })
  speechPrefs.rate = s.speechRate
  speechPrefs.voices = s.voices
  const root = document.documentElement
  // Text size: the root font size scales every rem in the app.
  root.style.fontSize = { normal: '', large: '112.5%', xlarge: '125%' }[s.textScale ?? 'normal']
  prefs.haptics = s.haptics ?? true
  prefs.autoAdvance = s.autoAdvance ?? 0
  prefs.keepAwake = s.keepAwake ?? true
  prefs.hideVosotros = s.hideVosotros ?? false
  prefs.exerciseOff = engineFlags(s.exercisePrefs, s.typedBlanks).off ?? []
  // Calm is the dark theme plus a flag that turns its colours down (see index.css).
  if (s.theme === 'system') delete root.dataset.theme
  else root.dataset.theme = s.theme === 'calm' ? 'dark' : s.theme === 'contrast' ? 'light' : s.theme
  if (s.theme === 'calm') root.dataset.calm = ''
  else delete root.dataset.calm
  // High contrast is the light theme plus a flag that makes text, borders and the focus ring as strong as they go.
  if (s.theme === 'contrast') root.dataset.contrast = ''
  else delete root.dataset.contrast
  // The page itself takes the language's tint (light theme), not only the app's content.
  root.dataset.lang = s.activeLanguage
  // Read by the inline script in index.html, so the first paint already has the right theme.
  try {
    localStorage.setItem('kelime-koc:theme', s.theme)
  } catch {
    // The first paint is light then; settings correct it a moment later.
  }
  // Phone status bar follows the chosen theme, not only the system one.
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
    const dark = m.media.includes('dark')
    m.content = s.theme === 'system' ? (dark ? '#0f172a' : '#f1f5f9') : s.theme === 'calm' ? '#15171c' : s.theme === 'dark' ? '#0f172a' : s.theme === 'contrast' ? '#ffffff' : '#f1f5f9'
  })
}
