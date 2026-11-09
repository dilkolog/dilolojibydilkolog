// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PhotoText as Page, PhotoTextRequest } from '../../ai'
import type { AiFeature } from '../../ai/usage'
import { AiContext } from '../aiContext'

const requests: PhotoTextRequest[] = []
let pages: Page[] = []
vi.mock('../../ai', async (orig) => ({
  ...(await orig<typeof import('../../ai')>()),
  textFromPhoto: async (_key: string, req: PhotoTextRequest) => {
    requests.push(req)
    return pages.shift() ?? { found: false, title: '', text: '' }
  },
}))
vi.mock('../shared/downscaleImage', async (orig) => ({ ...(await orig<typeof import('../shared/downscaleImage')>()), downscaleImage: async () => new Blob(['jpeg-bytes'], { type: 'image/jpeg' }) }))
const { PhotoText, MAX_PAGES } = await import('./PhotoText')

let root: ReturnType<typeof createRoot> | undefined
beforeEach(() => {
  requests.length = 0
  pages = []
})
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
})

async function mount(apiKey: string | null, allows?: (f: AiFeature) => boolean) {
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  const got: { text: string; title: string }[] = []
  await act(async () =>
    root!.render(
      <AiContext.Provider value={{ apiKey, allows }}>
        <PhotoText language="fr" onText={(text, title) => got.push({ text, title })} />
      </AiContext.Provider>,
    ),
  )
  return { host, got }
}
const choose = async (host: HTMLElement, n: number) => {
  const input = host.querySelector<HTMLInputElement>('input[type=file]')!
  Object.defineProperty(input, 'files', { value: Array.from({ length: n }, (_, i) => new File(['x'], `page${i}.jpg`, { type: 'image/jpeg' })), configurable: true })
  await act(async () => void input.dispatchEvent(new Event('change', { bubbles: true })))
  await act(async () => void (await new Promise((r) => setTimeout(r, 60))))
}

describe('PhotoText', () => {
  it('is not shown without the AI, or when the account’s level does not open it', async () => {
    expect((await mount(null)).host.innerHTML).toBe('')
    act(() => root?.unmount())
    expect((await mount('account', (f) => f !== 'photo_text')).host.innerHTML).toBe('')
  })

  it('reads the pages in order into one text, titled by the first page', async () => {
    pages = [
      { found: true, title: 'Chapitre un', text: 'Il était une fois.' },
      { found: false, title: '', text: '' },
      { found: true, title: 'Suite', text: 'Fin du chapitre.' },
    ]
    const { host, got } = await mount('account')
    await choose(host, 3)
    expect(requests.map((r) => [r.language, r.mediaType])).toEqual([['fr', 'image/jpeg'], ['fr', 'image/jpeg'], ['fr', 'image/jpeg']])
    expect(got).toEqual([{ text: 'Il était une fois.\n\nFin du chapitre.', title: 'Chapitre un' }])
    expect(host.textContent).toContain('1 fotoğrafta metin bulunamadı')
  })

  it('reads at most a few pages at once, and says when nothing was found', async () => {
    const { host, got } = await mount('account')
    await choose(host, MAX_PAGES + 2)
    expect(requests.length).toBe(MAX_PAGES)
    expect(got).toEqual([])
    expect(host.querySelector('.error')?.textContent).toContain('okunacak bir metin bulunamadı')
  })
})
