import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ContentManifest, PublishedGrammar, PublishedReading } from '../engine/contentTypes'
import { contentLevelOf, contentReadingText, contentTextId, grammarForIds, grammarForTopic, grammarTopics, loadManifest, readingPage, resetContentCache } from './content'

const text: PublishedReading = {
  id: 'fr-r-000001',
  language: 'fr',
  level: 'A1',
  theme: 'alisveris',
  genre: 'story',
  grammar: ['basics_fr_present'],
  title: 'Le marché',
  paragraphs: ['Léa va au marché.', 'Elle achète des pommes.'],
  tr: ['Léa pazara gider.', 'Elma alır.'],
  vocabulary: [{ word: 'marché', lemma: 'marché', tr: 'pazar' }],
  questions: [{ q: 'Léa nereye gider?', options: ['Pazara', 'Okula', 'Parka'], answer: 0, why: 'İlk cümle.' }],
}
const q = (id: string, topic: string): PublishedGrammar => ({ id, language: 'fr', level: 'A2', topic, type: 'cloze', prompt: 'Je ___.', answer: 'mange', explanation: 'Şimdiki zaman, birinci tekil kişi.', source: 'Diloloji (özgün)', difficulty: 1 })

const manifest: ContentManifest = {
  language: 'fr',
  version: 'v1',
  counts: { reading: { total: 1, byLevel: { A1: 1 }, byTheme: {}, byGenre: {} }, grammar: { total: 3, byTopic: { passe_imparfait: 2, futur_fr: 1 }, byLevel: {} } },
  reading: { A1: [{ path: 'reading/A1/1-aaaa.json', count: 1, bytes: 1, gzip: 1, ranges: [['fr-r-000001', 'fr-r-000001']] }] },
  grammar: {
    passe_imparfait: [{ path: 'grammar/passe_imparfait/1-bbbb.json', count: 2, bytes: 1, gzip: 1, ranges: [['fr-g-000001', 'fr-g-000002']] }],
    futur_fr: [{ path: 'grammar/futur_fr/1-cccc.json', count: 1, bytes: 1, gzip: 1, ranges: [['fr-g-000003', 'fr-g-000003']] }],
  },
  retired: ['fr-g-000002'],
}

const FILES: Record<string, unknown> = {
  '/content/fr/manifest.json': manifest,
  '/content/fr/reading/A1/1-aaaa.json': [text],
  '/content/fr/grammar/passe_imparfait/1-bbbb.json': [q('fr-g-000001', 'passe_imparfait'), q('fr-g-000002', 'passe_imparfait')],
  '/content/fr/grammar/futur_fr/1-cccc.json': [q('fr-g-000003', 'futur_fr')],
}

let calls: string[] = []
beforeEach(() => {
  resetContentCache()
  calls = []
  vi.stubGlobal('fetch', async (url: string) => {
    calls.push(url)
    const body = FILES[url]
    return body ? new Response(JSON.stringify(body), { status: 200 }) : new Response('<!doctype html>', { status: 200, headers: { 'content-type': 'text/html' } })
  })
})
afterEach(() => vi.unstubAllGlobals())

describe('content client', () => {
  it('loads the manifest once, and has none for a language without content', async () => {
    expect((await loadManifest('fr'))?.version).toBe('v1')
    await loadManifest('fr')
    expect(calls.filter((c) => c.endsWith('manifest.json'))).toHaveLength(1)
    // The app answers a missing file with its page (HTML): that is no manifest, and it is asked again later.
    expect(await loadManifest('es')).toBeNull()
    expect(await loadManifest('en')).toBeNull()
    expect(grammarTopics(manifest)).toEqual({ passe_imparfait: 2, futur_fr: 1 })
  })

  it('a text becomes a library text with its Turkish and its questions, under a fixed id', async () => {
    const [t] = await readingPage('fr', manifest, 'A1')
    const r = contentReadingText(t, new Date('2026-11-04T10:00:00Z'))
    expect(r.id).toBe(contentTextId('fr-r-000001'))
    expect(r.text).toBe('Léa va au marché.\n\nElle achète des pommes.')
    expect(r.turkish).toEqual(['Léa pazara gider.', 'Elma alır.'])
    expect(r.questions?.[0]).toEqual({ question: 'Léa nereye gider?', options: ['Pazara', 'Okula', 'Parka'], answer: 0, explanation: 'İlk cümle.' })
    expect(r.source).toContain('A1')
    // The level is read back from the saved text (a beginner's A1 text is a starter text).
    expect(contentLevelOf(r)).toBe('A1')
    expect(contentLevelOf({ source: 'https://example.com' })).toBeUndefined()
  })

  it('a topic brings its files, without retired questions or factory fields', async () => {
    const qs = await grammarForTopic('fr', manifest, 'passe_imparfait')
    expect(qs.map((x) => x.id)).toEqual(['fr-g-000001'])
    expect('difficulty' in qs[0]).toBe(false)
    expect(calls).not.toContain('/content/fr/grammar/futur_fr/1-cccc.json')
  })

  it('logged ids fetch only the files that hold them', async () => {
    const qs = await grammarForIds('fr', manifest, ['fr-g-000003', 'fr-x-old'])
    expect(qs.map((x) => x.id)).toEqual(['fr-g-000003'])
    expect(calls).toEqual(['/content/fr/grammar/futur_fr/1-cccc.json'])
  })

  it('a file that cannot be had throws for a topic and is skipped for review', async () => {
    vi.stubGlobal('fetch', async () => new Response('', { status: 503 }))
    await expect(grammarForTopic('fr', manifest, 'futur_fr')).rejects.toThrow()
    expect(await grammarForIds('fr', manifest, ['fr-g-000003'])).toEqual([])
  })
})
