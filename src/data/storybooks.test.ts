import { describe, expect, it } from 'vitest'
import { loadStorybooks, storyCredit } from './storybooks'

describe('loadStorybooks', () => {
  it('loads English storybooks with valid structure and Turkish translations', async () => {
    const stories = await loadStorybooks('en')
    expect(stories.length).toBeGreaterThanOrEqual(7)

    for (const story of stories) {
      expect(story.language).toBe('en')
      expect(story.id).toMatch(/^gsb-en-\d{4}$/)
      expect(story.title).toBeTruthy()
      expect(story.pages.length).toBeGreaterThan(0)
      expect(story.images.length).toBe(story.pages.length)
      expect(story.turkish?.length).toBe(story.pages.length)
      expect(story.audio).toMatch(/^https:\/\/.+\.mp3$/)
      expect(storyCredit(story)).toContain('Global Storybooks')
    }
  })

  it('loads French and Spanish storybooks as before', async () => {
    const fr = await loadStorybooks('fr')
    expect(fr.length).toBeGreaterThan(0)
    expect(fr[0].language).toBe('fr')

    const es = await loadStorybooks('es')
    expect(es.length).toBeGreaterThan(0)
    expect(es[0].language).toBe('es')
  })
})
