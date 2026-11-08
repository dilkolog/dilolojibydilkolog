import { describe, expect, it } from 'vitest'
import { anySecretMatches, bearerOf, secretMatches } from '../../api/_secret'

describe('comparing a token with the server secrets', () => {
  it('matches only the same text, and never an empty secret', async () => {
    expect(await secretMatches('s3cret', 's3cret')).toBe(true)
    expect(await secretMatches('s3cre', 's3cret')).toBe(false)
    expect(await secretMatches('s3cret!', 's3cret')).toBe(false)
    expect(await secretMatches('', '')).toBe(false)
    expect(await secretMatches('anything', '')).toBe(false)
  })

  it('accepts any key of a rotation', async () => {
    expect(await anySecretMatches('new', ['old', 'new'])).toBe(true)
    expect(await anySecretMatches('other', ['old', 'new'])).toBe(false)
    expect(await anySecretMatches('x', [])).toBe(false)
  })

  it('reads the bearer token, case-insensitive scheme, trimmed', () => {
    const req = (h?: string) => new Request('https://x/', { headers: h ? { authorization: h } : {} })
    expect(bearerOf(req('Bearer abc'))).toBe('abc')
    expect(bearerOf(req('bearer  abc '))).toBe('abc')
    expect(bearerOf(req('Basic abc'))).toBe('')
    expect(bearerOf(req())).toBe('')
  })
})
