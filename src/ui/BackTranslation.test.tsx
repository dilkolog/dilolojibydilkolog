// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { db } from '../data/instance'
import { BackTranslation } from './BackTranslation'

let root: ReturnType<typeof createRoot> | undefined
const ago = (h: number) => new Date(Date.now() - h * 3600_000).toISOString()

beforeEach(async () => {
  await db.meta.delete('sentences')
  await db.saveTranslations([
    { text: 'Nous partons tôt demain.', translation: 'Yarın erken yola çıkıyoruz.', from: 'fr', to: 'tr', at: ago(1) },
    { text: 'Le chat dort sur le canapé.', translation: 'Kedi kanepede uyuyor.', from: 'fr', to: 'tr', at: ago(30) },
  ])
})
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
})

const wait = () => act(async () => void (await new Promise((r) => setTimeout(r, 60))))
async function mount() {
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root!.render(<BackTranslation language="fr" onExit={() => {}} />))
  await wait()
  return host
}
const chip = (host: HTMLElement, text: string) => [...host.querySelectorAll<HTMLButtonElement>('.chip')].find((b) => b.textContent?.includes(text))!

describe('BackTranslation loop', () => {
  it('starts with what was translated on an earlier day, and "Hepsi" brings the fresh ones back, newest first', async () => {
    const host = await mount()
    expect(host.textContent).toContain('1 / 1')
    expect(host.querySelector('.prompt-text')?.textContent).toBe('Kedi kanepede uyuyor.')
    expect(host.textContent).toContain('döngü')
    expect(chip(host, 'Önceki günlerin').getAttribute('aria-pressed')).toBe('true')
    await act(async () => chip(host, 'Hepsi').click())
    expect(host.textContent).toContain('1 / 2')
    expect(host.querySelector('.prompt-text')?.textContent).toBe('Yarın erken yola çıkıyoruz.')
  })

  it('has no loop switch while everything is fresh', async () => {
    await db.saveTranslations([{ text: 'Nous partons tôt demain.', translation: 'Yarın erken yola çıkıyoruz.', from: 'fr', to: 'tr', at: ago(1) }])
    const host = await mount()
    expect(host.textContent).toContain('1 / 1')
    expect(host.querySelector('.chip')).toBeNull()
    expect(host.textContent).not.toContain('döngü')
  })
})
