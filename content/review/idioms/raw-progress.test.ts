import { readFileSync, readdirSync } from 'node:fs'
import { expect, it } from 'vitest'
import { idiomProblems, type Idiom } from '../../../src/data/idioms'
import { sourceMatches } from '../../../scripts/build-idioms.mjs'

const root = new URL('../../raw/idioms/', import.meta.url)
const batches = readdirSync(root).filter(f => /^es-\d{4}\.json$/.test(f)).map(file => ({ file, rows: JSON.parse(readFileSync(new URL(file, root), 'utf8')) as Idiom[] }))
it('validates all current Spanish raw fields, forms and duplicates', () => {
  expect(idiomProblems(batches.flatMap(b => b.rows))).toEqual([])
})
it.each(['0001', '0002', '0003', '0004', '0005', '0006', '0007', '0008', '0009', '0010', '0011', '0012'])('validates renewed source addresses in batch %s', number => {
  const rows = batches.find(b => b.file === `es-${number}.json`)!.rows as (Idiom & {src: string[]})[]
  for (const row of rows) {
    expect(row.src.length, row.w).toBeGreaterThanOrEqual(2)
    for (const url of row.src) expect(sourceMatches('es', row.w, url), `${row.w}: ${url}`).toBe(true)
  }
})
