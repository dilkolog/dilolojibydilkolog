// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { FocusLine } from './HomeParts'

describe('FocusLine', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>

  const lists = [
    { id: 'list-1', name: 'Seyahat', count: 12 },
    { id: 'list-2', name: 'İş Dünyası', count: 25 },
  ]

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  it('renders trigger button with all words and opens custom popover menu', async () => {
    const onFocusList = vi.fn()
    const onOpenLists = vi.fn()

    await act(async () => {
      root.render(
        <FocusLine
          done={false}
          lists={lists}
          onFocusList={onFocusList}
          onOpenLists={onOpenLists}
        />,
      )
    })

    const button = container.querySelector('.hero-list-btn') as HTMLButtonElement
    expect(button).toBeTruthy()
    expect(button.textContent).toContain('tüm kelimelerin')

    // Click to open popover
    await act(async () => {
      button.click()
    })

    const menuItems = container.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')
    expect(menuItems.length).toBe(4) // "Tüm kelimelerin", list-1, list-2, "Listeleri yönet"

    // First item is "Tüm kelimelerin" and is selected
    expect(menuItems[0].textContent).toContain('Tüm kelimelerin')
    expect(menuItems[0].getAttribute('aria-selected')).toBe('true')
    expect(menuItems[0].classList.contains('is-selected')).toBe(true)

    // Second item is list-1 and is not selected
    expect(menuItems[1].textContent).toContain('Seyahat')
    expect(menuItems[1].getAttribute('aria-selected')).toBe('false')

    // Selecting list-1 calls onFocusList
    await act(async () => {
      menuItems[1].click()
    })
    expect(onFocusList).toHaveBeenCalledWith('list-1')
  })

  it('displays active list name and allows switching back to all words', async () => {
    const onFocusList = vi.fn()

    await act(async () => {
      root.render(
        <FocusLine
          done={false}
          lists={lists}
          focusListId="list-2"
          onFocusList={onFocusList}
        />,
      )
    })

    const button = container.querySelector('.hero-list-btn') as HTMLButtonElement
    expect(button.textContent).toContain('İş Dünyası (25)')

    // Click to open
    await act(async () => {
      button.click()
    })

    const menuItems = container.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')
    // list-2 should be selected
    const list2Item = Array.from(menuItems).find((item) => item.textContent?.includes('İş Dünyası'))
    expect(list2Item?.getAttribute('aria-selected')).toBe('true')

    // Click "Tüm kelimelerin"
    const allItem = Array.from(menuItems).find((item) => item.textContent?.includes('Tüm kelimelerin'))
    await act(async () => {
      allItem?.click()
    })
    expect(onFocusList).toHaveBeenCalledWith(null)
  })

  it('invokes onOpenLists when manage lists option is selected', async () => {
    const onFocusList = vi.fn()
    const onOpenLists = vi.fn()

    await act(async () => {
      root.render(
        <FocusLine
          done={false}
          lists={lists}
          onFocusList={onFocusList}
          onOpenLists={onOpenLists}
        />,
      )
    })

    const button = container.querySelector('.hero-list-btn') as HTMLButtonElement
    await act(async () => {
      button.click()
    })

    const manageItem = Array.from(container.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')).find((item) =>
      item.textContent?.includes('Listeleri yönet'),
    )
    expect(manageItem).toBeTruthy()

    await act(async () => {
      manageItem?.click()
    })
    expect(onOpenLists).toHaveBeenCalled()
  })
})
