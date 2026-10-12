import { readFileSync, existsSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The styles are in two files: `index.css` loads with the first screen, `lazy.css` with the other
 * screens (every lazily loaded screen imports it). A class used by code that is in the first
 * bundle must therefore be in `index.css`, or it renders unstyled until a screen loads.
 */
const SRC = resolve(__dirname)
const read = (f: string) => readFileSync(f, 'utf8')

function mainBundleFiles(): string[] {
  const seen = new Set<string>()
  const stack = [join(SRC, 'main.tsx')]
  while (stack.length) {
    const f = stack.pop()!
    if (seen.has(f)) continue
    seen.add(f)
    for (const m of read(f).matchAll(/^\s*(?:import|export)\s[^'"]*?from\s*['"](\.[^'"]+)['"]|^\s*import\s*['"](\.[^'"]+)['"]/gm)) {
      const base = resolve(dirname(f), m[1] ?? m[2])
      const hit = [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), join(base, 'index.tsx')].find((c) => existsSync(c) && /\.tsx?$/.test(c))
      if (hit) stack.push(hit)
    }
  }
  return [...seen]
}

const lazyClasses = (): string[] => {
  const css = read(join(SRC, 'lazy.css')).replace(/\/\*[\s\S]*?\*\//g, '')
  const out = new Set<string>()
  for (const m of css.matchAll(/([^{}]+)\{/g)) {
    if (m[1].trim().startsWith('@')) continue
    for (const c of m[1].matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) out.add(c[1])
  }
  return [...out]
}

describe('css split', () => {
  it('the first bundle uses no class that only lazy.css styles', () => {
    const text = mainBundleFiles().map(read).join('\n') + read(join(SRC, '..', 'index.html'))
    const inCss = new Set(readdirSync(SRC).filter((f) => f === 'index.css').flatMap(() => [...read(join(SRC, 'index.css')).matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((m) => m[1])))
    const dynamicPrefixes = [...text.matchAll(/([A-Za-z0-9_-]*[-_])\$\{/g)].map((m) => m[1]).filter((p) => p.length > 1)
    const used = (c: string) => new RegExp(`(?<![\\w-])${c.replace(/-/g, '\\-')}(?![\\w-])`).test(text) || dynamicPrefixes.some((p) => c.startsWith(p))
    // A class that is in both files is fine (it was split by a rule, not by a name).
    const bad = lazyClasses().filter((c) => !inCss.has(c) && used(c))
    expect(bad).toEqual([])
  })
})
