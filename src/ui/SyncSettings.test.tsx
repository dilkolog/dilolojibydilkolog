// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { runSync, getSyncCode } from './syncRunner'
import { SyncSettings } from './SyncSettings'

vi.mock('./syncRunner', () => ({
  getSyncCode: vi.fn(),
  setSyncCode: vi.fn(),
  runSync: vi.fn(),
  NOT_ALLOWED: 'Bu hesapta eşitleme izni yok.',
}))

vi.mock('./RestorePoints', () => ({
  RestorePoints: () => null,
}))

describe('SyncSettings', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>
  const mockGetSyncCode = vi.mocked(getSyncCode)
  const mockRunSync = vi.mocked(runSync)

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSyncCode.mockResolvedValue('ABCDE-FGHIJ-KLMNO-PQRST')
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  const mount = async () => {
    await act(async () => {
      root.render(<SyncSettings />)
    })
  }

  const getSyncButton = () => {
    const buttons = Array.from(container.querySelectorAll('button'))
    return buttons.find((b) => b.textContent?.trim() === 'Şimdi eşitle')
  }

  it('shows warning message when runSync returns skipped media items', async () => {
    mockRunSync.mockResolvedValue({
      received: 1,
      sent: 0,
      skipped: 2,
    })

    await mount()

    const syncBtn = getSyncButton()
    expect(syncBtn).toBeDefined()

    await act(async () => {
      syncBtn!.click()
    })

    const statusEl = container.querySelector('[role="status"].error')
    expect(statusEl).not.toBeNull()
    expect(statusEl?.textContent).toContain('2 görsel/ses kaydı eşitlenemedi (çok büyük ya da yüklenemedi)')
    expect(statusEl?.textContent).toContain('Kelimelerin ve ilerlemen eşitlendi')
  })

  it('does not show skipped media warning when skipped is 0', async () => {
    mockRunSync.mockResolvedValue({
      received: 2,
      sent: 1,
      skipped: 0,
    })

    await mount()

    const syncBtn = getSyncButton()
    expect(syncBtn).toBeDefined()

    await act(async () => {
      syncBtn!.click()
    })

    const statusEl = container.querySelector('[role="status"].error')
    expect(statusEl).toBeNull()
    expect(container.textContent).not.toContain('eşitlenemedi')
  })
})
