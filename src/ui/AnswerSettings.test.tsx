// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS, type Settings } from '../data/db'
import { AnswerSettings } from './AnswerSettings'

let root: ReturnType<typeof createRoot> | undefined
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
})

async function mount(settings: Settings, onChange: (s: Settings) => void) {
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root!.render(<AnswerSettings settings={settings} onChange={onChange} />))
  return host
}
const level = (host: HTMLElement, type: string, name: string) =>
  [...host.querySelectorAll<HTMLElement>(`[role=radiogroup][aria-label="${type}"] [role=radio]`)].find((b) => b.textContent === name)!

describe('AnswerSettings: question types', () => {
  it('lists the tunable question types, all normal at first', async () => {
    const host = await mount({ ...DEFAULT_SETTINGS }, vi.fn())
    expect(host.textContent).toContain('Soru türleri')
    expect(host.querySelector('[aria-label="Cümlede boşluğu yaz"] [aria-checked=true]')?.textContent).toBe('Normal')
    expect(host.textContent).not.toContain('Hepsini normale döndür')
  })

  it('turning a type off or down is saved, and the old typedBlanks switch is folded in', async () => {
    const onChange = vi.fn()
    const host = await mount({ ...DEFAULT_SETTINGS }, onChange)
    await act(async () => level(host, 'Cümlede boşluğu yaz', 'Hiç').click())
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ exercisePrefs: { cloze_typed: 'off' }, typedBlanks: true }))
    await act(async () => level(host, 'Duyduğun cümleyi yaz', 'Az').click())
    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ exercisePrefs: { dictation: 'less' } }))
  })

  it('shows the old setting (typedBlanks false) as "Hiç" and can put everything back to normal', async () => {
    const onChange = vi.fn()
    const host = await mount({ ...DEFAULT_SETTINGS, typedBlanks: false }, onChange)
    expect(host.querySelector('[aria-label="Cümlede boşluğu yaz"] [aria-checked=true]')?.textContent).toBe('Hiç')
    await act(async () => [...host.querySelectorAll('button')].find((b) => b.textContent === 'Hepsini normale döndür')!.click())
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ exercisePrefs: {}, typedBlanks: true }))
  })
})
