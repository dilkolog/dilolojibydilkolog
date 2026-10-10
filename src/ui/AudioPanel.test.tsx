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

  it('goes on from where the recording was left, says so, and "Baştan başla" goes back', () => {
    localStorage.clear()
    localStorage.setItem('diloloji:audio-pos:text-1', '300')
    act(() => root.render(<AudioPanel src="https://example.invalid/a.mp3" hidden={false} onHidden={() => {}} resumeKey="text-1" />))
    const audio = rootEl.querySelector('audio')!
    Object.defineProperty(audio, 'duration', { value: 660, configurable: true })
    act(() => {
      audio.dispatchEvent(new Event('loadedmetadata'))
    })
    expect(audio.currentTime).toBe(298)
    expect(rootEl.textContent).toContain('Kaldığın yerden devam ediyor (4:58)')
    act(() => {
      ;[...rootEl.querySelectorAll('button')].find((b) => b.textContent === 'Baştan başla')!.click()
    })
    expect(audio.currentTime).toBe(0)
    expect(localStorage.getItem('diloloji:audio-pos:text-1')).toBeNull()
    expect(rootEl.textContent).not.toContain('Kaldığın yerden')
  })

  it('keeps the place every few seconds, and lets it go near the end', () => {
    localStorage.clear()
    act(() => root.render(<AudioPanel src="https://example.invalid/a.mp3" hidden={false} onHidden={() => {}} resumeKey="text-2" />))
    const audio = rootEl.querySelector('audio')!
    Object.defineProperty(audio, 'duration', { value: 100, configurable: true })
    const at = (t: number) =>
      act(() => {
        audio.currentTime = t
        audio.dispatchEvent(new Event('timeupdate'))
      })
    at(40)
    expect(localStorage.getItem('diloloji:audio-pos:text-2')).toBe('40')
    at(41)
    expect(localStorage.getItem('diloloji:audio-pos:text-2')).toBe('40') // less than three seconds on
    at(95)
    expect(localStorage.getItem('diloloji:audio-pos:text-2')).toBeNull()
  })
})
