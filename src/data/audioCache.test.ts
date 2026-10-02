import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cacheAudio, cacheKey, cachedAudio, isCacheMedia } from './audioCache'
import { db } from './instance'

describe('native audio kept on the device', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('downloads once, plays from the device after, and stays out of backups', async () => {
    const url = 'https://upload.wikimedia.org/x/Fr-maison.ogg.mp3'
    const fetchMock = vi.fn(async () => new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'audio/mpeg' } }))
    vi.stubGlobal('fetch', fetchMock)
    vi.stubGlobal('URL', Object.assign(URL, { createObjectURL: () => 'blob:local' }))
    expect(await cachedAudio(url)).toBeUndefined()
    expect(await cacheAudio(url)).toBe(true)
    expect(await cacheAudio(url)).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect((await db.media.get(cacheKey(url)))?.type).toBe('audio/mpeg')
    expect(await cachedAudio(url)).toBe('blob:local')
    expect(isCacheMedia(cacheKey(url))).toBe(true)
    expect(isCacheMedia('tts:abc')).toBe(true)
    expect(isCacheMedia('img-123')).toBe(false)
  })

  it('reports failure when the host refuses', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('CORS')
    })
    expect(await cacheAudio('https://audio.tatoeba.org/sentences/fra/1.mp3')).toBe(false)
  })
})
