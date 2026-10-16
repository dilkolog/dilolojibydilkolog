import { describe, expect, it } from 'vitest'
import { loadCefr } from '../cefr'

describe('loadCefr', () => {
  it('returns null for English as no CEFR list exists yet', async () => {
    const res = await loadCefr('en')
    expect(res).toBeNull()
  })

  it('loads French CEFR word list and provides level map', async () => {
    const fr = await loadCefr('fr')
    expect(fr).not.toBeNull()
    expect(fr?.size).toBeGreaterThan(100)
    expect(fr?.has('chat') || fr?.has('homme')).toBe(true)
  })

  it('loads Spanish CEFR word list and provides level map', async () => {
    const es = await loadCefr('es')
    expect(es).not.toBeNull()
    expect(es?.size).toBeGreaterThan(100)
    expect(es?.has('casa') || es?.has('hombre')).toBe(true)
  })

  it('caches the loaded promise for subsequent calls', () => {
    const p1 = loadCefr('fr')
    const p2 = loadCefr('fr')
    expect(p1).toBe(p2)
  })
})
