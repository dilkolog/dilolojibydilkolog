import type { TargetLanguage } from '../engine/types'
import { db } from '../data/instance'
import { SPEECH_LANG } from './labels'

/** Time really spent speaking (from the first sound to the end of speech) goes to the week's reading, listening and speaking time. */
function spoke(language: TargetLanguage, ms: number) {
  if (ms >= 1500) void db.addStudyTime('speak', language, ms / 1000).catch(() => {})
}

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
  onresult: ((e: { results: RecognitionResultList; resultIndex: number }) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  onspeechstart: (() => void) | null
  onspeechend: (() => void) | null
  onnomatch: (() => void) | null
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
  'language-not-supported': 'Bu dil için konuşma tanıma kapalı. macOS’te Sistem Ayarları → Klavye → Dikte → Diller’den bu dili ekle.',
}

/** The browser listened but never heard anything come back (Safari does this when Dictation or the language is off). */
const NOTHING_HEARD = 'Hiçbir şey duyulmadı. Mikrofonun çalıştığından emin ol; Safari’de Sistem Ayarları → Klavye → Dikte açık ve bu dil ekli olmalı. Olmazsa “Yazarak cevapla”.'
/** How long listening may go without a sound or a result before it is given up. */
const QUIET_MS = 12_000

/** What `listen` returns: the function stops it for good (nothing is delivered); `finish` ends it and delivers what was heard so far. */
export type Listening = (() => void) & { finish: () => void }

/** Starts listening once; returns a function that stops it (and `.finish()` to end it and take what was heard). */
export function listen(language: TargetLanguage, h: ListenHandlers): Listening {
  const C = ctor()
  const noop = Object.assign(() => {}, { finish: () => {} })
  if (!C) {
    h.onError?.('Bu tarayıcı konuşma tanımayı desteklemiyor.')
    return noop
  }
  const rec = new C()
  rec.lang = SPEECH_LANG[language]
  rec.interimResults = true
  rec.maxAlternatives = 5
  rec.continuous = false
  let aborted = false
  let delivered = false
  let heardSomething = false
  let lastInterim = ''
  const quiet = setTimeout(() => {
    if (heardSomething || aborted) return
    aborted = true
    rec.abort()
    h.onError?.(NOTHING_HEARD)
    h.onEnd?.()
  }, QUIET_MS)
  let speechAt = 0
  rec.onspeechstart = () => {
    heardSomething = true
    speechAt ||= Date.now()
  }
  rec.onresult = (e) => {
    heardSomething = true
    const last = e.results[e.results.length - 1]
    const alts = Array.from({ length: last.length }, (_, i) => last[i].transcript.trim()).filter(Boolean)
    if (aborted) return
    if (last.isFinal) {
      delivered = true
      h.onFinal(alts)
    } else {
      lastInterim = alts[0] ?? ''
      h.onInterim?.(lastInterim)
    }
  }
  rec.onnomatch = () => {
    if (!aborted && !delivered) h.onError?.('Ne dediğini anlayamadım, tekrar dene.')
  }
  rec.onerror = (e) => {
    // An abort is ours (the caller left, or the quiet timer ran out and said so itself).
    if (aborted || e.error === 'aborted') return
    h.onError?.(ERRORS[e.error] ?? 'Konuşma tanınamadı.')
  }
  rec.onend = () => {
    clearTimeout(quiet)
    if (speechAt) spoke(language, Date.now() - speechAt)
    // Safari can end without ever marking a result final: what it last heard is the answer.
    if (!delivered && !aborted && lastInterim) {
      delivered = true
      h.onFinal([lastInterim])
    }
    h.onEnd?.()
  }
  rec.start()
  return Object.assign(
    () => {
      aborted = true
      clearTimeout(quiet)
      rec.abort()
    },
    { finish: () => rec.stop() },
  )
}

/**
 * Listening for minutes at a time (a monologue): recognition restarts itself whenever the browser
 * ends it after a pause, until stopped. `onText` gets everything said so far and the part still
 * being recognised.
 */
export function listenContinuous(language: TargetLanguage, onText: (final: string, interim: string) => void, onError?: (message: string) => void): () => void {
  const C = ctor()
  if (!C) {
    onError?.('Bu tarayıcı konuşma tanımayı desteklemiyor.')
    return () => {}
  }
  let stopped = false
  let finalText = ''
  let rec: Recognition | null = null
  const start = () => {
    const r = new C()
    rec = r
    r.lang = SPEECH_LANG[language]
    r.interimResults = true
    r.continuous = true
    let speechAt = 0
    r.onspeechstart = () => {
      speechAt ||= Date.now()
    }
    r.onspeechend = () => {
      if (speechAt) spoke(language, Date.now() - speechAt)
      speechAt = 0
    }
    r.onresult = (e) => {
      let interim = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) finalText = `${finalText} ${t}`.trim()
        else interim += t
      }
      onText(finalText, interim.trim())
    }
    r.onerror = (e) => {
      // No microphone permission or no service: restarting would only loop.
      // A network error restarts at once and fails again at once: also not worth looping on.
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed' || e.error === 'audio-capture' || e.error === 'network') stopped = true
      if (e.error !== 'no-speech' && e.error !== 'aborted') onError?.(ERRORS[e.error] ?? 'Konuşma tanınamadı.')
    }
    r.onend = () => {
      if (speechAt) spoke(language, Date.now() - speechAt)
      speechAt = 0
      if (!stopped) start()
    }
    r.start()
  }
  start()
  return () => {
    stopped = true
    rec?.stop()
  }
}
