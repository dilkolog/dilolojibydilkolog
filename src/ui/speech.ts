import { displayForm } from '../engine/exercises'
import type { TargetLanguage, VocabularyEntry } from '../engine/types'
import { db } from '../data/instance'
import { SPEECH_LANG } from './labels'

export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window

/** Voice and speed preferences, set from Settings. */
export const speechPrefs: { rate: number; voices: Partial<Record<TargetLanguage, string>>; varyVoices: boolean } = {
  rate: 0.9,
  voices: {},
  varyVoices: true,
}

/** macOS novelty voices: fun, but useless for learning pronunciation. */
const NOVELTY = /^(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Good News|Jester|Organ|Superstar|Trinoids|Whisper|Wobble|Zarvox|Junior|Ralph|Fred|Kathy|Grandma|Grandpa|Rocko|Shelley|Sandy|Eddy|Flo|Reed)\b/i

export function voicesFor(language: TargetLanguage): SpeechSynthesisVoice[] {
  if (!canSpeak()) return []
  const prefix = SPEECH_LANG[language].slice(0, 2)
  const quality = (v: SpeechSynthesisVoice) => (/premium/i.test(v.name) ? 0 : /enhanced|geliştirilmiş/i.test(v.name) ? 1 : 2)
  return window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang.toLowerCase().startsWith(prefix) && !NOVELTY.test(v.name))
    .sort((a, b) => quality(a) - quality(b) || a.name.localeCompare(b.name))
}

let varied: { text: string; voiceURI: string } | null = null

/**
 * High-variability input: hearing a word from many speakers makes it recognisable in any voice,
 * not just the one it was learned with. Replaying the same text keeps its voice; the next text
 * gets a different one.
 */
function variedVoice(text: string, voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | undefined {
  if (voices.length < 2) return undefined
  if (varied?.text === text) return voices.find((v) => v.voiceURI === varied!.voiceURI)
  const others = voices.filter((v) => v.voiceURI !== varied?.voiceURI)
  const voice = others[Math.floor(Math.random() * others.length)]
  varied = { text, voiceURI: voice.voiceURI }
  return voice
}

/**
 * Uses the system's built-in voices, which work offline on most desktops and phones. `vary`
 * (listening exercises) picks a different voice each time when the setting is on.
 */
export function speak(text: string, language: TargetLanguage, rate = speechPrefs.rate, vary = false) {
  if (!canSpeak()) return
  const synth = window.speechSynthesis
  synth.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = SPEECH_LANG[language]
  u.rate = rate
  const voices = voicesFor(language)
  const chosen = speechPrefs.voices[language]
  const voice =
    (vary && speechPrefs.varyVoices ? variedVoice(text, voices) : undefined) ??
    voices.find((v) => v.voiceURI === chosen) ??
    voices.find((v) => v.localService) ??
    voices[0]
  if (voice) u.voice = voice
  synth.speak(u)
}

let current: HTMLAudioElement | null = null

/** Plays the learner's own recording of the word if there is one, otherwise TTS. */
export async function playWord(entry: VocabularyEntry, text = displayForm(entry), vary = false) {
  if (entry.audioId && text === displayForm(entry)) {
    const m = await db.media.get(entry.audioId)
    if (m) {
      current?.pause()
      current = new Audio(URL.createObjectURL(m.blob))
      current.onended = () => URL.revokeObjectURL(current!.src)
      await current.play().catch(() => speak(text, entry.language, speechPrefs.rate, vary))
      return
    }
  }
  speak(text, entry.language, speechPrefs.rate, vary)
}

/** Speak and resolve when finished (for playing two clips back to back). */
export function speakAsync(text: string, language: TargetLanguage, rate = speechPrefs.rate): Promise<void> {
  return new Promise((resolve) => {
    if (!canSpeak()) return resolve()
    speak(text, language, rate)
    const synth = window.speechSynthesis
    const t = window.setInterval(() => {
      if (!synth.speaking) {
        window.clearInterval(t)
        resolve()
      }
    }, 150)
  })
}

/** Your recording right after the reference voice, to hear the difference. */
export async function comparePronunciation(entry: VocabularyEntry) {
  if (!entry.audioId) return
  await speakAsync(displayForm(entry), entry.language)
  await new Promise((r) => setTimeout(r, 350))
  const m = await db.media.get(entry.audioId)
  if (!m) return
  current?.pause()
  current = new Audio(URL.createObjectURL(m.blob))
  await current.play().catch(() => {})
}
