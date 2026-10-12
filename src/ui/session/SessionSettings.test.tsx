// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS, type Settings } from '../../data/db'
import { SessionSettings } from './SessionSettings'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('SessionSettings', () => {
  let el: HTMLDivElement
  let root: Root
  beforeEach(() => {
    el = document.createElement('div')
    document.body.append(el)
    root = createRoot(el)
  })
  afterEach(() => {
    act(() => root.unmount())
    el.remove()
  })
  const show = (props: Partial<Parameters<typeof SessionSettings>[0]> = {}) => {
    const onChange = vi.fn<(s: Settings) => void>()
    const onShorten = vi.fn()
    act(() => root.render(<SessionSettings settings={DEFAULT_SETTINGS} onChange={onChange} onClose={() => {}} onShorten={onShorten} {...props} />))
    return { onChange, onShorten }
  }
  const press = (name: string, within: ParentNode = el) => act(() => [...within.querySelectorAll('button')].find((b) => b.textContent?.trim() === name)!.click())

  it('turns down the kind of question on screen, from here', () => {
    const { onChange } = show({ questionType: 'cloze_typed' })
    const row = el.querySelector('[aria-label="Bu tür soru: Boşluğa yaz"], [role="group"][aria-label^="Bu tür soru"]') as HTMLElement
    expect(row).not.toBeNull()
    press('Az', row)
    expect(onChange.mock.calls.at(-1)![0].exercisePrefs).toEqual({ cloze_typed: 'less' })
    press('Hiç', row)
    expect(onChange.mock.calls.at(-1)![0].exercisePrefs).toEqual({ cloze_typed: 'off' })
  })

  it('has no such row for a question that cannot be turned down (the meaning choice)', () => {
    show({ questionType: 'mc_meaning' })
    expect(el.textContent).not.toContain('Bu tür soru')
  })

  it('shortens the session by what is left, only offering less than that', () => {
    const { onShorten } = show({ remaining: 12 })
    expect([...el.querySelectorAll('button')].map((b) => b.textContent?.trim()).filter((t) => t?.endsWith('soru daha'))).toEqual(['5 soru daha', '10 soru daha'])
    press('10 soru daha')
    expect(onShorten).toHaveBeenCalledWith(10)
  })

  it('offers no shortening when little is left', () => {
    show({ remaining: 4 })
    expect(el.textContent).not.toContain('Oturumu kısalt')
  })

  it('sets the auto-advance wait, the speaking rate and keeping the screen on', () => {
    const { onChange } = show()
    press('2 sn')
    expect(onChange.mock.calls.at(-1)![0].autoAdvance).toBe(2)
    press('1.1×')
    expect(onChange.mock.calls.at(-1)![0].speechRate).toBe(1.1)
    const awake = [...el.querySelectorAll('label.toggle-row')].find((l) => l.textContent?.includes('Ekranı açık tut'))!.querySelector('button')!
    act(() => awake.click())
    expect(onChange.mock.calls.at(-1)![0].keepAwake).toBe(false)
  })
})
