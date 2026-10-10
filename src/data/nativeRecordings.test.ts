import { beforeEach, describe, expect, it, vi } from 'vitest'

const pages: Record<'en' | 'fr', Map<string, string | null>> = { en: new Map(), fr: new Map() }
const asked: string[][] = []
vi.mock('./wiktionary', async (orig) => ({
  ...(await orig<typeof import('./wiktionary')>()),
  fetchPages: async (titles: string[], site: 'en' | 'fr' = 'en') => {
    if (site === 'fr') asked.push(titles)
    return new Map(titles.map((t) => [t, pages[site].get(t) ?? null]))
  },
}))
const { nativeRecordings } = await import('./wordInfo')

beforeEach(() => {
  pages.en.clear()
  pages.fr.clear()
  asked.length = 0
})

describe('nativeRecordings', () => {
  it('takes the English Wiktionary recordings, and asks the French one only for the words it has none for', async () => {
    pages.en.set('bon', '==French==\n===Pronunciation===\n{{audio|fr|Fr-bon.ogg|Audio}} {{audio|fr|LL-Q150 (fra)-A-bon.wav|Audio}}\n')
    pages.en.set('son', '==English==\n{{audio|en|En-son.ogg}}\n==French==\n{{fr-IPA}}\n')
    pages.fr.set('son', '== {{langue|fr}} ==\n{{écouter|France (Paris)|lang=fr|audio=Fr-son.ogg}}\n== {{langue|en}} ==\n{{écouter|lang=en|audio=En-son.ogg}}\n')
    const out = await nativeRecordings(['bon', 'son', 'rien'], 'fr')
    expect(out.get('bon')).toHaveLength(2)
    expect(out.get('son')).toHaveLength(1)
    expect(out.get('son')![0]).toContain('Fr-son.ogg')
    expect(out.has('rien')).toBe(false)
    expect(asked).toEqual([['son', 'rien']])
  })

  it('does not look at the French Wiktionary for other languages', async () => {
    await nativeRecordings(['vez'], 'es')
    expect(asked).toEqual([])
  })
})
