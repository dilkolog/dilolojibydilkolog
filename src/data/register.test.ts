import { describe, expect, it } from 'vitest'
import { registerItems } from './register'

describe('the register lists', () => {
  it('are in each language, with unique ids and three different, filled-in ways to say each', () => {
    for (const l of ['fr', 'es', 'en']) expect(registerItems.filter((i) => i.language === l).length, l).toBeGreaterThanOrEqual(12)
    expect(new Set(registerItems.map((i) => i.id)).size).toBe(registerItems.length)
    for (const i of registerItems) {
      expect(i.id.startsWith(`${i.language}-`), i.id).toBe(true)
      for (const k of ['tr', 'informal', 'standard', 'formal', 'source'] as const) expect(i[k].trim(), `${i.id}.${k}`).not.toBe('')
      expect(new Set([i.informal, i.standard, i.formal]).size, i.id).toBe(3)
    }
  })
})
