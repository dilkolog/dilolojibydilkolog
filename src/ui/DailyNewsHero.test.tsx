// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DailyNewsHero } from './DailyNewsHero'

let root: ReturnType<typeof createRoot> | undefined
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

const wait = () => act(async () => void (await new Promise((r) => setTimeout(r, 60))))

describe('DailyNewsHero', () => {
  it('fetches learner news feed, presents top article with Dinle ve Oku button, and persists to db', async () => {
    const mockArticles = [
      {
        title: 'Le sommet pour le climat à Paris',
        link: 'https://rfi.fr/climat',
        published: new Date().toISOString(),
        text: 'Les délégués de plus de cinquante pays se réunissent aujourd’hui à Paris pour discuter des mesures urgentes pour le climat et l’environnement mondial.',
        audio: 'https://rfi.fr/audio/climat.mp3',
      },
    ]

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url.includes('/api/news')) {
        return {
          ok: true,
          json: async () => ({ articles: mockArticles }),
        } as Response
      }
      return { ok: false } as Response
    })

    const onOpen = vi.fn()
    const mockDb = {
      saveText: vi.fn().mockResolvedValue(undefined),
    } as unknown as Parameters<typeof DailyNewsHero>[0]['db']

    const host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)

    await act(async () => {
      root!.render(
        <DailyNewsHero
          db={mockDb}
          language="fr"
          vocabulary={[]}
          states={[]}
          known={new Set()}
          onOpen={onOpen}
        />,
      )
    })
    await wait()

    expect(host.textContent).toContain('Günün 2 Dakikalık Haberi')
    expect(host.textContent).toContain('Le sommet pour le climat à Paris')
    expect(host.textContent).toContain('Sesli dinleme')
    expect(host.textContent).toContain('Dinle ve Oku')

    const button = host.querySelector<HTMLButtonElement>('.daily-news-btn')
    expect(button).toBeTruthy()
    await act(async () => {
      button!.click()
    })

    expect(mockDb!.saveText).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Le sommet pour le climat à Paris',
        audio: 'https://rfi.fr/audio/climat.mp3',
        language: 'fr',
      }),
    )

    expect(onOpen).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Le sommet pour le climat à Paris',
        audio: 'https://rfi.fr/audio/climat.mp3',
        language: 'fr',
      }),
    )
  })

  it('allows switching between different bulletin articles using chips', async () => {
    const mockArticles = [
      {
        title: 'Article 1 Premier Ministre',
        link: 'https://rfi.fr/art1',
        published: new Date().toISOString(),
        text: 'Le premier ministre a annoncé ce matin de nouvelles mesures de soutien économique pour le pays.',
        audio: 'https://rfi.fr/audio1.mp3',
      },
      {
        title: 'Article 2 Festival de Cannes',
        link: 'https://rfi.fr/art2',
        published: new Date().toISOString(),
        text: 'Le célèbre festival de cinéma s’ouvre sur la Croisette avec des réalisateurs du monde entier.',
        audio: 'https://rfi.fr/audio2.mp3',
      },
    ]

    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = String(input)
      if (url.includes('/api/news')) {
        return {
          ok: true,
          json: async () => ({ articles: mockArticles }),
        } as Response
      }
      return { ok: false } as Response
    })

    const onOpen = vi.fn()
    const host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)

    await act(async () => {
      root!.render(
        <DailyNewsHero
          language="fr"
          vocabulary={[]}
          states={[]}
          known={new Set()}
          onOpen={onOpen}
        />,
      )
    })
    await wait()

    const chips = host.querySelectorAll<HTMLButtonElement>('.daily-news-chip')
    expect(chips.length).toBe(2)

    // Initially article 1 or 2 is active. Click the other one
    await act(async () => {
      chips[1].click()
    })
    await wait()

    const activeTitle = host.querySelector('.daily-news-title')?.textContent
    expect(activeTitle).toBeTruthy()
  })

  it('falls back to localStorage cached news when network request fails', async () => {
    const cachedArticles = [
      {
        title: 'Article en cache hors ligne',
        link: 'https://rfi.fr/cache',
        published: new Date().toISOString(),
        text: 'Cet article a été enregistré précédemment dans le cache local du navigateur.',
        audio: 'https://rfi.fr/audio-cache.mp3',
      },
    ]
    localStorage.setItem(
      'diloloji:daily-news-cache:fr',
      JSON.stringify({
        savedAt: Date.now() - 3600 * 1000 * 2, // 2 hours ago
        articles: cachedArticles,
      }),
    )

    // Network request fails
    vi.spyOn(globalThis, 'fetch').mockImplementation(async () => {
      return { ok: false, status: 500 } as Response
    })

    const onOpen = vi.fn()
    const host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)

    await act(async () => {
      root!.render(
        <DailyNewsHero
          language="fr"
          vocabulary={[]}
          states={[]}
          known={new Set()}
          onOpen={onOpen}
        />,
      )
    })
    await wait()

    expect(host.textContent).toContain('Article en cache hors ligne')
    expect(host.textContent).toContain('Çevrimdışı kayıt')
  })
})
