import { levenshtein, normalize, stripDiacritics } from './answerCheck'
import type { Cue } from './clips'
import { STOP } from './extract'
import type { TargetLanguage } from './types'

/**
 * Learning from a song (or any captioned video): its subtitle lines, with words taken out of each to be
 * filled in while listening, line by line. Nothing is kept of the lyrics: they come from the video's captions
 * when the learner opens it, and only the learner's own wrong lines can become sentence cards.
 */
export type Difficulty = 'easy' | 'medium' | 'hard'

export const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: 'Kolay: satırda bir kelime', medium: 'Orta: her dördüncü kelime', hard: 'Zor: bütün içerik kelimeleri' }

export interface LyricLine {
  start: number
  end: number
  text: string
}

/** Segments of a line: plain text, or a gap with the word to put in it. */
export type LyricPart = { text: string } | { gap: string }

const TOKEN = /[\p{L}]+(?:['’-][\p{L}]+)*/gu
/** Words shorter than this are never taken out: they are too easy to guess and too hard to hear. */
const MIN_LETTERS = 4
const MAX_LINE = 90

/** The captions as lines: a line repeated right after itself (a chorus the captions list twice) once, the very long ones left out. */
export function lyricLines(cues: readonly Cue[]): LyricLine[] {
  const out: LyricLine[] = []
  for (const c of cues) {
    const text = c.text.replace(/\s+/g, ' ').trim()
    if (!text || text.length > MAX_LINE || out.at(-1)?.text.toLocaleLowerCase() === text.toLocaleLowerCase()) continue
    out.push({ start: c.start, end: c.end, text })
  }
  return out
}

/** The words of a line that can be taken out, with where they stand: after an elision's apostrophe (l'amour → amour) only the word. */
function candidates(text: string, language: TargetLanguage): { word: string; index: number }[] {
  const out: { word: string; index: number }[] = []
  for (const m of text.matchAll(TOKEN)) {
    const cut = Math.max(m[0].lastIndexOf("'"), m[0].lastIndexOf('’'))
    const word = m[0].slice(cut + 1)
    if (word.length >= MIN_LETTERS && !STOP[language].has(word.toLocaleLowerCase())) out.push({ word, index: m.index! + cut + 1 })
  }
  return out
}

/**
 * A line cut into text and gaps. Easy: the longest word of the line; medium: every fourth word that could go
 * (the first, fifth, …); hard: all of them. A line with nothing to take out stays whole.
 */
export function gapsFor(text: string, language: TargetLanguage, level: Difficulty): LyricPart[] {
  const found = candidates(text, language)
  const chosen =
    level === 'hard'
      ? found
      : level === 'medium'
        ? found.filter((_, i) => i % 4 === 0)
        : found.length
          ? [found.reduce((a, b) => (b.word.length > a.word.length ? b : a))]
          : []
  const parts: LyricPart[] = []
  let at = 0
  for (const m of chosen) {
    if (m.index > at) parts.push({ text: text.slice(at, m.index) })
    parts.push({ gap: m.word })
    at = m.index + m.word.length
  }
  if (at < text.length) parts.push({ text: text.slice(at) })
  return parts.length ? parts : [{ text }]
}

export type GapVerdict = 'correct' | 'near' | 'wrong'

/** Right, close (accents or one slip: counts, but is said) or wrong. */
export function checkGap(given: string, answer: string): GapVerdict {
  const g = normalize(given)
  const a = normalize(answer)
  if (!g) return 'wrong'
  if (g === a) return 'correct'
  const bare = stripDiacritics(g)
  if (bare === stripDiacritics(a)) return 'near'
  return a.length >= 6 && levenshtein(bare, stripDiacritics(a)) <= 1 ? 'near' : 'wrong'
}

/** The gaps of all the lines, with how many were filled right (a close one counts). */
export function scoreGaps(verdicts: readonly GapVerdict[]): { total: number; right: number; percent: number } {
  const right = verdicts.filter((v) => v !== 'wrong').length
  return { total: verdicts.length, right, percent: verdicts.length ? Math.round((right / verdicts.length) * 100) : 0 }
}
