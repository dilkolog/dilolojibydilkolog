import type { TargetLanguage } from '../../engine/types'
import { accessFetch } from '../../data/access'
import { mediaBlob } from '../../data/db'
import { db } from '../../data/instance'
import { SPEECH_LANG } from './labels'

/**
 * Natural voices through Google Cloud Text-to-Speech. The site provides them (`server`: /api/speech, the owner's
 * key); a key typed in on this device before that (`key`) still works until the server is known to have one, and is
 * then forgotten (useAppSettings). Every synthesized text is cached on the device (media table, ids starting
 * "tts:"), so a word is paid for once; cached audio is left out of backups. Any failure falls back to system voices.
 */

const API = 'https://texttospeech.googleapis.com/v1'

export const natural: { key: string | null; server: boolean } = { key: null, server: false }
export const naturalEnabled = () => natural.server || !!natural.key

/** FNV-1a: a short, stable id for a text + voice + rate. */
function hash(s: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36)
}

const voiceLists = new Map<TargetLanguage, Promise<string[]>>()

/** Neural voices for a language (falling back to WaveNet), as listed by the API. */
export function naturalVoices(language: TargetLanguage, key = natural.key): Promise<string[]> {
  let p = voiceLists.get(language)
  if (!p) {
    p = (natural.server ? voiceListFromServer(language) : voiceListFromGoogle(language, key))
      .then((list) => {
        try {
          localStorage.setItem(`kelime-koc:voices:${language}`, JSON.stringify(list))
        } catch {
          // Not kept: offline playback then falls back to system voices.
        }
        return list
      })
      // Offline: the list from last time, so audio cached on the device still plays.
      .catch((e) => {
        try {
          const saved = JSON.parse(localStorage.getItem(`kelime-koc:voices:${language}`) ?? 'null') as string[] | null
          if (saved?.length) return saved
        } catch {
          // fall through
        }
        throw e
      })
    p.catch(() => voiceLists.delete(language))
    voiceLists.set(language, p)
  }
  return p
}

/** The voices Google lists for a language, through the site (the owner's key stays on the server). */
async function voiceListFromServer(language: TargetLanguage): Promise<string[]> {
  const res = await accessFetch(`/api/speech?voices=${language}`)
  if (!res.ok) throw new Error(String(res.status))
  return ((await res.json()) as { voices?: string[] }).voices ?? []
}

/** The same list straight from Google with a key typed in on this device (before the site provided the service). */
async function voiceListFromGoogle(language: TargetLanguage, key: string | null): Promise<string[]> {
  const res = await fetch(`${API}/voices?languageCode=${SPEECH_LANG[language]}&key=${encodeURIComponent(key ?? '')}`)
  if (!res.ok) throw new Error(String(res.status))
  const { voices = [] } = (await res.json()) as { voices?: { name: string; languageCodes: string[] }[] }
  const own = voices.filter((v) => v.languageCodes.includes(SPEECH_LANG[language])).map((v) => v.name)
  // Neural2 first; Google is phasing it out on some accounts, so then WaveNet, Chirp 3 HD, Standard.
  return ['Neural2', 'Wavenet', 'Chirp3-HD', 'Standard'].map((kind) => own.filter((n) => n.includes(kind))).find((l) => l.length) ?? []
}

