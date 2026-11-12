import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import type { ReadingItem } from '../../src/engine/contentTypes'
import { loadContext } from './lib/context'
import { beginnerLexicon, outsideWords, sequenceErrors } from './lib/firstSteps'

const items = readFileSync('content/raw/fr/reading/fr-reading-0003.jsonl', 'utf8').trim().split('\n').map((line) => JSON.parse(line) as ReadingItem)
describe('introductory lexicon and recycling', () => {
  it('uses the source word fields, without treating proper names as familiar words', () => {
    const ctx = loadContext('fr')
    expect(beginnerLexicon('fr').has('maison')).toBe(true)
    expect(beginnerLexicon('fr').has('paris')).toBe(false)
    expect(outsideWords(items[0], ctx)).toEqual(['paris'])
    expect(outsideWords({ ...items[0], paragraphs: ["J'ai de l'eau. Nous sommes contents."] }, ctx)).toEqual([])
  })
  it('rejects missing texts and checks both following texts, including the end of the series', () => {
    expect(sequenceErrors(items).size).toBe(0)
    expect(sequenceErrors(items.slice(0, 24)).size).toBeGreaterThan(0)
    const changed = structuredClone(items)
    changed[2].paragraphs = changed[2].paragraphs.map((p) => p.replace(/table/g, 'bureau'))
    expect(sequenceErrors(changed).get(changed[2].id)?.some((e) => e.includes('bureau'))).toBe(true)
    changed[24].paragraphs.push('Un xylophone est ici.')
    changed[24].vocabulary.push({ word: 'xylophone', lemma: 'xylophone', tr: 'ksilofon' })
    expect(sequenceErrors(changed).get(changed[24].id)?.some((e) => e.includes('next text 26'))).toBe(true)
  })
})
