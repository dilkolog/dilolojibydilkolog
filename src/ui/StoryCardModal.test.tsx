// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StoryCardModal } from './StoryCardModal'
import { ShareProgress } from './ShareProgress'
import type { ProgressReport } from './progressReport'

let root: ReturnType<typeof createRoot> | undefined
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

const wait = () => act(async () => void (await new Promise((r) => setTimeout(r, 40))))

const mockReport: ProgressReport = {
  language: 'fr',
  name: 'Ali Aydın',
  date: '18 Ekim 2026',
  summary: [
    ['Aktif kelime', 45],
    ['Seri', 12],
    ['Cevaplar', 150],
  ],
  days: [
    { date: '2026-10-18', answers: 30, correct: 28, xp: 90 },
    { date: '2026-10-17', answers: 40, correct: 36, xp: 120 },
  ],
  stages: [['Çiçek', 15]],
  skills: [['recall', 88]],
  hard: [],
  errors: [],
  exams: [],
}

describe('StoryCardModal', () => {
  it('renders story preview and export buttons', async () => {
    const onClose = vi.fn()
    const host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)

    await act(async () => {
      root!.render(
        <StoryCardModal
          report={mockReport}
          streak={12}
          activeWords={45}
          onClose={onClose}
        />,
      )
    })
    await wait()

    expect(host.textContent).toContain('Hikaye Kartı (9:16)')
    expect(host.textContent).toContain('Hikayede Paylaş')
    expect(host.textContent).toContain('Görseli İndir (PNG)')

    const closeBtn = host.querySelector<HTMLButtonElement>('.story-card-dialog-head .icon-btn')
    expect(closeBtn).toBeTruthy()
    await act(async () => {
      closeBtn!.click()
    })
    expect(onClose).toHaveBeenCalled()
  })

  it('can be opened from ShareProgress menu', async () => {
    const host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)

    await act(async () => {
      root!.render(
        <ShareProgress
          build={() => mockReport}
          words={{ entries: [], states: [] }}
          streak={12}
          activeWords={45}
        />,
      )
    })
    await wait()

    // Click "Paylaş" button to open popover
    const shareBtn = host.querySelector<HTMLButtonElement>('.popover > button')
    expect(shareBtn).toBeTruthy()
    await act(async () => {
      shareBtn!.click()
    })
    await wait()

    // Menu should contain "Hikaye Kartı (9:16)"
    const storyItem = Array.from(document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')).find((el) =>
      el.textContent?.includes('Hikaye Kartı (9:16)'),
    )
    expect(storyItem).toBeTruthy()

    await act(async () => {
      storyItem!.click()
    })
    await wait()

    // StoryCardModal is now visible in DOM
    expect(document.body.textContent).toContain('Instagram veya WhatsApp hikayesi için öğrenci karnesi')
  })
})
