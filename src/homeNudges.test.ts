import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// Today shows one suggestion card at a time; a restyle once dropped the rule and the cards ran into each other.
describe('home nudges', () => {
  it('only the first suggestion card shows', () => {
    const css = readFileSync(new URL('./index.css', import.meta.url), 'utf8')
    expect(css).toMatch(/\.home-nudges > :nth-child\(n \+ 2\)\s*\{\s*display:\s*none/)
  })
})