/** The spoken text as an audio blob (MP3), from the site or, with an old own key, from Google. */
async function synthesize(text: string, language: TargetLanguage, voice: string, speakingRate: number): Promise<ArrayBuffer> {
  if (natural.server) {
    const res = await accessFetch('/api/speech?tts=1', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text, language, voice, rate: speakingRate }) })
    if (!res.ok) throw new Error(String(res.status))
    return res.arrayBuffer()
  }
  const res = await fetch(`${API}/text:synthesize?key=${encodeURIComponent(natural.key ?? '')}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ input: { text }, voice: { languageCode: SPEECH_LANG[language], name: voice }, audioConfig: { audioEncoding: 'MP3', speakingRate } }),
  })
  if (!res.ok) throw new Error(String(res.status))
  const { audioContent } = (await res.json()) as { audioContent: string }
  return Uint8Array.from(atob(audioContent), (c) => c.charCodeAt(0)).buffer
}

let lastVaried: { text: string; voice: string } | null = null

async function pickVoice(text: string, language: TargetLanguage, vary: boolean): Promise<string | undefined> {
  const voices = await naturalVoices(language)
  if (!voices.length) return undefined
  if (!vary || voices.length < 2) return voices[0]
  if (lastVaried?.text === text) return lastVaried.voice
  const others = voices.filter((v) => v !== lastVaried?.voice)
  const voice = others[Math.floor(Math.random() * others.length)]
  lastVaried = { text, voice }
  return voice
}

const urls = new Map<string, string>()

/** Object URL of the spoken text, from memory, the device cache or the API (in that order). */
export async function naturalUrl(text: string, language: TargetLanguage, rate: number, vary = false): Promise<string> {
  const voice = await pickVoice(text, language, vary)
  if (!voice) throw new Error('no voice')
  const speakingRate = Math.round(rate * 100) / 100
  const id = `tts:${hash(`${voice}|${speakingRate}|${text}`)}`
  const cached = urls.get(id)
  if (cached) return cached
  const row = await db.media.get(id)
  let blob: Blob
  if (row) blob = mediaBlob(row)
  else {
    const data = await synthesize(text, language, voice, speakingRate)
    blob = new Blob([data], { type: 'audio/mpeg' })
    await db.media.put({ id, kind: 'audio', data, type: 'audio/mpeg', createdAt: new Date() })
    await db.addTtsChars(text.length)
  }
  const url = URL.createObjectURL(blob)
  urls.set(id, url)
  return url
}

/**
 * One audio element for all natural speech. Safari only lets audio start from a click; an
 * element that has played once inside a click may play later too, so it is "unlocked" with a
 * moment of silence on the first tap or key press.
 */
let player: HTMLAudioElement | null = null

function silentWav(): string {
  const buf = new ArrayBuffer(46)
  const v = new DataView(buf)
  const w = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)))
  w(0, 'RIFF')
  v.setUint32(4, 38, true)
  w(8, 'WAVEfmt ')
  v.setUint32(16, 16, true)
  v.setUint16(20, 1, true)
  v.setUint16(22, 1, true)
  v.setUint32(24, 8000, true)
  v.setUint32(28, 16000, true)
  v.setUint16(32, 2, true)
  v.setUint16(34, 16, true)
  w(36, 'data')
  v.setUint32(40, 2, true)
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }))
}

/** Whether a natural-voice clip is sounding right now. */
export function naturalPlaying(): boolean {
  return !!player && !player.paused && !player.ended && !player.src.startsWith('data:')
}

export function naturalPlayer(): HTMLAudioElement {
  if (!player) {
    player = new Audio()
    const unlock = () => {
      if (!player!.src) {
        player!.src = silentWav()
        player!.play().catch(() => {})
      }
      window.removeEventListener('pointerdown', unlock, true)
      window.removeEventListener('keydown', unlock, true)
    }
    window.addEventListener('pointerdown', unlock, true)
    window.addEventListener('keydown', unlock, true)
  }
  return player
}

/** Plays the text in a natural voice; resolves when it has finished. */
export async function playNatural(text: string, language: TargetLanguage, rate: number, vary = false): Promise<void> {
  const p = naturalPlayer()
  const url = await naturalUrl(text, language, rate, vary)
  p.pause()
  p.src = url
  const ended = new Promise<void>((resolve) => {
    p.onended = () => resolve()
    p.onerror = () => resolve()
  })
  await p.play()
  return ended
}

export function stopNatural() {
  player?.pause()
}

/** Fetches and caches ahead of time, so playing later starts instantly. */
export function prefetchNatural(text: string, language: TargetLanguage, rate: number) {
  if (naturalEnabled()) void naturalUrl(text, language, rate).catch(() => {})
}
