import { describe, expect, it } from 'vitest'
import { cefrOf } from '../../engine/cefrLevels'
import { loadCefr } from '../cefr'

describe('loadCefr', () => {
  it('loads English CEFR word list (CEFR-J + Octanove A1–C2) and maps graded levels', async () => {
    const en = await loadCefr('en')
    expect(en).not.toBeNull()
    expect(en?.size).toBeGreaterThan(8000)
    expect(en?.get('cat')).toBe('A1')
    expect(en?.get('toothbrush')).toBe('A2')
    expect(en?.get('abandon')).toBe('B1')
    expect(cefrOf({ language: 'en', lemma: 'to abandon' }, en!)).toBe('B1')
  })

  it('loads French CEFR word list and provides level map', async () => {
    const fr = await loadCefr('fr')
    expect(fr).not.toBeNull()
    expect(fr?.size).toBeGreaterThan(100)
    expect(fr?.has('chat') || fr?.has('homme')).toBe(true)
  })

  it('loads Spanish CEFR word list and provides level map', async () => {
    const es = await loadCefr('es')
    expect(es).not.toBeNull()
    expect(es?.size).toBeGreaterThan(100)
    expect(es?.has('casa') || es?.has('hombre')).toBe(true)
  })

  it('has enough Spanish B2 and C1 words to aim for those levels, and no word at two levels', async () => {
    const es = await loadCefr('es')
    const count = (level: string) => [...es!.values()].filter((l) => l === level).length
    expect(count('B2')).toBeGreaterThan(1000)
    expect(count('C1')).toBeGreaterThan(1500)
    expect(es?.get('traicionar')).toBe('B2')
    expect(es?.get('casa')).toBe('A1')
    const text = (await import('../cefr/es.txt?raw')).default
    const words = text.split('\n').filter(Boolean).map((l) => l.split('\t')[0])
    expect(new Set(words).size).toBe(words.length)
  })

  it('caches the loaded promise for subsequent calls', () => {
    const p1 = loadCefr('fr')
    const p2 = loadCefr('fr')
    expect(p1).toBe(p2)
  })
})
