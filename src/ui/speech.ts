import { displayForm } from '../engine/exercises'
import type { TargetLanguage, VocabularyEntry } from '../engine/types'
import { db } from '../data/instance'
import { SPEECH_LANG } from './labels'

export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window

/** Voice and speed preferences, set from Settings. */
export const speechPrefs: { rate: number; voices: Partial<Record<TargetLanguage, string>> } = { rate: 0.9, voices: {} }

export function voicesFor(language: TargetLanguage): SpeechSynthesisVoice[] {
  if (!canSpeak()) return []
  const prefix = SPEECH_LANG[language].slice(0, 2)
  return window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith(prefix))
}

/** Uses the system's built-in voices, which work offline on most desktops and phones. */
export function speak(text: string, language: TargetLanguage, rate = speechPrefs.rate) {
  if (!canSpeak()) return
  const synth = window.speechSynthesis
  synth.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = SPEECH_LANG[language]
  u.rate = rate
  const voices = voicesFor(language)
  const chosen = speechPrefs.voices[language]
  const voice = voices.find((v) => v.voiceURI === chosen) ?? voices.find((v) => v.localService) ?? voices[0]
  if (voice) u.voice = voice
  synth.speak(u)
}

let current: HTMLAudioElement | null = null

/** Plays the learner's own recording of the word if there is one, otherwise TTS. */
export async function playWord(entry: VocabularyEntry, text = displayForm(entry)) {
  if (entry.audioId && text === displayForm(entry)) {
    const m = await db.media.get(entry.audioId)
    if (m) {
      current?.pause()
      current = new Audio(URL.createObjectURL(m.blob))
      current.onended = () => URL.revokeObjectURL(current!.src)
      await current.play().catch(() => speak(text, entry.language))
      return
    }
  }
  speak(text, entry.language)
}
