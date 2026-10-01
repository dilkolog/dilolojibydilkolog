import type { TargetLanguage } from '../engine/types'
import { SPEECH_LANG } from './labels'

export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window

/** Uses the system's built-in voices, which work offline on most desktops and phones. */
export function speak(text: string, language: TargetLanguage, rate = 0.9) {
  if (!canSpeak()) return
  const synth = window.speechSynthesis
  synth.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = SPEECH_LANG[language]
  u.rate = rate
  const prefix = SPEECH_LANG[language].slice(0, 2)
  const voice = synth.getVoices().find((v) => v.lang.startsWith(prefix) && v.localService) ??
    synth.getVoices().find((v) => v.lang.startsWith(prefix))
  if (voice) u.voice = voice
  synth.speak(u)
}
