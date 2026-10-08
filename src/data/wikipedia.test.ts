import { describe, expect, it } from 'vitest'
import { cleanArticle, defaultWikiSite, wikiApiUrl, wikiPageUrl } from './wikipedia'

describe('Wikipedia articles', () => {
  it('keeps the reading and drops headings and back matter', () => {
    const text = 'Le café est une boisson.\n\nIl vient d’Éthiopie.\n\n== Histoire ==\nOn le boit depuis longtemps.\n\n== Références ==\nUne source.'
    expect(cleanArticle(text)).toBe('Le café est une boisson.\n\nIl vient d’Éthiopie.\n\nOn le boit depuis longtemps.')
  })

  it('cuts at a paragraph near the length limit', () => {
    const text = ['a'.repeat(40), 'b'.repeat(40), 'c'.repeat(40)].join('\n\n')
    expect(cleanArticle(text, 90)).toBe(`${'a'.repeat(40)}\n\n${'b'.repeat(40)}`)
  })

  it('builds appropriate API and page URLs for Wikipedia and Vikidia', () => {
    expect(wikiApiUrl('simple')).toBe('https://simple.wikipedia.org/w/api.php')
    expect(wikiApiUrl('vikidia-fr')).toBe('https://fr.vikidia.org/w/api.php')
    expect(wikiApiUrl('vikidia-es')).toBe('https://es.vikidia.org/w/api.php')
    expect(wikiPageUrl('vikidia-fr', 'Le Chat')).toBe('https://fr.vikidia.org/wiki/Le_Chat')
    expect(wikiPageUrl('simple', 'Dog')).toBe('https://simple.wikipedia.org/wiki/Dog')
  })

  it('selects easy default site per language', () => {
    expect(defaultWikiSite('en', true)).toBe('simple')
    expect(defaultWikiSite('en', false)).toBe('en')
    expect(defaultWikiSite('fr', true)).toBe('vikidia-fr')
    expect(defaultWikiSite('fr', false)).toBe('fr')
    expect(defaultWikiSite('es', true)).toBe('vikidia-es')
    expect(defaultWikiSite('es', false)).toBe('es')
  })
})
