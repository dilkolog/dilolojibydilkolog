/** Subtitle cues per paragraph when a subtitle file is turned into reading text. */
const CUES_PER_PARAGRAPH = 8

/**
 * Turns an SRT or WebVTT subtitle file into plain reading text: cue numbers, timestamps,
 * formatting tags, sound descriptions and speaker dashes are dropped, and cues are grouped into
 * short paragraphs.
 */
export function parseSubtitles(raw: string): string {
  const blocks = raw
    .replace(/^﻿/, '')
    .replace(/\r/g, '')
    .split(/\n\s*\n/)
  const cues: string[] = []
  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trim())
    if (/^(WEBVTT|NOTE|STYLE|REGION)\b/.test(lines[0] ?? '')) continue
    const text = lines
      .filter((l) => l && !/^\d+$/.test(l) && !l.includes('-->'))
      .map(cleanCue)
      .filter(Boolean)
      .join(' ')
    if (text) cues.push(text)
  }
  return cuesToText(cues)
}

/** One subtitle line without markup, sound descriptions, music notes or speaker dashes. */
export function cleanCue(l: string): string {
  return l
    .replace(/<[^>]+>/g, '')
    .replace(/\{[^}]*\}/g, '')
    .replace(/\[[^\]]*\]|\([A-ZÀ-Ý\s]+\)/g, '')
    .replace(/[♪♫]/g, '')
    .replace(/^[-–—]\s*/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function cuesToText(cues: readonly string[]): string {
  const paragraphs: string[] = []
  for (let i = 0; i < cues.length; i += CUES_PER_PARAGRAPH) paragraphs.push(cues.slice(i, i + CUES_PER_PARAGRAPH).join(' '))
  return paragraphs.join('\n\n')
}

const ENTITY: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'", nbsp: ' ' }

/** YouTube's timed-text XML (format 3: <p t d>…</p>, auto captions with <s> words) as reading text. */
export function parseTimedText(xml: string): string {
  const cues = [...xml.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/g)]
    .map((m) => cleanCue(m[1].replace(/<[^>]+>/g, '').replace(/&(#?\w+);/g, (e, n: string) => ENTITY[n] ?? (n.startsWith('#') ? String.fromCodePoint(Number(n.slice(1))) : e))))
    .filter(Boolean)
  return cuesToText(cues)
}

/** The 11-character video id from any YouTube link (watch, youtu.be, shorts, embed) or the id itself. */
export function youtubeId(input: string): string | null {
  const s = input.trim()
  if (/^[\w-]{11}$/.test(s)) return s
  const m = s.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/)
  return m?.[1] ?? null
}

/** True when the text looks like a subtitle file rather than prose. */
export const looksLikeSubtitles = (raw: string) => /\d{2}:\d{2}:\d{2}[,.]\d{3}\s*-->/.test(raw)

/** A subtitle line with when it starts, in seconds. */
export interface Cue {
  start: number
  text: string
}

const toSeconds = (t: string) => {
  const parts = t.replace(',', '.').split(':').map(Number)
  return parts.reduce((s, p) => s * 60 + p, 0)
}

/** SRT or WebVTT cues with their start times (for following the audio sentence by sentence). */
export function parseTimedCues(raw: string): Cue[] {
  const out: Cue[] = []
  for (const block of raw.replace(/^﻿/, '').replace(/\r/g, '').split(/\n\s*\n/)) {
    const lines = block.split('\n').map((l) => l.trim())
    const timing = lines.find((l) => l.includes('-->'))
    const m = timing?.match(/^((?:\d+:)?\d{1,2}:\d{2}[.,]\d{1,3})\s*-->/)
    if (!m) continue
    const text = lines
      .slice(lines.indexOf(timing!) + 1)
      .map(cleanCue)
      .filter(Boolean)
      .join(' ')
    if (text) out.push({ start: toSeconds(m[1]), text })
  }
  return out
}
