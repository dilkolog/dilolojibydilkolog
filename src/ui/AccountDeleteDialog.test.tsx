// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AccountDeleteDialog } from './AccountDeleteDialog'
import { DELETE_PHRASE, phraseMatches } from './deletePhrase'

describe('the phrase', () => {
  it('counts the typed phrase whatever the case, spacing or Turkish i', () => {
    for (const ok of ['hesabımı sil', 'HESABIMI SİL', 'HESABIMI SIL', '  Hesabımı   Sil ', 'hesabimi sil']) expect(phraseMatches(ok), ok).toBe(true)
    for (const no of ['', 'hesabımı', 'hesabım sil', 'sil', 'hesabimi silme']) expect(phraseMatches(no), no).toBe(false)
  })
})

describe('AccountDeleteDialog', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>

  beforeEach(() => {
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })
  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  const mount = async (onDelete: () => Promise<void> = async () => undefined, onClose: () => void = () => undefined) => {
    await act(async () => root.render(<AccountDeleteDialog onDelete={onDelete} onClose={onClose} />))
  }
  const button = (name: string) => [...container.querySelectorAll('button')].find((b) => b.textContent?.includes(name)) as HTMLButtonElement | undefined
  const click = async (name: string) => {
    const b = button(name)
    if (!b) throw new Error(`no button "${name}"`)
    await act(async () => b.dispatchEvent(new MouseEvent('click', { bubbles: true })))
  }
  const type = async (value: string) => {
    const input = container.querySelector('input')!
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value)
      input.dispatchEvent(new Event('input', { bubbles: true }))
    })
  }
  const text = () => container.textContent ?? ''

  it('starts with what goes and what stays, and cancel closes without deleting', async () => {
    const onDelete = vi.fn(async () => undefined)
    const onClose = vi.fn()
    await mount(onDelete, onClose)
    expect(text()).toContain('Hesabını silmek üzeresin')
    expect(text()).toContain('Silinecekler')
    expect(text()).toContain('Kalacaklar')
    await click('Vazgeç')
    expect(onClose).toHaveBeenCalled()
    expect(onDelete).not.toHaveBeenCalled()
  })

  it('deletes only once the phrase is typed', async () => {
    const onDelete = vi.fn(async () => undefined)
    await mount(onDelete)
    await click('Devam et')
    expect(button('Hesabımı kalıcı olarak sil')!.disabled).toBe(true)
    await type('hesabımı')
    expect(button('Hesabımı kalıcı olarak sil')!.disabled).toBe(true)
    await type(DELETE_PHRASE.toUpperCase())
    expect(button('Hesabımı kalıcı olarak sil')!.disabled).toBe(false)
    await click('Hesabımı kalıcı olarak sil')
    expect(onDelete).toHaveBeenCalledTimes(1)
  })

  it('shows the work while it runs and cannot be closed then', async () => {
    let finish!: () => void
    const onDelete = vi.fn(() => new Promise<void>((ok) => (finish = ok)))
    const onClose = vi.fn()
    await mount(onDelete, onClose)
    await click('Devam et')
    await type(DELETE_PHRASE)
    await click('Hesabımı kalıcı olarak sil')
    expect(text()).toContain('Hesabın siliniyor')
    await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })))
    expect(onClose).not.toHaveBeenCalled()
    await act(async () => finish())
  })

  it('says why it failed and lets the person try again', async () => {
    await mount(async () => {
      throw new Error('Hesap silinemedi; biraz sonra tekrar dene.')
    })
    await click('Devam et')
    await type(DELETE_PHRASE)
    await click('Hesabımı kalıcı olarak sil')
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Hesap silinemedi')
    expect(button('Hesabımı kalıcı olarak sil')!.disabled).toBe(false)
  })

  it('goes back from the phrase to the list', async () => {
    await mount()
    await click('Devam et')
    await click('Geri')
    expect(text()).toContain('Silinecekler')
  })
})
