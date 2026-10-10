import type { TargetLanguage } from '../engine/types'
import type { ReadingText } from './db'

/** A chapter of a public domain audiobook paired with a LibriVox recording. */
export interface AudiobookChapter {
  id: string
  title: string
  author: string
  bookId: string
  bookTitle: string
  chapterIndex: number
  totalChapters: number
  cefr: 'B1' | 'B2'
  language: 'fr' | 'es'
  durationMinutes: number
  audioUrl: string
  text: string
  credit: string
  source: string
  license: string
  textAudioMatch: boolean
}

const LOADERS: Partial<Record<TargetLanguage, () => Promise<{ default: unknown }>>> = {
  fr: () => import('./audiobooks/fr.json'),
  es: () => import('./audiobooks/es.json'),
}

/** Loads verified audiobook chapters for the target language (lazy loaded). */
export async function loadAudiobookChapters(language: TargetLanguage): Promise<AudiobookChapter[]> {
  const load = LOADERS[language]
  return load ? ((await load()).default as AudiobookChapter[]) : []
}

/**
 * The Gutenberg text as it should be read: no footnotes (the recording doesn't read them), no `*   *   *`
 * breaks, no `_italic_` marks, and prose lines joined into sentences (the file is hard-wrapped; the
 * reader treats every line break as a paragraph). Verse (fables: no paragraphs to speak of) keeps its lines.
 */
export function cleanChapterText(text: string): string {
  const paragraphs = text
    .replace(/\r/g, '')
    .replace(/\[Note \d+:[^\]]*\]/g, '')
    .replace(/^[ \t]*\*(?:[ \t]+\*)+[ \t]*$/gm, '')
    .replace(/_/g, '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
  const prose = paragraphs.length >= 5
  return paragraphs.map((p) => (prose ? p.replace(/\s*\n\s*/g, ' ') : p)).join('\n\n')
}

/** Converts an audiobook chapter into a standard ReadingText object for the reading library. */
export function chapterToReadingText(chapter: AudiobookChapter): ReadingText {
  return {
    id: chapter.id,
    language: chapter.language,
    title: `${chapter.bookTitle}: ${chapter.title}`,
    text: cleanChapterText(chapter.text),
    addedAt: new Date().toISOString(),
    history: [],
    audio: chapter.audioUrl,
    credit: chapter.credit,
    source: chapter.source,
    book: {
      id: chapter.bookId,
      title: chapter.bookTitle,
      index: chapter.chapterIndex,
      total: chapter.totalChapters,
    },
  }
}
