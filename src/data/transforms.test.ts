import { beforeAll, describe, expect, it } from 'vitest'
import '../engine/conjugationData'
import fr from './tenses/fr.json'
import es from './tenses/es.json'
import frPairs from './transforms/fr.json'
import esPairs from './transforms/es.json'
import { addTenses } from '../engine/tenses'
import { bracketed, checkPair, normForm, pairId, plain, TRANSFORM_KINDS, type TransformKind, type TransformPair } from '../engine/transformPairs'
import { judge } from '../ui/verbs/labShared'

beforeAll(() => {
  addTenses('fr', fr as Record<string, unknown>)
  addTenses('es', es as Record<string, unknown>)
})

const DATA = { fr: frPairs as unknown as TransformPair[], es: esPairs as unknown as TransformPair[] }
/** The first round's aims (docs/GOREV-DONUSUM-CIFTLERI.md §8); the data must reach 80 % of each. */
const AIM: Record<'fr' | 'es', Record<TransformKind, number>> = {
  fr: { temel: 150, aktarim: 100, kosul: 100, uyum: 75, bitmislik: 75 },
  es: { temel: 150, aktarim: 100, kosul: 100, uyum: 100, bitmislik: 50 },
}

describe.each(['fr', 'es'] as const)('transform pairs (%s)', (lang) => {
  const pairs = DATA[lang]

  it('every pair passes the tool’s checks again', () => {
    const bad = pairs.flatMap((p) => {
      const r = checkPair(lang, p)
      if ('error' in r) return [`${p.id}: ${r.error}`]
      if (r.persons.join() !== p.persons.join()) return [`${p.id}: persons ${p.persons} ≠ ${r.persons}`]
      return []
    })
    expect(bad).toEqual([])
  })

  it('ids are unique and stable, source sentences unique', () => {
    expect(new Set(pairs.map((p) => p.id)).size).toBe(pairs.length)
    for (const p of pairs) expect(p.id).toBe(pairId(lang, p.verb, p.from, p.to, p.source))
    expect(new Set(pairs.map((p) => normForm(plain(p.source)))).size).toBe(pairs.length)
  })

  it('has enough pairs of every kind', () => {
    for (const kind of TRANSFORM_KINDS) expect(pairs.filter((p) => p.kind === kind).length, kind).toBeGreaterThanOrEqual(Math.ceil(AIM[lang][kind] * 0.8))
  })

  it('the target form is taken as right for one of its persons', () => {
    const bad = pairs.filter((p) => !p.persons.length || !p.persons.some((person) => judge(lang, p.verb, p.to, person, bracketed(p.target)!)))
    expect(bad.map((p) => p.id)).toEqual([])
  })
})

it('the French present is now a source tense', () => {
  expect(DATA.fr.filter((p) => p.from === 'present').length).toBeGreaterThanOrEqual(40)
})
