// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../data/instance'
import { createEntry } from '../data/wordInput'
import { BulkImport } from './BulkImport'

function setTextareaValue(textarea: HTMLTextAreaElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(textarea), 'value')?.set
  if (setter) {
    setter.call(textarea, value)
  } else {
    textarea.value = value
  }
  textarea.dispatchEvent(new Event('input', { bubbles: true }))
  textarea.dispatchEvent(new Event('change', { bubbles: true }))
}

describe('BulkImport wizard (Quizlet & Memrise)', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>
  let onImported: () => void

  beforeEach(async () => {
    vi.clearAllMocks()
    await db.vocabulary.clear()
    await db.wordStates.clear()
    await db.events.clear()
    await db.meta.clear()

    // Add a word for export testing
    await db.vocabulary.put(
      createEntry({ word: 'thrive', meaning: 'gelişmek', example: 'Plants thrive.' }, 'en', new Date()),
    )

    onImported = vi.fn()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    act(() => root.unmount())
    container.remove()
  })

  const mount = async () => {
    await act(async () => {
      root.render(
        <BulkImport
          db={db}
          language="en"
          existing={new Set(['en:existing'])}
          onImported={onImported}
        />,
      )
    })
  }

  it('renders with import and export tabs', async () => {
    await mount()
    const summary = container.querySelector('summary')
    expect(summary?.textContent).toContain('Quizlet, Memrise')

    const tabs = container.querySelectorAll('.wizard-tab')
    expect(tabs).toHaveLength(2)
    expect(tabs[0].textContent).toContain('İçe Aktar')
    expect(tabs[1].textContent).toContain('Dışa Aktar')
  })

  it('detects Quizlet format and shows column mapping header controls', async () => {
    await mount()
    const textarea = container.querySelector('textarea.bulk-import-textarea') as HTMLTextAreaElement
    expect(textarea).toBeTruthy()

    await act(async () => {
      setTextareaValue(textarea, 'thrive\tgelişmek\nabandon\tterk etmek')
    })

    // Detect banner appears
    const banner = container.querySelector('.detect-banner')
    expect(banner).toBeTruthy()
    expect(banner?.textContent).toContain('Quizlet')

    // Column select dropdowns appear above table columns
    const colSelects = container.querySelectorAll('.col-select') as NodeListOf<HTMLSelectElement>
    expect(colSelects.length).toBeGreaterThanOrEqual(2)
    expect(colSelects[0].value).toBe('word')
    expect(colSelects[1].value).toBe('meaning')

    // Table preview displays rows
    const rows = container.querySelectorAll('.preview-table tbody tr')
    expect(rows).toHaveLength(2)
    expect(rows[0].textContent).toContain('thrive')
    expect(rows[0].textContent).toContain('gelişmek')
  })

  it('swaps columns when clicking swap button', async () => {
    await mount()
    const textarea = container.querySelector('textarea.bulk-import-textarea') as HTMLTextAreaElement
    await act(async () => {
      setTextareaValue(textarea, 'thrive\tgelişmek')
    })

    const swapBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Takas Et'),
    )
    expect(swapBtn).toBeTruthy()

    await act(async () => {
      swapBtn?.click()
    })

    const colSelects = container.querySelectorAll('.col-select') as NodeListOf<HTMLSelectElement>
    expect(colSelects[0].value).toBe('meaning')
    expect(colSelects[1].value).toBe('word')
  })

  it('switches to export mode and allows copying Quizlet text', async () => {
    // Mock navigator.clipboard safely
    const writeTextMock = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    })

    await mount()
    const exportTab = container.querySelectorAll('.wizard-tab')[1] as HTMLButtonElement

    await act(async () => {
      exportTab.click()
    })

    // Wait for word to load
    await new Promise((r) => setTimeout(r, 50))

    expect(container.textContent).toContain('Quizlet veya Memrise')

    const copyBtn = Array.from(container.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Panoya Kopyala'),
    )
    expect(copyBtn).toBeTruthy()

    await act(async () => {
      copyBtn?.click()
    })

    expect(writeTextMock).toHaveBeenCalled()
    expect(writeTextMock.mock.calls[0][0]).toContain('thrive\tgelişmek')
  })
})
