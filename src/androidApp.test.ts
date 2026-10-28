import { readFileSync, existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')
const twa = JSON.parse(read('../android/twa-manifest.json')) as {
  packageId: string
  host: string
  startUrl: string
  themeColor: string
  backgroundColor: string
  fingerprints: { name?: string; value: string }[]
  signingKey: { path: string }
}
const links = JSON.parse(read('../public/.well-known/assetlinks.json')) as {
  relation: string[]
  target: { namespace: string; package_name: string; sha256_cert_fingerprints: string[] }
}[]
const viteConfig = read('../vite.config.ts')
const FINGERPRINT = /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/

/**
 * The Android app (android/README.md) opens diloloji.com full screen only while the site's
 * assetlinks.json names the same package and the key that signed it: keep the two files agreeing.
 */
describe('android app', () => {
  it('is the site named in assetlinks.json', () => {
    expect(twa.host).toBe('diloloji.com')
    expect(twa.startUrl).toBe('/')
    const entry = links.find((l) => l.target.namespace === 'android_app')!
    expect(entry.relation).toContain('delegate_permission/common.handle_all_urls')
    expect(entry.target.package_name).toBe(twa.packageId)
  })

  it('trusts exactly the signing keys the app lists, in the form Android checks', () => {
    const site = links.flatMap((l) => l.target.sha256_cert_fingerprints)
    for (const f of site) expect(f).toMatch(FINGERPRINT)
    expect([...site].sort()).toEqual(twa.fingerprints.map((f) => f.value).sort())
  })

  it('wears the web app colours, so the splash screen does not flash another one', () => {
    const color = (key: string) => viteConfig.match(new RegExp(`${key}: '(#[0-9a-f]{6})'`, 'i'))?.[1]?.toUpperCase()
    expect(twa.themeColor).toBe(color('theme_color'))
    expect(twa.backgroundColor).toBe(color('background_color'))
  })

  it('keeps the signing key out of the repository', () => {
    expect(twa.signingKey.path.startsWith('./')).toBe(true)
    expect(existsSync(new URL(`../android/${twa.signingKey.path}`, import.meta.url))).toBe(false)
    expect(read('../.gitignore')).toMatch(/^\*\.keystore$/m)
  })
})
