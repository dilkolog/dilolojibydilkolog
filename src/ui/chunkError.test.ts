import { describe, expect, it } from 'vitest'
import { isChunkError } from './chunkError'

describe('isChunkError', () => {
  it('identifies ChunkLoadError', () => {
    const error = new Error('Loading chunk 42 failed')
    error.name = 'ChunkLoadError'
    expect(isChunkError(error)).toBe(true)
  })

  it('identifies dynamic import failures', () => {
    expect(isChunkError(new Error('Failed to fetch dynamically imported module /src/ui/Session.tsx'))).toBe(true)
    expect(isChunkError(new TypeError('error loading dynamically imported module'))).toBe(true)
  })

  it('identifies module script import failures', () => {
    expect(isChunkError(new Error('Importing a module script failed.'))).toBe(true)
  })

  it('identifies network fetch failures for chunks', () => {
    expect(isChunkError(new TypeError('Failed to fetch'))).toBe(true)
  })

  it('handles string errors and unknown objects', () => {
    expect(isChunkError('Loading chunk assets/index.js failed')).toBe(true)
    expect(isChunkError('Failed to fetch')).toBe(true)
  })

  it('returns false for unrelated errors', () => {
    expect(isChunkError(new Error('Syntax error on line 4'))).toBe(false)
    expect(isChunkError(new RangeError('Maximum call stack size exceeded'))).toBe(false)
    expect(isChunkError(null)).toBe(false)
    expect(isChunkError(undefined)).toBe(false)
    expect(isChunkError(12345)).toBe(false)
  })
})
