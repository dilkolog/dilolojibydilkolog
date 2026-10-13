import { beforeAll, describe, expect, it } from 'vitest'
import { loadTenses } from '../../data/tenseData'
import { LAB_TENSES } from '../../engine/tenses'
import { verbSheetHtml } from './printVerb'

beforeAll(async () => {
  await loadTenses('fr')
  await loadTenses('es')
})

const entry = (language: 'fr' | 'es', lemma: string) => ({ language, lemma, partOfSpeech: 'verb' as const })
const text = (html: string) => html.replace(/<style>[\s\S]*?<\/style>/, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')

describe('the printed conjugation sheet', () => {
  it('holds every tense of the verb by mood, with the subject pronouns, the parts and the date', () => {
    const html = verbSheetHtml({ language: 'fr', verb: 'finir', entry: entry('fr', 'finir'), meaning: 'bitirmek', available: LAB_TENSES.fr, now: new Date(2026, 9, 13) })
    const t = text(html)
    expect(t).toContain('finir bitirmek')
    expect(t).toContain('Mastar: finir')
    expect(t).toContain('Geçmiş ortaç: fini')
    expect(t).toContain('13.10.2026')
    expect(t).toContain("j'ai fini")
    expect(t).toContain('nous finirons')
    expect(t).toContain('Haber kipi')
    expect(t).toContain('Emir kipi')
    // One box per tense, none split across pages.
    expect(html.match(/<section class="t">/g)).toHaveLength(LAB_TENSES.fr.length)
    expect(html).toContain('break-inside: avoid')
    expect(html).toContain('@page { size: A4')
  })

  it('writes the reflexive and negative forms the lab was showing, and says so', () => {
    const html = verbSheetHtml({ language: 'es', verb: 'levantarse', entry: entry('es', 'levantarse'), available: LAB_TENSES.es, reflexive: true, negative: true })
    const t = text(html)
    expect(t).toContain('dönüşlü, olumsuz biçim')
    expect(t).toContain('no me levanto')
  })

  it('escapes what it writes, and leaves out the tenses the verb does not have', () => {
    const html = verbSheetHtml({ language: 'es', verb: '<b>x</b>', entry: entry('es', 'hablar'), available: ['presente'] })
    expect(html).not.toContain('<b>x</b>')
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;')
    expect(html.match(/<section class="t">/g)).toHaveLength(1)
  })
})
