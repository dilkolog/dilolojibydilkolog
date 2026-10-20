import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
// @ts-expect-error a plain .mjs build script, without types
import { inlineScriptHashes, withScriptHashes } from '../scripts/cspHashes.mjs'

const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8')) as { headers: { source: string; headers: { key: string; value: string }[] }[] }
const csp = config.headers.flatMap((r) => r.headers).find((h) => h.key.startsWith('Content-Security-Policy'))!
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')

describe('content security policy', () => {
  it('is enforced, and still reports what it blocks', () => {
    expect(csp.key).toBe('Content-Security-Policy')
    expect(csp.value).toContain('report-uri /api/log?csp=1')
    expect(csp.value).toContain("object-src 'none'")
    expect(csp.value).not.toMatch(/script-src[^;]*'unsafe-(inline|eval)'/)
  })

  it('lets every inline script of index.html run (the build writes them anyway; this keeps vercel.json honest)', () => {
    const hashes = inlineScriptHashes(html) as string[]
    expect(hashes.length).toBeGreaterThan(0)
    for (const h of hashes) expect(csp.value).toContain(h)
    expect(withScriptHashes(csp.value, hashes)).toBe(csp.value)
  })

  it('replaces only the script hashes', () => {
    const next = withScriptHashes("default-src 'self'; script-src 'self' 'sha256-old='; style-src 'self'", ["'sha256-new='"]) as string
    expect(next).toBe("default-src 'self'; script-src 'self' 'sha256-new='; style-src 'self'")
  })
})
