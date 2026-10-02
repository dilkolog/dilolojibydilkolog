import type { Settings } from '../data/db'
import { configureScheduler } from '../data/instance'
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
  speechPrefs.varyVoices = s.varyVoices
  configureScheduler(s.retention, s.fsrsWeights)
  speechPrefs.rate = s.speechRate
  speechPrefs.voices = s.voices
  const root = document.documentElement
  if (s.theme === 'system') delete root.dataset.theme
  else root.dataset.theme = s.theme
}
