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
  return { raw: rawUrl, out, write, built, log: vi.fn(), error: vi.fn(), warn: vi.fn() }
}
const wfd = (id, extra = {}) => ({ id, text: 'The library closes early on Fridays in the summer.', level: 'A2', topic: 'campus', tr: 'Kütüphane yazın cuma erken kapanır.', ...extra })
const fib = (id, extra = {}) => ({
  id,
  text: 'Walking is one of the easiest ways to stay [[1]]. Doctors suggest that adults walk for at least thirty minutes a day. It does not [[2]] any special equipment, and you can do it almost anywhere. A short walk after lunch can [[3]] you feel less tired in the afternoon, and a longer walk at the weekend is a good way to [[4]] time with friends.',
  blanks: [
    { answer: 'healthy', options: ['healthy', 'health', 'healthily', 'heal'] },
    { answer: 'need', options: ['need', 'needs', 'needing', 'needed'] },
    { answer: 'make', options: ['make', 'do', 'take', 'give'] },
    { answer: 'spend', options: ['spend', 'spent', 'spending', 'spends'] },
  ],
  level: 'A2',
  topic: 'health',
  tr: 'Yürümek…',
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
    f.write('en-0001.json', { wfd: [wfd('wfd-1', { note: 'not kept', text: '  The library closes early on Fridays in the summer. ' })], rs: [] })
    expect(buildPte(f)).toBe(true)
    const pack = JSON.parse(f.built())
    expect(pack.language).toBe('en')
    expect(pack.placeholder).toBeUndefined()
    expect(pack.wfd).toEqual([wfd('wfd-1')])
    expect(pack.fib[0].blanks).toHaveLength(4)
    expect(pack.ra).toEqual([])
    expect(f.log).toHaveBeenCalledWith(expect.stringContaining('wfd 1'))
    // Two A2 items: far from the brief's mix, said but not refused.
    expect(f.warn).toHaveBeenCalledWith(expect.stringContaining('A2: %100 (hedef %50)'))
  })

  it('a rejected batch writes nothing and says which file and item', () => {
    const f = fixture()
    f.write('en-0001.json', { wfd: [wfd('same')] })
    f.write('en-0002.json', { fib: [fib('same', { blanks: [{ answer: 'tea', options: ['healthy', 'health', 'healthily', 'heal'] }] })] })
    expect(buildPte(f)).toBe(false)
    expect(f.built()).toBe('{"old":true}')
    const said = f.error.mock.calls.map((c) => c[0]).join('\n')
    expect(said).toContain('en-0002.json: fib[0] same: kimlik iki kez kullanılmış')
    expect(said).toContain('sırayla tutmuyor')
    expect(said).toContain('cevabı seçeneklerin içinde değil')
  })

  it('a task’s list in a file named after it is that task (how the content arrives)', () => {
    const f = fixture()
    f.write('fib.json', [fib('fib-1')])
    f.write('wfd.json', [wfd('wfd-1')])
    expect(buildPte(f)).toBe(true)
    const pack = JSON.parse(f.built())
    expect(pack.fib.map((i) => i.id)).toEqual(['fib-1'])
    expect(pack.wfd.map((i) => i.id)).toEqual(['wfd-1'])
  })

  it('broken JSON and a list in a file not named after a task are rejected', () => {
    const f = fixture()
    f.write('a.json', '{ nope')
    f.write('b.json', [wfd('x')])
    expect(buildPte(f)).toBe(false)
    expect(f.built()).toBe('{"old":true}')
    expect(f.error).toHaveBeenCalledTimes(2)
  })
})
