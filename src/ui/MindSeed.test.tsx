// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { MindSeed } from './MindSeed'

let root: ReturnType<typeof createRoot> | undefined
beforeEach(() => localStorage.clear())
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
})

async function mount(language: 'fr' | 'es' | 'en' = 'fr') {
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root!.render(<MindSeed language={language} />))
  return host
}
const button = (host: HTMLElement, text: string) => [...host.querySelectorAll('button')].find((b) => b.textContent?.includes(text))!
const prompt = (host: HTMLElement) => host.querySelector('.mind-seed p')!.textContent

describe('MindSeed', () => {
  it('switching the language starts that language\'s own day, not the other\'s state', async () => {
    const host = await mount('fr')
    await act(async () => button(host, 'Düşündüm').click())
    expect(host.textContent).toContain('Bugünün zihin tohumunu ektin')
    await act(async () => root!.render(<MindSeed language="es" />))
    expect(host.querySelector('.mind-seed')).not.toBeNull()
    expect(prompt(host)).toContain('İspanyolca')
  })

  it('shows a prompt in the language learned, and another on request', async () => {
    const host = await mount('es')
    const first = prompt(host)
    expect(first).toContain('İspanyolca')
    await act(async () => button(host, 'Başka bir tane').click())
    expect(prompt(host)).not.toBe(first)
  })

  it('"Düşündüm" closes it for the day, it stays closed after a reload, and can be shown again', async () => {
    let host = await mount()
    await act(async () => button(host, 'Düşündüm').click())
    expect(host.textContent).toContain('Bugünün zihin tohumunu ektin')
    expect(host.querySelector('.mind-seed')).toBeNull()
    act(() => root?.unmount())
    host.remove()
    host = await mount()
    expect(host.textContent).toContain('Bugünün zihin tohumunu ektin')
    await act(async () => button(host, 'Tekrar göster').click())
    expect(host.querySelector('.mind-seed')).not.toBeNull()
  })

  it('is per language', async () => {
    const fr = await mount('fr')
    await act(async () => button(fr, 'Düşündüm').click())
    act(() => root?.unmount())
    fr.remove()
    expect((await mount('en')).querySelector('.mind-seed')).not.toBeNull()
  })
})
