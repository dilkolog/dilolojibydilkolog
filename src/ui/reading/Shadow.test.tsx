// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ShadowControls } from './Shadow'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

class FakeRecorder {
  static isTypeSupported() {
    return true
  }
  state = 'inactive'
  mimeType = 'audio/webm'
  ondataavailable: ((e: { data: Blob }) => void) | null = null
  onstop: (() => void) | null = null
  start() {
    this.state = 'recording'
  }
  stop() {
    this.state = 'inactive'
    this.ondataavailable?.({ data: new Blob(['x']) })
    this.onstop?.()
  }
}

describe('ShadowControls', () => {
  let el: HTMLDivElement
  let root: Root
  const stopped: string[] = []
  beforeEach(() => {
    stopped.length = 0
    const stream = { getTracks: () => [{ stop: () => stopped.push('stop') }] }
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia: async () => stream }, configurable: true })
    ;(globalThis as unknown as { MediaRecorder: unknown }).MediaRecorder = FakeRecorder
    ;(HTMLMediaElement.prototype as unknown as { canPlayType: () => string }).canPlayType = () => 'maybe'
    URL.createObjectURL = () => 'blob:x'
    URL.revokeObjectURL = () => {}
    el = document.createElement('div')
    document.body.append(el)
    root = createRoot(el)
  })
  afterEach(() => {
    act(() => root.unmount())
    el.remove()
  })
  const wait = (ms: number) => act(async () => void (await new Promise((r) => setTimeout(r, ms))))
  const press = (label: string) => act(async () => void [...el.querySelectorAll('button')].find((b) => b.textContent?.includes(label))!.dispatchEvent(new MouseEvent('click', { bubbles: true })))

  it('records again after a first recording ("Tekrar" used to hang on "Dinle…")', async () => {
    await act(async () => root.render(<ShadowControls hear={async () => {}} ms={50} />))
    await act(async () => void el.querySelector('button')!.dispatchEvent(new MouseEvent('click', { bubbles: true })))
    await wait(150)
    expect(el.textContent).toContain('Tekrar')
    await press('Tekrar')
    await wait(30)
    // The second press listens and records, not stuck before the recording starts.
    expect(el.textContent).not.toContain('Dinle…')
    await wait(150)
    expect(el.textContent).toContain('Tekrar')
    expect(stopped.length).toBe(2)
  })

  it('renders audio waveform bars during speaking phase', async () => {
    await act(async () => root.render(<ShadowControls hear={async () => {}} ms={500} />))
    await act(async () => void el.querySelector('button')!.dispatchEvent(new MouseEvent('click', { bubbles: true })))
    await wait(50)
    const waveform = el.querySelector('.shadow-waveform')
    expect(waveform).not.toBeNull()
    const bars = el.querySelectorAll('.shadow-wave-bar')
    expect(bars.length).toBe(5)
  })
})
