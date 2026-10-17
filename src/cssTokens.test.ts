import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * A `var(--x)` of a custom property nobody sets is not an error anywhere: the whole declaration is dropped and the
 * element quietly loses its corners, its shadow, or the red of a wrong answer. So every property the styles and the
 * code read must be set somewhere (a stylesheet, or an inline style by name), unless the use gives a fallback.
 */
const SRC = resolve(__dirname)

function files(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const f = join(dir, name)
    if (statSync(f).isDirectory()) files(f, out)
    else if (/\.(css|tsx?)$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(f)
  }
  return out
}

describe('css custom properties', () => {
  it('are all set somewhere when they are read without a fallback', () => {
    const text = files(SRC).map((f) => readFileSync(f, 'utf8')).join('\n')
    const set = new Set<string>([...text.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]!))
    // Set from code by name: style={{ '--hue': … }}, ['--hue' as string]: …
    for (const m of text.matchAll(/['"`](--[a-z0-9-]+)['"`]/g)) set.add(m[1]!)
    const unset = new Set<string>()
    for (const m of text.matchAll(/var\(\s*(--[a-z0-9-]+)\s*\)/g)) if (!set.has(m[1]!)) unset.add(m[1]!)
    expect([...unset].sort()).toEqual([])
  })
})
