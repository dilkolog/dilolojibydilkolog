// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Song } from './songFetch'

const SONG: Song = {
  id: 'abc12345678',
  title: 'Non, je ne regrette rien',
  channel: 'Edith',
  auto: false,
  lines: [
    { start: 1, end: 4, text: 'Non rien de rien' },
    { start: 5, end: 8, text: 'Je ne regrette rien' },
    { start: 9, end: 12, text: 'Ni le bien qu’on m’a fait' },
    { start: 13, end: 16, text: 'Ni le mal tout ça m’est bien égal' },
  ],
}
let result: { song: Song } | { note: string } = { song: SONG }
vi.mock('./songFetch', async (orig) => ({ ...(await orig<typeof import('./songFetch')>()), fetchSong: async () => result }))
const saved: { text: string; source?: string }[] = []
vi.mock('../saveSentence', () => ({ saveSentence: async (s: { text: string; source?: string }) => (saved.push(s), true) }))
const { SongGame } = await import('./SongGame')

let root: ReturnType<typeof createRoot> | undefined
beforeEach(() => {
  // The player is a real page in a browser; here it must not try the network.
  ;(window as unknown as { happyDOM: { settings: { disableIframePageLoading: boolean } } }).happyDOM.settings.disableIframePageLoading = true
  result = { song: SONG }
  saved.length = 0
  localStorage.clear()
})
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
})

const type = async (el: HTMLInputElement, value: string) =>
  act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(el, value)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
const button = (host: HTMLElement, text: string) => [...host.querySelectorAll('button')].find((b) => b.textContent?.includes(text))!

async function open() {
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root!.render(<SongGame language="fr" onExit={() => {}} />))
  await type(host.querySelector('input[aria-label="YouTube bağlantısı"]')!, 'https://www.youtube.com/watch?v=abc12345678')
  await act(async () => button(host, 'Şarkıyı aç').click())
  return host
}

describe('SongGame', () => {
  it('says what is wrong with the link, or why a video has no captions', async () => {
    const host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    await act(async () => root!.render(<SongGame language="fr" onExit={() => {}} />))
    await type(host.querySelector('input[aria-label="YouTube bağlantısı"]')!, 'merhaba')
    await act(async () => button(host, 'Şarkıyı aç').click())
    expect(host.querySelector('[role=alert]')?.textContent).toContain('YouTube bağlantısı')
    result = { note: 'Bu videoda Fransızca altyazı yok.' }
    await type(host.querySelector('input[aria-label="YouTube bağlantısı"]')!, 'https://youtu.be/abc12345678')
    await act(async () => button(host, 'Şarkıyı aç').click())
    expect(host.querySelector('[role=alert]')?.textContent).toContain('altyazı yok')
  })

  it('opens the song with a gap in each line, plays one line on its own, and checks a page', async () => {
    const host = await open()
    expect(host.querySelector('h1')?.textContent).toBe('Non, je ne regrette rien')
    const inputs = host.querySelectorAll<HTMLInputElement>('.song-input')
    expect(inputs.length).toBeGreaterThanOrEqual(2)
    // A line's play button points the player at that line.
    await act(async () => (host.querySelector('button[aria-label="2. satırı çal"]') as HTMLButtonElement).click())
    expect(host.querySelector('iframe')!.getAttribute('src')).toMatch(/start=4&end=9&autoplay=1/)
    // "Je ne regrette rien": the longest word is the gap.
    await type(host.querySelector('input[aria-label="2. satır, 1. boşluk"]')!, 'regrette')
    await act(async () => button(host, 'Bu sayfayı kontrol et').click())
    expect(host.querySelector('input[aria-label="2. satır, 1. boşluk"]')!.className).toContain('song-correct')
    expect(host.textContent).toContain('Şarkı bitti')
    expect(host.textContent).toMatch(/Bu sayfa: 1\/\d doğru/)
  })

  it('keeps the lines with a wrong gap as sentence cards, once', async () => {
    const host = await open()
    await act(async () => button(host, 'Bu sayfayı kontrol et').click())
    await act(async () => button(host, 'Yanlış satırları cümle kartı yap').click())
    await act(async () => void (await new Promise((r) => setTimeout(r, 20))))
    expect(saved.length).toBeGreaterThanOrEqual(2)
    expect(saved.map((x) => x.text)).toContain('Je ne regrette rien')
    expect(saved.every((x) => x.source === 'Non, je ne regrette rien')).toBe(true)
    expect(button(host, 'Yanlış satırları cümle kartı yap')).toBeUndefined()
  })
})
