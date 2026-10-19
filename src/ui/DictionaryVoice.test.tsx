// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ListenHandlers } from './speechInput'
import { DictionaryScreen } from './Dictionary'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
vi.stubGlobal('fetch', async () => new Response('[]', { status: 200, headers: { 'Content-Type': 'application/json' } }))

const heard = vi.hoisted(() => ({ handlers: undefined as unknown, available: true, stopped: 0 }))
vi.mock('./speechInput', () => ({
  canListen: () => heard.available,
  listen: (_language: string, h: unknown) => {
    heard.handlers = h
    return Object.assign(() => void heard.stopped++, { finish: () => {} })
  },
}))
vi.mock('../data/wordpack', async (importOriginal) => ({ ...(await importOriginal<typeof import('../data/wordpack')>()), loadPack: vi.fn(async () => undefined) }))

describe('saying a word to the dictionary', () => {
  let rootEl: HTMLDivElement
  let root: ReturnType<typeof createRoot>
  beforeEach(() => {
    heard.available = true
    rootEl = document.createElement('div')
    document.body.appendChild(rootEl)
    root = createRoot(rootEl)
  })
  afterEach(() => {
    act(() => root.unmount())
    rootEl.remove()
  })
  const mount = async () => {
    await act(async () => root.render(<DictionaryScreen language="fr" vocabulary={[]} onOpenWord={() => {}} onAdd={() => {}} />))
    await act(async () => void (await new Promise((r) => setTimeout(r, 30))))
  }

  it('puts what was heard into the search box, without the full stop speech recognition adds', async () => {
    await mount()
    const mic = rootEl.querySelector<HTMLButtonElement>('.search-mic')!
    expect(mic.getAttribute('aria-label')).toContain('Sesle ara')
    await act(async () => mic.click())
    expect(mic.getAttribute('aria-pressed')).toBe('true')
    const h = heard.handlers as ListenHandlers
    await act(async () => h.onInterim?.('Mais'))
    expect(rootEl.querySelector<HTMLInputElement>('input[type=search]')!.value).toBe('Mais')
    await act(async () => {
      h.onFinal(['Maison.'])
      h.onEnd?.()
    })
    expect(rootEl.querySelector<HTMLInputElement>('input[type=search]')!.value).toBe('maison')
    expect(mic.getAttribute('aria-pressed')).toBe('false')
  })

  it('has no microphone button where the browser cannot listen', async () => {
    heard.available = false
    await mount()
    expect(rootEl.querySelector('.search-mic')).toBeNull()
  })
})
