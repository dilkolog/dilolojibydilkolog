import { afterEach, describe, expect, it, vi } from 'vitest'
import { searchImages } from './imageSearch'

const commons = { query: { pages: { a: { title: 'File:House.jpg', index: 1, imageinfo: [{ thumburl: 'https://upload.wikimedia.org/h.jpg', extmetadata: { Artist: { value: '<a>Ann</a>' }, LicenseShortName: { value: 'CC BY-SA 4.0' } } }] } } } }
const openverse = { results: [{ id: '1', title: 'Mystery house', creator: 'Ed', license: 'by-nc-sa', license_version: '2.0', thumbnail: 'https://api.openverse.org/v1/images/1/thumb/', provider: 'flickr' }] }

describe('image search', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('interleaves Openverse and Commons, with credits', async () => {
    vi.stubGlobal('fetch', async (url: string) => new Response(JSON.stringify(url.includes('openverse') ? openverse : commons)))
    const r = await searchImages('house')
    expect(r.map((x) => x.thumbUrl)).toEqual(['https://api.openverse.org/v1/images/1/thumb/', 'https://upload.wikimedia.org/h.jpg'])
    expect(r[0].credit).toBe('Ed, CC BY-NC-SA 2.0 (Openverse · flickr)')
    expect(r[1].credit).toBe('Ann, CC BY-SA 4.0 (Wikimedia Commons)')
  })

  it('keeps one source when the other fails', async () => {
    vi.stubGlobal('fetch', async (url: string) => (url.includes('openverse') ? new Response('', { status: 429 }) : new Response(JSON.stringify(commons))))
    expect(await searchImages('house')).toHaveLength(1)
  })
})
