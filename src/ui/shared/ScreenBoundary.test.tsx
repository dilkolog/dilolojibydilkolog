// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import { ScreenBoundary } from './ScreenBoundary'
import { isChunkError } from './chunkError'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function Broken(): never {
  throw new Error('boom')
}

describe('screen boundary', () => {
  it('recognises a screen whose code failed to download', () => {
    expect(isChunkError(new TypeError('Failed to fetch dynamically imported module: /assets/Games-x.js'))).toBe(true)
    expect(isChunkError(new TypeError('Importing a module script failed.'))).toBe(true)
    expect(isChunkError(new Error('boom'))).toBe(false)
  })

  it('shows a way out instead of a blank screen, and clears when the screen changes', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const el = document.createElement('div')
    const root = createRoot(el)
    await act(async () => root.render(<ScreenBoundary resetKey="games" onHome={() => {}}><Broken /></ScreenBoundary>))
    expect(el.textContent).toContain('Bu ekran açılamadı')
    expect(el.textContent).toContain('boom')
    await act(async () => root.render(<ScreenBoundary resetKey="home" onHome={() => {}}><p>ana ekran</p></ScreenBoundary>))
    expect(el.textContent).toBe('ana ekran')
    root.unmount()
  })
})
