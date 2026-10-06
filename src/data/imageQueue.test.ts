// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createEntry } from './wordInput'
import { imageCandidates, skipImage, skippedImages, suggestImages, wikidataFile } from './imageQueue'

const noun = (word: string, extra = {}) => ({ ...createEntry({ word, meaning: 'x', partOfSpeech: 'noun' }, 'fr', new Date()), ...extra })

describe('which words get a picture suggested', () => {
  it('concrete single nouns without one, most frequent first, minus skipped ones', () => {
    const list = [
      noun('chat', { frequencyRank: 900 }),
      noun('maison', { frequencyRank: 300 }),
      noun('arbre', { imageId: 'm1', frequencyRank: 100 }),
      { ...noun('courir'), partOfSpeech: 'verb' as const },
      noun('chemin de fer'),
      noun('zèbre'),
    ]
    expect(imageCandidates(list, new Set()).map((e) => e.lemma)).toEqual(['maison', 'chat', 'zèbre'])
    expect(imageCandidates(list, new Set([list[1].id])).map((e) => e.lemma)).toEqual(['chat', 'zèbre'])
  })

  it('remembers the words passed over', () => {
    localStorage.clear()
    skipImage('fr:chat')
    skipImage('fr:zèbre')
    expect([...skippedImages()].sort()).toEqual(['fr:chat', 'fr:zèbre'])
  })
})

const claim = (value: unknown) => [{ mainsnak: { datavalue: { value } } }]
const WIKIDATA = {
  search: { search: [{ id: 'Q1' }, { id: 'Q2' }, { id: 'Q3' }] },
  entities: {
    entities: {
      Q1: { claims: { P31: claim({ id: 'Q4167410' }), P18: claim('Disambiguation.jpg') } },
      Q2: { claims: { P31: claim({ id: 'Q3947' }) } },
      Q3: { claims: { P31: claim({ id: 'Q3947' }), P18: claim('Maison.jpg') } },
    },
  },
}
const COMMONS = { query: { pages: { a: { title: 'File:Maison.jpg', imageinfo: [{ thumburl: 'https://upload.wikimedia.org/m.jpg', extmetadata: { Artist: { value: '<a>Léa</a>' }, LicenseShortName: { value: 'CC BY-SA 4.0' } } }] } } } }
const OPENVERSE = { results: [{ id: '1', title: 'A house', creator: 'Ed', license: 'cc0', thumbnail: 'https://api.openverse.org/v1/images/1/thumb/' }] }

const respond = (url: string) => {
  const u = new URL(url)
  if (u.hostname === 'www.wikidata.org') return u.searchParams.get('action') === 'wbsearchentities' ? WIKIDATA.search : WIKIDATA.entities
  if (u.hostname === 'api.openverse.org') return OPENVERSE
  return COMMONS
}

describe('suggesting pictures', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('takes the picture of the first matching thing that has one, skipping disambiguation pages', async () => {
    vi.stubGlobal('fetch', async (url: string) => new Response(JSON.stringify(respond(url))))
    expect(await wikidataFile('maison', 'fr')).toBe('Maison.jpg')
  })

  it("puts Wikidata's picture first, with its credit, then search results, without repeats", async () => {
    vi.stubGlobal('fetch', async (url: string) => new Response(JSON.stringify(respond(url))))
    const r = await suggestImages({ language: 'fr', lemma: 'maison' })
    expect(r[0]).toMatchObject({ from: 'wikidata', thumbUrl: 'https://upload.wikimedia.org/m.jpg' })
    expect(r[0].credit).toBe('Léa, CC BY-SA 4.0 (Wikimedia Commons · Wikidata)')
    expect(r.map((x) => x.from)).toContain('search')
    expect(new Set(r.map((x) => x.thumbUrl)).size).toBe(r.length)
  })

  it('falls back to the search when Wikidata is down, and to nothing when everything is', async () => {
    vi.stubGlobal('fetch', async (url: string) => (new URL(url).hostname === 'www.wikidata.org' ? new Response('', { status: 503 }) : new Response(JSON.stringify(respond(url)))))
    const r = await suggestImages({ language: 'fr', lemma: 'maison' })
    expect(r.length).toBeGreaterThan(0)
    expect(r.every((x) => x.from === 'search')).toBe(true)
    vi.stubGlobal('fetch', async () => {
      throw new Error('offline')
    })
    expect(await suggestImages({ language: 'fr', lemma: 'maison' })).toEqual([])
  })
})
