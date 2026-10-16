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
  it('fetches learner news feed and presents the top article with Dinle ve Oku button', async () => {
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

    expect(host.textContent).toContain('Günün 2 Dakikalık Haberi')
    expect(host.textContent).toContain('Le sommet pour le climat à Paris')
    expect(host.textContent).toContain('Sesli dinleme')
    expect(host.textContent).toContain('Dinle ve Oku')

    const button = host.querySelector<HTMLButtonElement>('.daily-news-btn')
    expect(button).toBeTruthy()
    await act(async () => {
      button!.click()
    })

    expect(onOpen).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Le sommet pour le climat à Paris',
        audio: 'https://rfi.fr/audio/climat.mp3',
        language: 'fr',
      }),
    )
  })
})
