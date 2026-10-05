import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { genderOfArticle } from '../engine/answerCheck'
import { ArticleTag } from './WrittenForm'

describe('article gender', () => {
  it('reads the gender an article shows', () => {
    expect(genderOfArticle('le', 'fr')).toBe('m')
    expect(genderOfArticle('une', 'fr')).toBe('f')
    expect(genderOfArticle('el', 'es')).toBe('m')
    expect(genderOfArticle("l'", 'fr')).toBeUndefined()
    expect(genderOfArticle('the', 'en')).toBeUndefined()
    expect(genderOfArticle(undefined, 'es')).toBeUndefined()
  })

  it('tints the article and names the gender in words', () => {
    const html = renderToStaticMarkup(<ArticleTag article="la" entry={{ language: 'fr', gender: 'f' }} />)
    expect(html).toContain('gender-f')
    expect(html).toContain('title="dişil"')
  })

  it("falls back to the entry's gender for l' and leaves English plain", () => {
    expect(renderToStaticMarkup(<ArticleTag article="l'" entry={{ language: 'fr', gender: 'm' }} />)).toContain('gender-m')
    expect(renderToStaticMarkup(<ArticleTag article="the" entry={{ language: 'en' }} />)).not.toContain('gender-')
  })
})
