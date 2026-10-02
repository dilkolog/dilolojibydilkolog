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
      .map((l) =>
        l
          .replace(/<[^>]+>/g, '')
          .replace(/\{[^}]*\}/g, '')
          .replace(/\[[^\]]*\]|\([A-ZÀ-Ý\s]+\)/g, '')
          .replace(/[♪♫]/g, '')
          .replace(/^[-–—]\s*/, '')
          .trim(),
      )
      .filter(Boolean)
      .join(' ')
    if (text) cues.push(text)
  }
  const paragraphs: string[] = []
  for (let i = 0; i < cues.length; i += CUES_PER_PARAGRAPH) paragraphs.push(cues.slice(i, i + CUES_PER_PARAGRAPH).join(' '))
  return paragraphs.join('\n\n')
}

/** True when the text looks like a subtitle file rather than prose. */
export const looksLikeSubtitles = (raw: string) => /\d{2}:\d{2}:\d{2}[,.]\d{3}\s*-->/.test(raw)
