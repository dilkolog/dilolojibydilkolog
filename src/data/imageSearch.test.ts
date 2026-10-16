// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getPixabayKey, searchImages, setPixabayKey } from './imageSearch'

const commons = { query: { pages: { a: { title: 'File:House.jpg', index: 1, imageinfo: [{ thumburl: 'https://upload.wikimedia.org/h.jpg', extmetadata: { Artist: { value: '<a>Ann</a>' }, LicenseShortName: { value: 'CC BY-SA 4.0' } } }] } } } }
const openverse = { results: [{ id: '1', title: 'Mystery house', creator: 'Ed', license: 'by-nc-sa', license_version: '2.0', thumbnail: 'https://api.openverse.org/v1/images/1/thumb/', provider: 'flickr' }] }
const pixabay = {
  hits: [
    {
      id: 101,
      webformatURL: 'https://pixabay.com/photo/101_640.jpg',
      previewURL: 'https://pixabay.com/photo/101_150.jpg',
      tags: 'cozy house, modern architecture',
      user: 'ArchitectPro',
    },
  ],
}

describe('image search', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    localStorage.clear()
  })

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

  it('filters out noisy band or census titles from Commons unless explicitly searched', async () => {
    const noisyCommons = {
      query: {
        pages: {
          a: { title: 'File:Nephew (Band) Live.jpg', index: 1, imageinfo: [{ thumburl: 'https://upload.wikimedia.org/band.jpg' }] },
          b: { title: 'File:Cute nephew smiling.jpg', index: 2, imageinfo: [{ thumburl: 'https://upload.wikimedia.org/boy.jpg', extmetadata: { Artist: { value: 'John' }, LicenseShortName: { value: 'CC BY 2.0' } } }] },
        },
      },
    }
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify(noisyCommons)))
    const r = await searchImages('nephew')
    expect(r).toHaveLength(1)
    expect(r[0].title).toBe('Cute nephew smiling')
  })

  it('manages Pixabay API key storage cleanly', () => {
    expect(getPixabayKey()).toBeNull()
    setPixabayKey('12345-abcde')
    expect(getPixabayKey()).toBe('12345-abcde')
    setPixabayKey(null)
    expect(getPixabayKey()).toBeNull()
  })

  it('prioritizes Pixabay results when an API key is configured', async () => {
    setPixabayKey('test-pixabay-key')
    vi.stubGlobal('fetch', async (url: string) => {
      if (url.includes('pixabay.com')) {
        return new Response(JSON.stringify(pixabay))
      }
      return new Response(JSON.stringify(commons))
    })

    const r = await searchImages('house')
    expect(r).toHaveLength(1)
    expect(r[0].thumbUrl).toBe('https://pixabay.com/photo/101_640.jpg')
    expect(r[0].credit).toBe('ArchitectPro (Pixabay)')
  })

  it('falls back to Commons/Openverse when Pixabay throws an error', async () => {
    setPixabayKey('test-pixabay-key')
    vi.stubGlobal('fetch', async (url: string) => {
      if (url.includes('pixabay.com')) {
        return new Response('Unauthorized', { status: 401 })
      }
      if (url.includes('openverse')) {
        return new Response(JSON.stringify(openverse))
      }
      return new Response(JSON.stringify(commons))
    })

    const r = await searchImages('house')
    expect(r.length).toBeGreaterThanOrEqual(1)
    expect(r[0].credit).toContain('Openverse')
  })
})
