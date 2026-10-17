import { describe, expect, it } from 'vitest'

interface GuideTerm {
  term: string
  aliases?: string[]
  tr: string
  explanation: string
  example?: { text: string; tr: string }
}

interface GuideTermsFile {
  language: 'fr' | 'es' | 'en'
  source: string
  terms: GuideTerm[]
}

const FILES = import.meta.glob<GuideTermsFile>('./terms/*.json', { eager: true, import: 'default' })

describe('guide terms data', () => {
  it('loads terms for fr, es, and en', () => {
    const langs = Object.values(FILES).map((f) => f.language)
    expect(langs.sort()).toEqual(['en', 'es', 'fr'])
  })

  it('every language has 40–60 terms', () => {
    for (const [path, file] of Object.entries(FILES)) {
      expect(file.terms.length, `${path} should have 40–60 terms`).toBeGreaterThanOrEqual(40)
      expect(file.terms.length, `${path} should have 40–60 terms`).toBeLessThanOrEqual(60)
    }
  })

  it('every term has unique term and aliases within its language', () => {
    for (const [path, file] of Object.entries(FILES)) {
      const seen = new Set<string>()
      for (const item of file.terms) {
        expect(seen.has(item.term.toLowerCase()), `${path} duplicate term: ${item.term}`).toBe(false)
        seen.add(item.term.toLowerCase())
        if (item.aliases) {
          for (const alias of item.aliases) {
            expect(seen.has(alias.toLowerCase()), `${path} duplicate alias: ${alias}`).toBe(false)
            seen.add(alias.toLowerCase())
          }
        }
      }
    }
  })

  it('every term is well-formed with non-empty fields and explanation <= 240 chars', () => {
    for (const [path, file] of Object.entries(FILES)) {
      expect(file.source).toBeTruthy()
      for (const item of file.terms) {
        expect(item.term.trim()).not.toBe('')
        expect(item.tr.trim()).not.toBe('')
        expect(item.explanation.trim()).not.toBe('')
        expect(
          item.explanation.length,
          `${path} term "${item.term}" explanation too long (${item.explanation.length} > 240)`
        ).toBeLessThanOrEqual(240)
        if (item.example) {
          expect(item.example.text.trim()).not.toBe('')
          expect(item.example.tr.trim()).not.toBe('')
        }
      }
    }
  })
})
