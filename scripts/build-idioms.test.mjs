import { afterEach, describe, expect, it, vi } from 'vitest'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { buildIdioms, hasReviewedFrenchLocator, sourceMatches } from './build-idioms.mjs'

const dirs = []
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }) })
const fixture = () => {
  const dir = mkdtempSync(join(tmpdir(), 'idioms-'))
  dirs.push(dir)
  const raw = pathToFileURL(`${dir}/raw/`), out = pathToFileURL(`${dir}/out/`)
  mkdirSync(raw); mkdirSync(out)
  const write = (name, items) => writeFileSync(new URL(name, raw), JSON.stringify(items))
  return { raw, out, write, log: vi.fn(), error: vi.fn(), warn: vi.fn() }
}

describe('idiom source preflight', () => {
  it('requires dated editorial evidence for opaque official French entry URLs', () => {
    const url = 'https://www.dictionnaire-academie.fr/article/A9P3031'
    const proof = { url, locator: 'Expression : avoir les poches percées', checkedOn: '2026-11-14', verification: 'dictionary_search_excerpt' }
    const row = { w: 'avoir les poches percées', src: ['https://example.com/poche', url], sourceChecks: [proof] }
    expect(hasReviewedFrenchLocator(row, url)).toBe(true)
    for (const w of ['', '  ', null, 0]) expect(hasReviewedFrenchLocator({ ...row, w }, url)).toBe(false)
    for (const over of [{ sourceChecks: [] }, { sourceChecks: [{ ...proof, locator: 'une autre expression' }] }, { sourceChecks: [{ ...proof, checkedOn: '' }] }, { sourceChecks: [{ ...proof, verification: 'unverified' }] }]) {
      expect(hasReviewedFrenchLocator({ ...row, ...over }, url)).toBe(false)
    }
    expect(hasReviewedFrenchLocator(row, 'https://example.com/article/A9P3031')).toBe(false)
    expect(hasReviewedFrenchLocator(row, 'https://www.dictionnaire-academie.fr/article/A8P3031')).toBe(false)
    const f = fixture()
    f.write('fr-0001.json', [row])
    expect(buildIdioms(f)).toBe(true)
    expect(JSON.parse(readFileSync(new URL('fr.json', f.out), 'utf8')).items).toEqual([{ w: row.w }])
  })
  it('checks decoded whole words in the path or query, not the host, fragment or stop words', () => {
    expect(sourceMatches('es', 'tomar el pelo', 'https://example.com/definicion/pelo')).toBe(true)
    expect(sourceMatches('es', 'caérsele el alma a los pies', 'https://example.com/?q=el+alma')).toBe(true)
    expect(sourceMatches('fr', 'poser un lapin', 'https://example.com/?mot=lapin')).toBe(true)
    expect(sourceMatches('fr', 'jeter l’éponge', 'https://example.com/%C3%A9ponge')).toBe(true)
    expect(sourceMatches('fr', 'avoir des papillons dans le ventre', 'https://example.com/definition/papillon')).toBe(true)
    expect(sourceMatches('fr', 'se casser les dents', 'https://example.com/definition/dent')).toBe(true)
    expect(sourceMatches('fr', 'avoir les poches percées', 'https://example.com/definition/poche')).toBe(true)
    expect(sourceMatches('fr', 'prendre les devants', 'https://example.com/devanture')).toBe(false)
    expect(sourceMatches('en', 'spill the beans', 'https://example.com/spill-the-beans')).toBe(true)
    for (const url of ['https://pelo.example.com/other', 'https://example.com/other#pelo', 'https://example.com/el', 'https://example.com/pelota', 'not-a-url', 'https://example.com/%ZZ']) {
      expect(sourceMatches('es', 'tomar el pelo', url), url).toBe(false)
    }
    expect(sourceMatches('es', 'no mover un dedo', 'https://example.com/no')).toBe(false)
    expect(sourceMatches('fr', 'ne pas perdre le nord', 'https://example.com/pas')).toBe(false)
    expect(sourceMatches('en', 'pull someone’s leg', 'https://example.com/someone')).toBe(false)
  })

  it('rejects an unrelated address with the batch, idiom and address, without rewriting outputs', () => {
    const f = fixture()
    writeFileSync(new URL('es.json', f.out), 'previous pack')
    f.write('es-0001.json', [{ w: 'tomar el pelo', src: ['https://example.com/pelo', 'https://example.com/unrelated'] }])
    expect(buildIdioms(f)).toBe(false)
    expect(f.error).toHaveBeenCalledWith(expect.stringContaining('es-0001.json: "tomar el pelo"'))
    expect(f.error).toHaveBeenCalledWith(expect.stringContaining('https://example.com/unrelated'))
    expect(readFileSync(new URL('es.json', f.out), 'utf8')).toBe('previous pack')
  })

  it('warns only above three distinct idioms per identical address, including across batches', () => {
    const f = fixture(), shared = 'https://example.com/pelo'
    for (let n = 1; n <= 3; n++) f.write(`es-000${n}.json`, [{ w: `tomar pelo ${n}`, src: [shared, shared] }])
    expect(buildIdioms(f)).toBe(true)
    expect(f.warn).not.toHaveBeenCalled()
    f.write('es-0004.json', [{ w: 'mirar pelo', src: [shared, 'https://example.com/mirar'] }])
    expect(buildIdioms(f)).toBe(true)
    expect(f.warn).toHaveBeenCalledExactlyOnceWith(expect.stringContaining('4 deyimde'))
  })

  it('preserves source-free seeds, rejects missing sources/duplicates and omits src from the pack', () => {
    const f = fixture()
    f.write('es-0000.json', [{ w: 'tomar el pelo' }])
    f.write('es-0001.json', [{ w: 'dar la cara', src: ['https://example.com/cara', 'https://example.org/dar'] }])
    expect(buildIdioms(f)).toBe(true)
    expect(JSON.parse(readFileSync(new URL('es.json', f.out), 'utf8')).items).toEqual([{ w: 'tomar el pelo' }, { w: 'dar la cara' }])
    f.write('es-0002.json', [{ w: 'otra frase' }, { w: 'Tomar  el pelo' }])
    expect(buildIdioms(f)).toBe(false)
    expect(f.error.mock.calls.flat().join(' ')).toContain('iki kaynak')
    expect(f.error.mock.calls.flat().join(' ')).toContain('zaten var')
  })
})
