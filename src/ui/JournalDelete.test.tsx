// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { KelimeDB } from '../data/db'
import { ProduceScreen } from './Produce'
import * as toastFeed from './toastFeed'

describe('ProduceScreen: Journal entry deletion and undo', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>
  let db: KelimeDB
  const onChanged = vi.fn()
  const onOpenSettings = vi.fn()

  beforeEach(async () => {
    vi.clearAllMocks()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    db = new KelimeDB('test-journal-delete')

    await db.saveJournal({
      id: 'j-1',
      language: 'fr',
      at: '2026-10-17T12:00:00.000Z',
      text: "Aujourd'hui, j'ai décidé d'aller à un apogée dénotation.",
    })
    await db.saveJournal({
      id: 'j-2',
      language: 'fr',
      at: '2026-10-17T13:00:00.000Z',
      text: "Aujourd'hui j'ai décidé d'aller à une apogée denotation.",
    })
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  const mount = async () => {
    await act(async () => {
      root.render(
        <ProduceScreen
          db={db}
          language="fr"
          vocabulary={[]}
          states={[]}
          onChanged={onChanged}
          onOpenSettings={onOpenSettings}
        />,
      )
    })
    // Allow useEffect db.getJournal to settle
    await act(async () => {
      await new Promise((r) => setTimeout(r, 50))
    })
  }

  it('renders previous entries with delete buttons', async () => {
    await mount()
    const items = container.querySelectorAll('.journal-item')
    expect(items.length).toBe(2)

    const deleteBtns = container.querySelectorAll('.journal-delete-btn')
    expect(deleteBtns.length).toBe(2)
  })

  it('clicking delete button opens ConfirmDialog, and confirming deletes entry with undoable toast', async () => {
    const undoableSpy = vi.spyOn(toastFeed, 'undoable')
    await mount()

    const firstDeleteBtn = container.querySelector<HTMLButtonElement>('.journal-delete-btn')!
    await act(async () => {
      firstDeleteBtn.click()
    })

    // Dialog is visible
    expect(container.textContent).toContain('Bu yazı silinsin mi?')
    expect(container.textContent).toContain("Aujourd'hui")

    // Click confirm "Sil"
    const confirmBtn = Array.from(container.querySelectorAll<HTMLButtonElement>('.dialog button')).find(
      (b) => b.textContent?.trim() === 'Sil',
    )!
    expect(confirmBtn).toBeDefined()

    await act(async () => {
      confirmBtn.click()
    })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20))
    })

    // Entry should be removed from DB and UI
    const remainingInDb = await db.getJournal('fr')
    expect(remainingInDb.length).toBe(1)
    expect(container.querySelectorAll('.journal-item').length).toBe(1)

    // undoable was called
    expect(undoableSpy).toHaveBeenCalledWith('Yazı silindi', expect.any(Function))

    // Trigger undo callback
    const undoAction = undoableSpy.mock.calls[0][1]
    await act(async () => {
      await undoAction()
    })
    await act(async () => {
      await new Promise((r) => setTimeout(r, 20))
    })

    // Restored in DB and UI
    const restoredInDb = await db.getJournal('fr')
    expect(restoredInDb.length).toBe(2)
    expect(container.querySelectorAll('.journal-item').length).toBe(2)
  })

  it('allows canceling deletion dialog without changes', async () => {
    await mount()

    const firstDeleteBtn = container.querySelector<HTMLButtonElement>('.journal-delete-btn')!
    await act(async () => {
      firstDeleteBtn.click()
    })

    expect(container.textContent).toContain('Bu yazı silinsin mi?')

    // Click "Vazgeç"
    const cancelBtn = Array.from(container.querySelectorAll<HTMLButtonElement>('.dialog button')).find(
      (b) => b.textContent?.trim() === 'Vazgeç',
    )!
    expect(cancelBtn).toBeDefined()

    await act(async () => {
      cancelBtn.click()
    })

    // Dialog is gone, both entries still exist
    expect(container.querySelector('.dialog')).toBeNull()
    expect(container.querySelectorAll('.journal-item').length).toBe(2)
    expect(await db.getJournal('fr')).toHaveLength(2)
  })
})
