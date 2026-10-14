import type { TargetLanguage } from '../engine/types'
import { prefs } from './prefs'

/**
 * Pronunciation assessment with Azure Speech (the learner's own key, kept on this device).
 * A recording and the text it should say go to the short-audio REST API, which scores the
 * whole utterance (accuracy, fluency, completeness) and each word. Called straight from the
 * browser: Azure allows it (CORS), so no server sits in between.
 */
export const azure: { key: string | null; region: string | null } = { key: null, region: null }
export const azureEnabled = () => !!azure.key && !!azure.region

/** Spanish follows the learner's variety: without vosotros, Latin American (Mexico). */
const assessLocale = (language: TargetLanguage) => (language === 'fr' ? 'fr-FR' : language === 'es' ? (prefs.hideVosotros ? 'es-MX' : 'es-ES') : 'en-US')

/** Any recording the browser can decode, as 16 kHz mono 16-bit PCM WAV (what the API takes). */
async function toWav16k(blob: Blob): Promise<Blob> {
  const ctx = new AudioContext()
  let decoded: AudioBuffer
  try {
    decoded = await ctx.decodeAudioData(await blob.arrayBuffer())
  } finally {
    void ctx.close()
  }
  const rate = 16000
  const off = new OfflineAudioContext(1, Math.max(1, Math.ceil(decoded.duration * rate)), rate)
  const src = off.createBufferSource()
  src.buffer = decoded
  src.connect(off.destination)
  src.start()
  return wav((await off.startRendering()).getChannelData(0), rate)
}

export function wav(samples: Float32Array, rate: number): Blob {
  const buf = new ArrayBuffer(44 + samples.length * 2)
  const v = new DataView(buf)
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)))
  str(0, 'RIFF')
  v.setUint32(4, 36 + samples.length * 2, true)
  str(8, 'WAVEfmt ')
  v.setUint32(16, 16, true)
  v.setUint16(20, 1, true)
  v.setUint16(22, 1, true)
  v.setUint32(24, rate, true)
  v.setUint32(28, rate * 2, true)
  v.setUint16(32, 2, true)
  v.setUint16(34, 16, true)
  str(36, 'data')
  v.setUint32(40, samples.length * 2, true)
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return new Blob([buf], { type: 'audio/wav' })
}

export interface WordScore {
  word: string
  accuracy: number
  /** None, Mispronunciation, Omission (left out), Insertion (said but not in the text). */
  error: 'None' | 'Mispronunciation' | 'Omission' | 'Insertion' | string
}

export interface PronResult {
  /** Overall, 0–100. */
  score: number
  accuracy: number
  fluency: number
  completeness: number
  /** English only. */
  prosody?: number
  words: WordScore[]
  /** What the service heard. */
  heard: string
}

/** A word scored below this is worth a tip. */
const TIP_BELOW = 80
const TIP_WORDS = 4

/** The words of an attempt worth a tip: left out or scored low (not the extra ones said), the lowest first, each once. */
export function tipWords(result: PronResult): { word: string; accuracy: number; omitted?: boolean }[] {
  const seen = new Set<string>()
  return result.words
    .filter((w) => w.error === 'Omission' || (w.error !== 'Insertion' && w.accuracy < TIP_BELOW))
    .map((w) => ({ word: w.word, accuracy: w.accuracy, ...(w.error === 'Omission' ? { omitted: true } : {}) }))
    .sort((a, b) => Number(!!b.omitted) - Number(!!a.omitted) || a.accuracy - b.accuracy)
    .filter((w) => {
      const k = w.word.toLocaleLowerCase()
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
    .slice(0, TIP_WORDS)
}

/** What Azure's answer means, in Turkish, with what to change. */
export function explainAzureError(status: number, body: string): string {
  if (status === 401 || status === 403) return 'Azure anahtarı ya da bölgesi tutmuyor: Keys and Endpoint sayfasındaki KEY 1 ile Location/Region (ör. francecentral) birebir aynı olmalı.'
  if (status === 429) return 'Azure\'un istek sınırına takıldı (ücretsiz katmanda aylık 5 saat); biraz sonra yeniden dene.'
  if (status === 400) return `Azure isteği okuyamadı${body ? `: ${body.slice(0, 120)}` : ''}.`
  return `Azure bir hata döndürdü (${status}).`
}

const base64Json = (o: unknown) => btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(o))))

