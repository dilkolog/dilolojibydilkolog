import { describe, expect, it } from 'vitest'
import { reflexPhrases } from './reflex'

describe('the 3-second phrases', () => {
  it('have an id, a group and all four languages; no phrase is twice in a language', () => {
    expect(new Set(reflexPhrases.map((p) => p.id)).size).toBe(reflexPhrases.length)
    for (const p of reflexPhrases) for (const k of ['group', 'tr', 'fr', 'es', 'en'] as const) expect(p[k].trim(), `${p.id}.${k}`).not.toBe('')
    for (const lang of ['tr', 'fr', 'es', 'en'] as const) expect(new Set(reflexPhrases.map((p) => p[lang])).size, lang).toBe(reflexPhrases.length)
  })

  it('are short enough to say at once', () => {
    for (const p of reflexPhrases) for (const lang of ['fr', 'es', 'en'] as const) expect(p[lang].split(/\s+/).length, `${p.id}.${lang}`).toBeLessThanOrEqual(8)
  })
})
