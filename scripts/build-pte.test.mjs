import { afterEach, describe, expect, it, vi } from 'vitest'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { buildPte } from './build-pte.mjs'

const dirs = []
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }) })
const fixture = ({ raw = true } = {}) => {
  const dir = mkdtempSync(join(tmpdir(), 'pte-'))
  dirs.push(dir)
  const rawUrl = pathToFileURL(`${dir}/raw/`), out = pathToFileURL(`${dir}/out/`)
  if (raw) mkdirSync(rawUrl)
  mkdirSync(out)
  writeFileSync(new URL('en.json', out), '{"old":true}')
  const write = (name, batch) => writeFileSync(new URL(name, rawUrl), typeof batch === 'string' ? batch : JSON.stringify(batch))
  const built = () => readFileSync(new URL('en.json', out), 'utf8')
  return { raw: rawUrl, out, write, built, log: vi.fn(), error: vi.fn() }
}
const wfd = (id, extra = {}) => ({ id, text: 'The library closes early on Fridays in summer.', level: 'A2', topic: 'campus', tr: 'Kütüphane yazın cuma erken kapanır.', ...extra })
const fib = (id, extra = {}) => ({
  id,
  text: 'Coffee is one of the most [[1]] drinks in the world, and many people [[2]] their day with a cup before they go to work or school.',
  blanks: [
    { answer: 'popular', options: ['popular', 'famous', 'busy', 'lucky'] },
    { answer: 'start', options: ['start', 'open', 'begin with', 'make'] },
  ],
  level: 'B1',
  topic: 'food',
  tr: 'Kahve…',
  ...extra,
})

describe('building the PTE pack', () => {
  it('without raw content it succeeds and leaves the pack alone', () => {
    for (const f of [fixture({ raw: false }), fixture()]) {
      expect(buildPte(f)).toBe(true)
      expect(f.built()).toBe('{"old":true}')
      expect(f.error).not.toHaveBeenCalled()
    }
  })

  it('joins the batches in name order, keeps only the known fields and trims them', () => {
    const f = fixture()
    f.write('en-0002.json', { fib: [fib('fib-1')] })
    f.write('en-0001.json', { wfd: [wfd('wfd-1', { note: 'not kept', text: '  The library closes early on Fridays in summer. ' })], rs: [] })
    expect(buildPte(f)).toBe(true)
    const pack = JSON.parse(f.built())
    expect(pack.language).toBe('en')
    expect(pack.placeholder).toBeUndefined()
    expect(pack.wfd).toEqual([wfd('wfd-1')])
    expect(pack.fib[0].blanks).toHaveLength(2)
    expect(pack.ra).toEqual([])
    expect(f.log).toHaveBeenCalledWith(expect.stringContaining('wfd 1'))
  })

  it('a rejected batch writes nothing and says which file and item', () => {
    const f = fixture()
    f.write('en-0001.json', { wfd: [wfd('same')] })
    f.write('en-0002.json', { fib: [fib('same', { blanks: [{ answer: 'tea', options: ['popular', 'famous', 'busy', 'lucky'] }] })] })
    expect(buildPte(f)).toBe(false)
    expect(f.built()).toBe('{"old":true}')
    const said = f.error.mock.calls.map((c) => c[0]).join('\n')
    expect(said).toContain('en-0002.json: fib[0] same: kimlik iki kez kullanılmış')
    expect(said).toContain('sırayla tutmuyor')
    expect(said).toContain('cevabı seçeneklerin içinde değil')
  })

  it('broken JSON and a list instead of an object are rejected', () => {
    const f = fixture()
    f.write('a.json', '{ nope')
    f.write('b.json', [wfd('x')])
    expect(buildPte(f)).toBe(false)
    expect(f.built()).toBe('{"old":true}')
    expect(f.error).toHaveBeenCalledTimes(2)
  })
})