async function recognize(audio: Blob, locale: string, headers: Record<string, string> = {}, cfg = azure): Promise<Record<string, unknown>> {
  const res = await fetch(`https://${cfg.region}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=${locale}&format=detailed`, {
    method: 'POST',
    headers: { 'Ocp-Apim-Subscription-Key': cfg.key ?? '', 'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000', Accept: 'application/json', ...headers },
    body: audio,
  })
  if (!res.ok) throw new Error(explainAzureError(res.status, await res.text().catch(() => '')))
  return (await res.json()) as Record<string, unknown>
}

/** Reads the service's detailed answer into scores (exported for tests). */
export function parseAssessment(json: Record<string, unknown>): PronResult {
  const status = json.RecognitionStatus
  if (status !== 'Success') {
    throw new Error(
      status === 'InitialSilenceTimeout' || status === 'BabbleTimeout'
        ? 'Ses duyulmadı; mikrofona biraz daha yakın ve yüksek sesle söyle.'
        : status === 'NoMatch'
          ? 'Söylediğin anlaşılamadı; kelimeyi tek başına, net söylemeyi dene.'
          : 'Azure bu kaydı değerlendiremedi; yeniden dene.',
    )
  }
  const best = (json.NBest as Record<string, unknown>[] | undefined)?.[0] ?? {}
  const pa = (best.PronunciationAssessment as Record<string, number> | undefined) ?? (best as Record<string, number>)
  const words = ((best.Words as Record<string, unknown>[] | undefined) ?? []).map((w) => {
    const wpa = (w.PronunciationAssessment as Record<string, unknown> | undefined) ?? w
    return { word: String(w.Word ?? ''), accuracy: Number(wpa.AccuracyScore ?? 0), error: String(wpa.ErrorType ?? 'None') }
  })
  return {
    score: Math.round(Number(pa.PronScore ?? pa.AccuracyScore ?? 0)),
    accuracy: Math.round(Number(pa.AccuracyScore ?? 0)),
    fluency: Math.round(Number(pa.FluencyScore ?? 0)),
    completeness: Math.round(Number(pa.CompletenessScore ?? 0)),
    ...(pa.ProsodyScore !== undefined ? { prosody: Math.round(Number(pa.ProsodyScore)) } : {}),
    words,
    heard: String(best.Display ?? json.DisplayText ?? ''),
  }
}

/** Scores a recording of `text` (at most ~30 s). */
export async function assessPronunciation(recording: Blob, text: string, language: TargetLanguage): Promise<PronResult> {
  const audio = await toWav16k(recording)
  const header = base64Json({
    ReferenceText: text,
    GradingSystem: 'HundredMark',
    Granularity: 'Phoneme',
    Dimension: 'Comprehensive',
    EnableMiscue: 'True',
    // Prosody (stress, intonation, rhythm) is scored for English only.
    ...(language === 'en' ? { EnableProsodyAssessment: 'True' } : {}),
  })
  return parseAssessment(await recognize(audio, assessLocale(language), { 'Pronunciation-Assessment': header }))
}

/** Checks a key and region with half a second of silence (a few milliseconds of quota). */
export async function testAzureKey(key: string, region: string): Promise<void> {
  if (!/^[a-z0-9]+$/.test(region)) throw new Error('Bölge adı küçük harf ve boşluksuz olmalı, ör. francecentral.')
  await recognize(wav(new Float32Array(8000), 16000), 'fr-FR', {}, { key, region })
}
