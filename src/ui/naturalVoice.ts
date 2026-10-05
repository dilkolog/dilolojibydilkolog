import type { TargetLanguage } from '../engine/types'
import { mediaBlob } from '../data/db'
import { db } from '../data/instance'
import { SPEECH_LANG } from './labels'

/**
 * Natural voices through Google Cloud Text-to-Speech, with the learner's own API key. Every
 * synthesized text is cached on the device (media table, ids starting "tts:"), so a word is
 * paid for once; cached audio is left out of backups. Any failure falls back to system voices.
 */

const API = 'https://texttospeech.googleapis.com/v1'

export const natural: { key: string | null } = { key: null }
export const naturalEnabled = () => !!natural.key

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
    p = fetch(`${API}/voices?languageCode=${SPEECH_LANG[language]}&key=${encodeURIComponent(key ?? '')}`)
      .then((r) => {
        if (!r.ok) throw new Error(String(r.status))
        return r.json() as Promise<{ voices?: { name: string; languageCodes: string[] }[] }>
      })
      .then(({ voices = [] }) => {
        const own = voices.filter((v) => v.languageCodes.includes(SPEECH_LANG[language])).map((v) => v.name)
        // Neural2 first; Google is phasing it out on some accounts, so then WaveNet, Chirp 3 HD, Standard.
        const list = ['Neural2', 'Wavenet', 'Chirp3-HD', 'Standard'].map((kind) => own.filter((n) => n.includes(kind))).find((l) => l.length) ?? []
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

/** What Google's error says, in Turkish, with what to change in the Cloud console. */
export function explainGoogleError(status: number, body: string): string {
  const b = body.toLowerCase()
  if (b.includes('referer') || b.includes('referrer')) return 'Google bu adresten gelen isteği engelledi: anahtarın web sitesi kısıtlamasına bu adresi ekle (ör. https://kelime-koc.vercel.app/*).'
  if (b.includes('billing')) return 'Bu projede faturalandırma açık değil. Google Cloud → Billing\'den projeye bir faturalandırma hesabı bağla (ücretsiz kota için de gerekiyor).'
  if (b.includes('service_disabled') || b.includes('has not been used') || b.includes('is disabled')) return 'Cloud Text-to-Speech API bu projede etkin değil: APIs & Services → Library\'den "Cloud Text-to-Speech API"yi etkinleştir (açıldıktan sonra birkaç dakika sürebilir).'
  if (b.includes('api_key_invalid') || b.includes('api key not valid')) return 'Anahtar geçersiz: kopyalarken eksik ya da fazla karakter kalmış olabilir.'
  if (b.includes('api_key_service_blocked') || b.includes('are blocked')) return 'Anahtarın API kısıtlaması Text-to-Speech\'e izin vermiyor: kısıtlamalara "Cloud Text-to-Speech API"yi ekle.'
  if (status === 429) return 'Google\'ın istek sınırına takıldı; biraz sonra yeniden dene.'
  return `Google bir hata döndürdü (${status}).`
}

async function googleFetch(url: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, init)
  if (!res.ok) throw new Error(explainGoogleError(res.status, await res.text().catch(() => '')))
  return res
}

/**
 * Checks a key end to end: lists the voices, then really synthesises a word (a few characters
 * of quota). Listing alone passes without billing, so it would hide why speech falls back to
 * the system voices. Returns the voice used; throws a readable reason otherwise.
 */
export async function testNaturalKey(key: string, language: TargetLanguage = 'fr'): Promise<string> {
  const list = (await (await googleFetch(`${API}/voices?languageCode=${SPEECH_LANG[language]}&key=${encodeURIComponent(key)}`)).json()) as { voices?: { name: string; languageCodes: string[] }[] }
  const own = (list.voices ?? []).filter((v) => v.languageCodes.includes(SPEECH_LANG[language])).map((v) => v.name)
  const voice = ['Neural2', 'Wavenet', 'Chirp3-HD', 'Standard'].map((kind) => own.find((n) => n.includes(kind))).find(Boolean)
  if (!voice) throw new Error('Bu anahtarla bu dilde doğal ses bulunamadı.')
  await googleFetch(`${API}/text:synthesize?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ input: { text: 'Bonjour' }, voice: { languageCode: SPEECH_LANG[language], name: voice }, audioConfig: { audioEncoding: 'MP3' } }),
  })
  voiceLists.delete(language)
  return voice
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
    const res = await fetch(`${API}/text:synthesize?key=${encodeURIComponent(natural.key ?? '')}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ input: { text }, voice: { languageCode: SPEECH_LANG[language], name: voice }, audioConfig: { audioEncoding: 'MP3', speakingRate } }),
    })
    if (!res.ok) throw new Error(String(res.status))
    const { audioContent } = (await res.json()) as { audioContent: string }
    const bytes = Uint8Array.from(atob(audioContent), (c) => c.charCodeAt(0))
    blob = new Blob([bytes], { type: 'audio/mpeg' })
    await db.media.put({ id, kind: 'audio', data: bytes.buffer, type: 'audio/mpeg', createdAt: new Date() })
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
