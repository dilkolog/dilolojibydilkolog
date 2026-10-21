// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const spoken: string[] = []
vi.mock('./speech', () => ({
  speakAsync: async (text: string, lang: string) => void spoken.push(`${lang}:${text}`),
  speakTurkishAsync: async (text: string) => void spoken.push(`tr:${text}`),
}))
vi.mock('./useTranslationReady', () => ({ useTranslationReady: () => true }))
vi.mock('../data/translate', () => ({
  translate: async () => 'Evde kalıyorum.',
  TranslateError: class extends Error {},
}))

const { SentenceTranslation } = await import('./TranslateButton')

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
let root: Root | null = null
let host: HTMLElement
const button = (text: string) => [...host.querySelectorAll('button')].find((b) => b.textContent?.includes(text)) as HTMLButtonElement | undefined

beforeEach(async () => {
  spoken.length = 0
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root!.render(<SentenceTranslation sentence="Je reste à la maison." from="fr" />))
})
afterEach(() => {
  act(() => root?.unmount())
  root = null
  document.body.innerHTML = ''
})

describe('SentenceTranslation', () => {
  it('shows the Turkish on request and then lets it be heard, alone or after the sentence', async () => {
    expect(host.querySelector('.sentence-tr')).toBeNull()
    await act(async () => button('Cümlenin Türkçesi')!.click())
    expect(host.querySelector('.sentence-tr')?.textContent).toBe('Evde kalıyorum.')
    await act(async () => button('Türkçesini dinle')!.click())
    expect(spoken).toEqual(['tr:Evde kalıyorum.'])
    spoken.length = 0
    await act(async () => button('Cümle, sonra Türkçesi')!.click())
    expect(spoken).toEqual(['fr:Je reste à la maison.', 'tr:Evde kalıyorum.'])
  })
})
