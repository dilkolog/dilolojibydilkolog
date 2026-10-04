import { describe, expect, it } from 'vitest'
import { cleanArticle } from './wikipedia'

describe('Wikipedia articles', () => {
  it('keeps the reading and drops headings and back matter', () => {
    const text = 'Le café est une boisson.\n\nIl vient d’Éthiopie.\n\n== Histoire ==\nOn le boit depuis longtemps.\n\n== Références ==\nUne source.'
    expect(cleanArticle(text)).toBe('Le café est une boisson.\n\nIl vient d’Éthiopie.\n\nOn le boit depuis longtemps.')
  })

  it('cuts at a paragraph near the length limit', () => {
    const text = ['a'.repeat(40), 'b'.repeat(40), 'c'.repeat(40)].join('\n\n')
    expect(cleanArticle(text, 90)).toBe(`${'a'.repeat(40)}\n\n${'b'.repeat(40)}`)
  })
})
