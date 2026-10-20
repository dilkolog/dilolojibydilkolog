// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../data/instance'
import { createEntry } from '../data/wordInput'
import { DataSettings } from './DataSettings'

describe('DataSettings', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>
  let onDataChanged: () => void

  beforeEach(async () => {
    vi.clearAllMocks()
    await db.vocabulary.clear()
    await db.wordStates.clear()
    await db.events.clear()
    await db.mistakes.clear()
    await db.meta.clear()

    // Add an initial word so we can verify if data is touched or restored
    await db.vocabulary.put(createEntry({ word: 'bonjour', meaning: 'merhaba' }, 'fr', new Date()))

    onDataChanged = vi.fn()
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
      root.render(<DataSettings language="fr" onDataChanged={onDataChanged} />)
    })
  }

  const waitFor = async (fn: () => boolean | Promise<boolean>, timeout = 2000) => {
    const start = Date.now()
    while (Date.now() - start < timeout) {
      if (await fn()) return
      await new Promise((r) => setTimeout(r, 20))
    }
    throw new Error('waitFor timed out')
  }

  const triggerFileUpload = async (file: File) => {
    const input = container.querySelector('input[type="file"]') as HTMLInputElement
    Object.defineProperty(input, 'files', {
      value: [file],
      writable: true,
      configurable: true,
    })
    await act(async () => {
      input.dispatchEvent(new Event('change', { bubbles: true }))
    })
  }

  it('corrupted file shows error message and does not touch data', async () => {
    await mount()

    const corruptedFile = new File(['{"app":"wrong-app"}'], 'bad.json', { type: 'application/json' })
    await triggerFileUpload(corruptedFile)

    const errorEl = container.querySelector('[role="status"].error')
    expect(errorEl).not.toBeNull()
    expect(errorEl?.textContent).toContain('Diloloji yedeği değil')

    // Verify existing data wasn't touched
    const words = await db.vocabulary.toArray()
    expect(words).toHaveLength(1)
    expect(words[0].lemma).toBe('bonjour')
    expect(onDataChanged).not.toHaveBeenCalled()
  })

  it('valid backup shows confirmation dialog', async () => {
    await mount()

    const validBackup = {
      app: 'kelime-koc',
      version: 3,
      exportedAt: '2026-10-10T10:00:00.000Z',
      vocabulary: [createEntry({ word: 'merci', meaning: 'teşekkürler' }, 'fr', new Date())],
      wordStates: [],
      events: [],
      mistakes: [],
    }
    const validFile = new File([JSON.stringify(validBackup)], 'yedek.json', { type: 'application/json' })
    await triggerFileUpload(validFile)

    const dialog = container.querySelector('[role="alertdialog"]')
    expect(dialog).not.toBeNull()
    expect(dialog?.textContent).toContain('Yedek geri yüklensin mi?')
    expect(dialog?.textContent).toContain('1 kelime')

    // Dialog has not been confirmed yet, so data is still the original word
    const words = await db.vocabulary.toArray()
    expect(words[0].lemma).toBe('bonjour')
  })

  it('shows "Önceki hâle dön" after restore and brings data back when confirmed', async () => {
    await mount()

    const validBackup = {
      app: 'kelime-koc',
      version: 3,
      exportedAt: '2026-10-10T10:00:00.000Z',
      vocabulary: [createEntry({ word: 'salut', meaning: 'selam' }, 'fr', new Date())],
      wordStates: [],
      events: [],
      mistakes: [],
    }
    const validFile = new File([JSON.stringify(validBackup)], 'yedek.json', { type: 'application/json' })
    await triggerFileUpload(validFile)

    // Confirm restore
    const confirmBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Geri yükle')
    await act(async () => {
      confirmBtn!.click()
      await new Promise((r) => setTimeout(r, 20))
    })

    await waitFor(async () => {
      const list = await db.vocabulary.toArray()
      return list.length === 1 && list[0].lemma === 'salut'
    })

    expect(onDataChanged).toHaveBeenCalledTimes(1)

    // "Önceki hâle dön" button should be visible in UI
    let undoBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Önceki hâle dön')
    if (!undoBtn) {
      await waitFor(() => {
        undoBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Önceki hâle dön')
        return Boolean(undoBtn)
      })
    }
    expect(undoBtn).toBeDefined()

    // Click "Önceki hâle dön" to open confirmation dialog
    await act(async () => {
      undoBtn!.click()
    })

    const undoDialog = container.querySelector('[role="alertdialog"]')
    expect(undoDialog).not.toBeNull()
    expect(undoDialog?.textContent).toContain('Önceki hâle dönülsün mü?')

    // Confirm undoing restore
    const confirmUndoBtn = Array.from(undoDialog!.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Önceki hâle dön')
    expect(confirmUndoBtn).toBeDefined()
    await act(async () => {
      confirmUndoBtn!.click()
      await new Promise((r) => setTimeout(r, 20))
    })

    await waitFor(() => (onDataChanged as unknown as { mock: { calls: unknown[] } }).mock.calls.length === 2)
    expect(onDataChanged).toHaveBeenCalledTimes(2)

    const revertedWords = await db.vocabulary.toArray()
    expect(revertedWords).toHaveLength(1)
    expect(revertedWords[0].lemma).toBe('bonjour')

    // The copy is dropped after the data is back: the button goes on a later render (slow under a full run).
    const undoButton = () => Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Önceki hâle dön')
    await waitFor(() => !container.querySelector('[role="alertdialog"]') && !undoButton(), 5000)
    expect(undoButton()).toBeUndefined()
  })

  it('allows copying word list in Quizlet format', async () => {
    const writeTextMock = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: writeTextMock },
      configurable: true,
      writable: true,
    })

    await mount()
    const quizletBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.trim() === 'Quizlet',
    )
    expect(quizletBtn).toBeDefined()

    await act(async () => {
      quizletBtn!.click()
    })

    expect(writeTextMock).toHaveBeenCalled()
    expect(writeTextMock.mock.calls[0][0]).toContain('bonjour\tmerhaba')
  })
})
