// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AudioPanel } from './Listening'

describe('AudioPanel', () => {
  let rootEl: HTMLDivElement
  let root: ReturnType<typeof createRoot>
  beforeEach(() => {
    rootEl = document.createElement('div')
    document.body.appendChild(rootEl)
    root = createRoot(rootEl)
  })
  afterEach(() => {
    act(() => root.unmount())
    rootEl.remove()
  })

  it('says so when the audio cannot be loaded, and stops saying it once the audio is there', () => {
    act(() => root.render(<AudioPanel src="https://example.invalid/missing.mp3" hidden={false} onHidden={() => {}} follow="approx" />))
    const audio = rootEl.querySelector('audio')!
    expect(rootEl.textContent).not.toContain('Ses yüklenemedi')
    act(() => {
      audio.dispatchEvent(new Event('error'))
    })
    expect(rootEl.textContent).toContain('Ses yüklenemedi')
    act(() => {
      audio.dispatchEvent(new Event('loadedmetadata'))
    })
    expect(rootEl.textContent).not.toContain('Ses yüklenemedi')
  })
})
