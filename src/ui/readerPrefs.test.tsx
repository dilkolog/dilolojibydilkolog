// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it } from 'vitest'
import { ReaderViewMenu } from './readerPrefs'
import type { ReaderPrefs } from './readerSettings'

let root: ReturnType<typeof createRoot> | undefined
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
})

const START = { size: 1, airy: false, sans: false, sepia: false, width: 1 } as ReaderPrefs
function Harness({ seen }: { seen: ReaderPrefs[] }) {
  const [prefs, setPrefs] = useState(START)
  seen.push(prefs)
  return <ReaderViewMenu prefs={prefs} onChange={setPrefs} />
}

describe('the reading look menu', () => {
  it('keeps the look behind one button, and changes it from the panel', () => {
    const seen: ReaderPrefs[] = []
    const host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    act(() => root!.render(<Harness seen={seen} />))
    expect(host.querySelector('[role=group]')).toBeNull()
    const trigger = [...host.querySelectorAll('button')].find((b) => b.textContent?.includes('Görünüm'))!
    act(() => trigger.click())
    expect(host.querySelector('[role=dialog]')?.getAttribute('aria-label')).toBe('Okuma görünümü')
    act(() => host.querySelector<HTMLButtonElement>('[aria-label="Yazıyı büyüt"]')!.click())
    act(() => [...host.querySelectorAll('button')].find((b) => b.textContent === 'Sepya')!.click())
    act(() => [...host.querySelectorAll('button')].find((b) => b.textContent === 'Geniş')!.click())
    const last = seen[seen.length - 1]
    expect(last.size).toBe(2)
    expect(last.sepia).toBe(true)
    expect(last.width).toBe(2)
  })
})
