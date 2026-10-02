import type { Settings } from '../data/db'
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
  confidence: true,
  accentShortcuts: true,
}

export function applySettings(s: Settings) {
  prefs.autoPlay = s.autoPlayAudio
  prefs.hintDelayMs = s.hintDelaySec * 1000
  prefs.accentStrict = s.accentStrict
  prefs.soundEffects = s.soundEffects
  prefs.showKeyLegend = s.showKeyLegend
  prefs.pretest = s.pretest
  prefs.confidence = s.confidence
  prefs.accentShortcuts = s.accentShortcuts
  aiConfig.model = s.aiModel
  speechPrefs.varyVoices = s.varyVoices
  configureScheduler(s.retention, s.fsrsWeights, { dayWeights: s.dayWeights, vacation: s.vacation })
  speechPrefs.rate = s.speechRate
  speechPrefs.voices = s.voices
  const root = document.documentElement
  if (s.theme === 'system') delete root.dataset.theme
  else root.dataset.theme = s.theme
  // Phone status bar follows the chosen theme, not only the system one.
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
    const dark = m.media.includes('dark')
    m.content = s.theme === 'system' ? (dark ? '#0f172a' : '#f1f5f9') : s.theme === 'dark' ? '#0f172a' : '#f1f5f9'
  })
}
