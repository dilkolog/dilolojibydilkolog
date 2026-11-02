import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { isCleanRelationTerm, type Pack } from '../wordpackBuild'

const loadLocalPack = (lang: 'en' | 'fr' | 'es'): Pack =>
  JSON.parse(readFileSync(resolve(process.cwd(), `src/data/wordpack/${lang}.json`), 'utf8')) as Pack

describe('wordpack hygiene and high-frequency primary glosses', () => {
  it('filters Wiktionary meta-text and prose out of relation terms', () => {
    expect(isCleanRelationTerm('quick')).toBe(true)
    expect(isCleanRelationTerm('at once')).toBe(true)
    expect(isCleanRelationTerm('plus the alternative forms and at Appendix:English personal pronouns')).toBe(false)
    expect(isCleanRelationTerm('Thesaurus:happy')).toBe(false)
    expect(isCleanRelationTerm('Slavie méridionale[South Slavia]]>')).toBe(false)
  })

  it('has zero Appendix/Thesaurus/template leaks across EN, FR, ES wordpacks', () => {
    for (const lang of ['en', 'fr', 'es'] as const) {
      const pack = loadLocalPack(lang)
      for (const [word, rec] of Object.entries(pack.w)) {
        for (const rel of [...(rec.s ?? []), ...(rec.n ?? [])]) {
          expect(isCleanRelationTerm(rel), `${lang}:${word} rel="${rel}"`).toBe(true)
        }
        for (const gloss of rec.t ?? []) {
          expect(gloss, `${lang}:${word} gloss`).not.toMatch(/Appendix:|Thesaurus:|Wikipedia|affimative|\.\.\.\(|sapıkça/)
        }
      }
    }
  })

  it('surfaces clean primary Turkish meanings on ultra-frequent function and core words', () => {
    const en = loadLocalPack('en')
    expect(en.w.a?.t?.[0]).toContain('bir')
    expect(en.w.you?.t?.[0]).toBe('sen, siz')
    expect(en.w.we?.t?.[0]).toBe('biz')
    expect(en.w.their?.t?.[0]).toBe('onların')
    expect(en.w.still?.t?.[0]).toContain('hâlâ')
    expect(en.w.may?.t?.[0]).toContain('-ebilir')
    expect(en.w.to?.s).toBeUndefined()

    const fr = loadLocalPack('fr')
    expect(fr.w.a?.t?.[0]).toContain('avoir')
    expect(fr.w.as?.t?.[0]).toContain('avoir')
    expect(fr.w.moment?.t?.[0]).toBe('an, dakika')

    const es = loadLocalPack('es')
    expect(es.w.haber?.t?.[0]).toContain('var')
    expect(es.w.mi?.t?.[0]).toContain('benim')
    expect(es.f?.hemos).toBe('haber')
  })
})
