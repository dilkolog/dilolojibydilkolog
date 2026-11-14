import { describe, expect, it } from 'vitest'
import { buildIndex, missedMarkdown, rankItems, wordInfo, type ItemRow } from './lib/missed'
import { changeRetired, languageOfId } from './lib/retire'

const row = (item: string, ok: number, wrong: number, people = 1, kind = 'grammar'): ItemRow => ({ kind, item, ok, wrong, people })

describe('the most missed items', () => {
  it('ranks by the share wrong, then the number wrong, and leaves out items with too few answers', () => {
    const { missed } = rankItems([row('a', 5, 5), row('b', 0, 4), row('c', 1, 9), row('d', 10, 10), row('e', 0, 0)])
    expect(missed.map((r) => r.item)).toEqual(['c', 'd', 'a'])
    expect(missed[0]).toMatchObject({ answers: 10, miss: 0.9 })
  })
  it('lists the ones nobody misses only with enough answers from two people or more', () => {
    const { easy } = rankItems([row('x', 12, 0, 2), row('y', 30, 0, 1), row('z', 9, 0, 3), row('w', 20, 0, 3)])
    expect(easy.map((r) => r.item)).toEqual(['w', 'x'])
  })
  it('takes numbers as Postgres sends them (strings for bigint)', () => {
    expect(rankItems([{ kind: 'grammar', item: 'q', people: '2' as never, ok: '1' as never, wrong: '6' as never }]).missed[0]).toMatchObject({ answers: 7, people: 2 })
  })
})

describe('the report names each item', () => {
  const index = buildIndex()
  it('finds factory questions, bundled questions and an exam set’s questions by id', () => {
    expect(index.get('fr-g-000001')?.file).toBe('content/raw/fr/grammar/fr-grammar-0001.jsonl')
    expect(index.get('fr-passe_imparfait-01')?.text).toContain('___')
    const [set] = Object.entries(Object.fromEntries(index)).filter(([id]) => id.endsWith('|2'))
    expect(set?.[1].text).toBeTruthy()
  })
  it('finds a pack word with its meanings, and says when a word is the learner’s own', () => {
    expect(wordInfo('fr:maison')?.text).toMatch(/^maison: ev/)
    expect(wordInfo('fr:qqqzzz')).toBeUndefined()
    const md = missedMarkdown([row('fr:qqqzzz', 0, 6, 1, 'word'), row('fr-g-000001', 1, 6, 2)], (r) => (r.kind === 'word' ? wordInfo(r.item) : index.get(r.item)), '2026-11-07')
    expect(md).toContain('# İçerik raporu: 2026-11-07 sonrası')
    expect(md).toContain('(öğrencinin kendi kelimesi)')
    expect(md).toContain('content/raw/fr/grammar/fr-grammar-0001.jsonl')
    expect(md).toContain('| 1 | Kelime')
    expect(md).toContain('| 2 | Dilbilgisi')
  })
})

describe('retiring', () => {
  const known = new Set(['fr-g-1', 'fr-g-2', 'fr-r-3'])
  it('adds a factory id once, sorted, and refuses one that is not the factory’s', () => {
    expect(changeRetired(['fr-r-3'], ['fr-g-2', 'fr-g-2', 'fr-x-9'], known)).toEqual({ list: ['fr-g-2', 'fr-r-3'], unknown: ['fr-x-9'] })
  })
  it('takes an id back with undo', () => {
    expect(changeRetired(['fr-g-1', 'fr-g-2'], ['fr-g-1'], known, true)).toEqual({ list: ['fr-g-2'], unknown: [] })
  })
  it('knows the language of a factory id only', () => {
    expect([languageOfId('fr-g-000123'), languageOfId('es-r-000001'), languageOfId('en-passe-01'), languageOfId('fr:maison')]).toEqual(['fr', 'es', undefined, undefined])
  })
})
