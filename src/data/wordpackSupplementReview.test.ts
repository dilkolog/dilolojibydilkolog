import { expect, it } from 'vitest'
import supplements from './wordpack-supplements/2026-10-30.json'
import { readFileSync } from 'node:fs'
import type { Pack } from './wordpackBuild'
const load = (language: string) => JSON.parse(readFileSync(new URL(`./wordpack/${language}.json`, import.meta.url), 'utf8')) as Pack
const en = load('en')
const fr = load('fr')
const es = load('es')

it('ships all 189 second-reviewed entries with the matching POS and corrected meanings', () => {
  const packs: Record<string, Pack> = { en, fr, es }
  expect(supplements).toHaveLength(189)
  expect(supplements.filter(s => 'replaces' in s)).toHaveLength(19)
  for (const s of supplements) {
    const record = packs[s.language].w[s.word]
    expect(record?.p, `${s.language}:${s.word}`).toBe(s.pos)
    expect(record?.t, `${s.language}:${s.word}`).toEqual(s.meanings)
    expect(s.reviewedBy).toContain('2026-11-01')
    if (s.example) {
      expect(s.example.text.trim().length).toBeGreaterThan(5)
      expect(s.example.translation.trim().length).toBeGreaterThan(5)
    }
  }
  expect(es.w['en cuanto'].t).not.toContain('konusunda')
  expect(en.w.ticklish.t).not.toContain('gıdıklanan')
})
