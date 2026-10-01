import type { TargetLanguage } from '../engine/types'
import { SPEECH_LANG } from './labels'

/* Minimal typing for the Web Speech API's recognition part (not in TypeScript's DOM lib). */
interface RecognitionResultList {
  length: number
  [i: number]: { isFinal: boolean; length: number; [j: number]: { transcript: string } }
}
interface Recognition {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  continuous: boolean
  onresult: ((e: { results: RecognitionResultList }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}
type RecognitionCtor = new () => Recognition

function ctor(): RecognitionCtor | undefined {
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition
}

export const canListen = () => typeof window !== 'undefined' && !!ctor()

export interface ListenHandlers {
  /** Live, not yet final text (for showing what is being heard). */
  onInterim?: (text: string) => void
  /** Final result: all alternatives, most likely first. */
  onFinal: (alternatives: string[]) => void
  onError?: (message: string) => void
  onEnd?: () => void
}

const ERRORS: Record<string, string> = {
  'not-allowed': 'Mikrofon izni verilmedi. Tarayıcının site ayarlarından mikrofona izin ver.',
  'service-not-allowed': 'Konuşma tanıma bu tarayıcıda kapalı. macOS’te Siri/Dikte açık olmalı.',
  'no-speech': 'Ses algılanmadı, tekrar dene.',
  network: 'Konuşma tanıma için internet bağlantısı gerekiyor.',
  'audio-capture': 'Mikrofon bulunamadı.',
}

/** Starts listening once; returns a function that stops it. */
export function listen(language: TargetLanguage, h: ListenHandlers): () => void {
  const C = ctor()
  if (!C) {
    h.onError?.('Bu tarayıcı konuşma tanımayı desteklemiyor.')
    return () => {}
  }
  const rec = new C()
  rec.lang = SPEECH_LANG[language]
  rec.interimResults = true
  rec.maxAlternatives = 5
  rec.continuous = false
  rec.onresult = (e) => {
    const last = e.results[e.results.length - 1]
    const alts = Array.from({ length: last.length }, (_, i) => last[i].transcript.trim()).filter(Boolean)
    if (last.isFinal) h.onFinal(alts)
    else h.onInterim?.(alts[0] ?? '')
  }
  rec.onerror = (e) => h.onError?.(ERRORS[e.error] ?? 'Konuşma tanınamadı.')
  rec.onend = () => h.onEnd?.()
  rec.start()
  return () => rec.abort()
}
