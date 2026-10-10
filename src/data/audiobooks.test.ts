import { describe, expect, it } from 'vitest'
import { chapterToReadingText, loadAudiobookChapters } from './audiobooks'

describe('audiobooks', () => {
  it('loads French audiobook chapters with valid fields', async () => {
    const chapters = await loadAudiobookChapters('fr')
    expect(chapters.length).toBeGreaterThan(0)
    for (const c of chapters) {
      expect(c.id).toBeTruthy()
      expect(c.language).toBe('fr')
      expect(c.title).toBeTruthy()
      expect(c.bookTitle).toBeTruthy()
      expect(c.text.length).toBeGreaterThan(100)
      expect(c.audioUrl).toMatch(/^https:\/\/archive\.org\/download\/.*\.mp3$/)
      expect(c.credit).toContain('LibriVox')
      expect(c.license).toContain('Public Domain')
      expect(c.chapterIndex).toBeGreaterThanOrEqual(1)
      expect(c.totalChapters).toBeGreaterThanOrEqual(c.chapterIndex)
    }
  })

  it('loads Spanish audiobook chapters with valid fields', async () => {
    const chapters = await loadAudiobookChapters('es')
    expect(chapters.length).toBeGreaterThan(0)
    for (const c of chapters) {
      expect(c.id).toBeTruthy()
      expect(c.language).toBe('es')
      expect(c.title).toBeTruthy()
      expect(c.bookTitle).toBeTruthy()
      expect(c.text.length).toBeGreaterThan(100)
      expect(c.audioUrl).toMatch(/^https:\/\/archive\.org\/download\/.*\.mp3$/)
      expect(c.credit).toContain('LibriVox')
      expect(c.license).toContain('Public Domain')
    }
  })

  it('returns empty array for unsupported languages', async () => {
    const chapters = await loadAudiobookChapters('en')
    expect(chapters).toEqual([])
  })

  it('converts an audiobook chapter to a valid ReadingText item', async () => {
    const [chapter] = await loadAudiobookChapters('fr')
    expect(chapter).toBeDefined()
    const readingText = chapterToReadingText(chapter)

    expect(readingText.id).toBe(chapter.id)
    expect(readingText.language).toBe('fr')
    expect(readingText.title).toBe(`${chapter.bookTitle}: ${chapter.title}`)
    expect(readingText.text).toBe(chapter.text)
    expect(readingText.audio).toBe(chapter.audioUrl)
    expect(readingText.credit).toBe(chapter.credit)
    expect(readingText.source).toBe(chapter.source)
    expect(readingText.book).toEqual({
      id: chapter.bookId,
      title: chapter.bookTitle,
      index: chapter.chapterIndex,
      total: chapter.totalChapters,
    })
    expect(readingText.history).toEqual([])
  })
})
