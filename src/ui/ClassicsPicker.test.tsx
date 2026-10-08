// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ClassicsPicker } from './ClassicsPicker'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('ClassicsPicker', () => {
  let rootEl: HTMLDivElement
  let root: ReturnType<typeof createRoot>

  beforeEach(() => {
    rootEl = document.createElement('div')
    document.body.appendChild(rootEl)
    root = createRoot(rootEl)
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    rootEl.remove()
  })

  it('renders classic readings for the language and handles click', () => {
    const onRead = vi.fn()
    const onAddAll = vi.fn()

    act(() => {
      root.render(
        <ClassicsPicker
          language="en"
          vocabulary={[]}
          states={[]}
          known={new Set()}
          onRead={onRead}
          onAddAll={onAddAll}
        />,
      )
    })

    expect(rootEl.textContent).toContain('Klasik masallar ve öyküler')
    expect(rootEl.textContent).toContain('The Tortoise and the Hare')
    expect(rootEl.textContent).toContain('Aesop')

    // Find and click the first reading item
    const firstItem = rootEl.querySelector('ul.library button.library-open') as HTMLButtonElement
    expect(firstItem).not.toBeNull()
    act(() => {
      firstItem.click()
    })

    expect(onRead).toHaveBeenCalledTimes(1)
    expect(onRead).toHaveBeenCalledWith('The Tortoise and the Hare', expect.stringContaining('Hare was making fun'), 'Klasik Koleksiyon: Aesop')

    // Test onAddAll button
    const addAllBtn = Array.from(rootEl.querySelectorAll('button')).find((b) => b.textContent?.includes('Tümünü kütüphaneye ekle'))
    expect(addAllBtn).toBeDefined()
    act(() => {
      addAllBtn?.click()
    })
    expect(onAddAll).toHaveBeenCalledTimes(1)
    expect(onAddAll.mock.calls[0][0].length).toBeGreaterThan(0)
  })

  it('filters by category chip', () => {
    act(() => {
      root.render(
        <ClassicsPicker
          language="en"
          vocabulary={[]}
          states={[]}
          known={new Set()}
          onRead={vi.fn()}
        />,
      )
    })

    // Initially shows all (Aesop and Oscar Wilde)
    expect(rootEl.textContent).toContain('The Tortoise and the Hare')
    expect(rootEl.textContent).toContain('The Happy Prince')

    // Click "Kısa Öykü" category chip
    const storyChip = Array.from(rootEl.querySelectorAll('button.chip')).find((b) => b.textContent?.includes('Kısa Öykü')) as HTMLButtonElement | undefined
    expect(storyChip).toBeDefined()
    act(() => {
      storyChip?.click()
    })

    // Now should only show The Happy Prince
    expect(rootEl.textContent).not.toContain('The Tortoise and the Hare')
    expect(rootEl.textContent).toContain('The Happy Prince')
  })
})
