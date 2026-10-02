import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { db } from '../data/instance'
import { natural, naturalUrl } from './naturalVoice'

describe('natural voices', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('synthesizes once per text and voice, then serves the device cache, counting characters', async () => {
    natural.key = 'test-key'
    const fetchMock = vi.fn(async (url: string, _init?: RequestInit) => {
      if (url.includes('/voices')) return new Response(JSON.stringify({ voices: [{ name: 'fr-FR-Neural2-A', languageCodes: ['fr-FR'] }, { name: 'fr-FR-Standard-A', languageCodes: ['fr-FR'] }] }))
      return new Response(JSON.stringify({ audioContent: btoa('mp3-bytes') }))
    })
    vi.stubGlobal('fetch', fetchMock)
    const a = await naturalUrl('bonjour', 'fr', 0.9)
    const b = await naturalUrl('bonjour', 'fr', 0.9)
    expect(a).toBe(b)
    const synth = fetchMock.mock.calls.filter(([u]) => String(u).includes('text:synthesize'))
    expect(synth).toHaveLength(1)
    expect(JSON.parse((synth[0][1] as RequestInit).body as string).voice.name).toBe('fr-FR-Neural2-A')
    expect(Object.values(await db.getTtsUsage())).toEqual([7])
    expect((await db.media.toArray()).some((m) => m.id.startsWith('tts:'))).toBe(true)
  })
})
