// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StorybooksPicker } from './StorybooksPicker'

describe('StorybooksPicker', () => {
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

  it('renders English storybooks and allows selecting one', async () => {
    const onRead = vi.fn()

    await act(async () => {
      root.render(
        <StorybooksPicker
          language="en"
          vocabulary={[]}
          states={[]}
          known={new Set()}
          onRead={onRead}
        />
      )
    })

    // Storybook verilerinin asenkron yüklenmesini bekle
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })

    const title = rootEl.querySelector('.section-title, [class*="source-title"]')
    expect(title?.textContent).toContain('Kolay resimli hikâyeler')

    const firstItem = rootEl.querySelector('ul.library li button') as HTMLButtonElement | null
    expect(firstItem).not.toBeNull()

    await act(async () => {
      firstItem?.click()
    })

    expect(onRead).toHaveBeenCalled()
    expect(onRead.mock.calls[0][0].language).toBe('en')
  })
})
