// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanWordForClips } from '../engine/clips'
import { ClipsSection } from './Clips'
import type { VocabularyEntry } from '../engine/types'

const ENTRY = {
  id: 'word-1',
  lemma: 'beau (bel, belle)',
  language: 'fr',
  senses: [{ id: 's1', gloss: 'güzel', examples: [] }],
} as unknown as VocabularyEntry

describe('cleanWordForClips', () => {
  it('strips articles, parentheticals, and slashes to isolate the searchable term', () => {
    expect(cleanWordForClips('la maison', 'fr')).toBe('maison')
    expect(cleanWordForClips('l\'amitié', 'fr')).toBe('amitié')
    expect(cleanWordForClips('beau (bel, belle)', 'fr')).toBe('beau')
    expect(cleanWordForClips('un ami / une amie; amitié', 'fr')).toBe('ami')
    expect(cleanWordForClips('grand, -e', 'fr')).toBe('grand')
    expect(cleanWordForClips('parler à qqn', 'fr')).toBe('parler à')
    expect(cleanWordForClips('el perro (m)', 'es')).toBe('perro')
    expect(cleanWordForClips('la manzana [f]', 'es')).toBe('manzana')
    expect(cleanWordForClips('take (sth) for granted', 'en')).toBe('take for granted')
  })
})

describe('ClipsSection', () => {
  let container: HTMLDivElement

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
  })

  afterEach(() => {
    container.remove()
    vi.unstubAllGlobals()
  })

  it('provides direct fallback links when no video clips are returned', async () => {
    vi.stubGlobal('fetch', async () => new Response(JSON.stringify({ clips: [] })))
    const root = createRoot(container)
    await act(async () => {
      root.render(<ClipsSection db={{} as any} entry={ENTRY} onChanged={() => {}} />)
    })

    const searchBtn = container.querySelector('button')
    expect(searchBtn?.textContent).toContain('Videolarda ara')

    await act(async () => {
      searchBtn?.click()
    })

    expect(container.textContent).toContain('Bu kelime için doğrudan altyazılı klip bulunamadı.')
    const links = [...container.querySelectorAll('a')]
    expect(links.some((a) => a.href.includes('youglish.com/pronounce/beau/french'))).toBe(true)
    expect(links.some((a) => a.href.includes('youtube.com/results?search_query=beau'))).toBe(true)
    act(() => root.unmount())
  })
})
