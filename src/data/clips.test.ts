// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fetchClips } from './clips'

const CLIP = { id: 'abc12345678', title: 'Un jour', channel: 'C', start: 1, end: 3, text: 'Il faut décider.', form: 'décider' }

describe('asking for clips of a word', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.unstubAllGlobals())

  it('asks the server once and keeps the answer for a week', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ clips: [CLIP] })))
    vi.stubGlobal('fetch', fetchMock)
    const t0 = 1_000_000
    expect(await fetchClips('Décider', 'fr', t0)).toEqual([CLIP])
    expect(await fetchClips('décider', 'fr', t0 + 3 * 24 * 3600 * 1000)).toEqual([CLIP])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await fetchClips('décider', 'fr', t0 + 8 * 24 * 3600 * 1000)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('says why it could not: no key, quota, or YouTube down', async () => {
    for (const [status, problem] of [[501, 'nokey'], [429, 'quota'], [502, 'unavailable']] as const) {
      vi.stubGlobal('fetch', async () => new Response('{}', { status }))
      await expect(fetchClips('décider', 'fr')).rejects.toMatchObject({ problem })
    }
    vi.stubGlobal('fetch', async () => {
      throw new Error('offline')
    })
    await expect(fetchClips('décider', 'fr')).rejects.toMatchObject({ problem: 'unavailable' })
  })

  it('does not keep a failure', async () => {
    vi.stubGlobal('fetch', async () => new Response('{}', { status: 429 }))
    await expect(fetchClips('décider', 'fr')).rejects.toBeTruthy()
    const ok = vi.fn(async () => new Response(JSON.stringify({ clips: [] })))
    vi.stubGlobal('fetch', ok)
    expect(await fetchClips('décider', 'fr')).toEqual([])
    expect(ok).toHaveBeenCalledTimes(1)
  })
})
