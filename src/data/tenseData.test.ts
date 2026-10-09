import { describe, expect, it } from 'vitest'
import { tensesLoaded } from '../engine/tenses'
import { loadTenses } from './tenseData'

describe('tenseData', () => {
  it('resolves immediately for English without loading anything', async () => {
    await expect(loadTenses('en')).resolves.toBeUndefined()
  })

  it('loads French tenses and marks them loaded', async () => {
    await loadTenses('fr')
    expect(tensesLoaded('fr')).toBe(true)

    // Second call should resolve immediately because tensesLoaded is true
    await expect(loadTenses('fr')).resolves.toBeUndefined()
  })

  it('loads Spanish tenses and shares in-flight promise for concurrent calls', async () => {
    const p1 = loadTenses('es')
    const p2 = loadTenses('es')
    expect(p1).toBe(p2)

    await Promise.all([p1, p2])
    expect(tensesLoaded('es')).toBe(true)
  })
})
