import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
// @ts-expect-error a plain .mjs build script, without types
import { LANG_PAGES, languagePage } from '../scripts/lang-pages.mjs'
import { LANGUAGE_PATHS } from './ui/home/startLanguage'

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')

describe('the language pages for sharing', () => {
  it('are the same addresses the landing page knows', () => {
    for (const p of LANG_PAGES as { slug: string; lang: 'fr' | 'es' | 'en' }[]) expect(LANGUAGE_PATHS[p.lang]).toBe(p.slug)
  })

  it('carry their language in the title, description, address and picture, and nothing else changes', () => {
    const page = languagePage(html, LANG_PAGES[1]) as string
    expect(page).toContain('<title>İspanyolca öğren · Diloloji</title>')
    expect(page).toContain('<link rel="canonical" href="https://diloloji.com/ispanyolca"')
    expect(page).toContain('<meta property="og:url" content="https://diloloji.com/ispanyolca"')
    expect(page).toContain('<meta property="og:image" content="https://diloloji.com/og/og-es.jpg"')
    expect(page).toContain('<meta name="twitter:image" content="https://diloloji.com/og/og-es.jpg"')
    // The app itself is the same: scripts and body untouched.
    const body = (h: string) => h.slice(h.indexOf('</head>'))
    expect(body(page)).toBe(body(html))
  })

  it('have their pictures', () => {
    for (const file of ['og', 'og-fr', 'og-es', 'og-en']) expect(readFileSync(new URL(`../public/og/${file}.jpg`, import.meta.url)).length).toBeGreaterThan(10_000)
  })
})
