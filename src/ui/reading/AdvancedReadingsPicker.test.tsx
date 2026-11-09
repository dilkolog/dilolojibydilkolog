// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AdvancedReadingsPicker } from './AdvancedReadingsPicker'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('AdvancedReadingsPicker', () => {
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

  it('lists the texts of the language, filters by level and opens one', () => {
    const onRead = vi.fn()
    act(() => {
      root.render(<AdvancedReadingsPicker language="fr" vocabulary={[]} states={[]} known={new Set()} onRead={onRead} />)
    })
    expect(rootEl.textContent).toContain('İleri düzey okumalar')
    expect(rootEl.textContent).toContain('Éloge de la lenteur')
    const all = rootEl.querySelectorAll('ul.library button.library-open').length
    const c1 = [...rootEl.querySelectorAll('button.chip')].find((b) => b.textContent?.startsWith('C1')) as HTMLButtonElement
    act(() => c1.click())
    const onlyC1 = rootEl.querySelectorAll('ul.library button.library-open').length
    expect(onlyC1).toBeGreaterThan(0)
    expect(onlyC1).toBeLessThan(all)
    act(() => (rootEl.querySelector('ul.library button.library-open') as HTMLButtonElement).click())
    expect(onRead).toHaveBeenCalledTimes(1)
    expect(onRead.mock.calls[0][2]).toContain('C1')
  })
})
