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
const toggle = (host: HTMLElement) => [...host.querySelectorAll<HTMLInputElement>('input[type=checkbox], [role=switch]')].find((el) => el.closest('label, div')?.textContent?.includes('Cümlede boşluğu yazarak'))!

describe('AnswerSettings: the typed blank', () => {
  it('is on by default and a tap turns the question type off', async () => {
    const onChange = vi.fn()
    const host = await mount({ ...DEFAULT_SETTINGS }, onChange)
    expect(host.textContent).toContain('Cümlede boşluğu yazarak doldurma soruları')
    const el = toggle(host)
    expect(el).toBeTruthy()
    await act(async () => el.click())
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ typedBlanks: false }))
  })
})
