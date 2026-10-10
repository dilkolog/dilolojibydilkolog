// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db, scheduler } from '../data/instance'
import { createEntry } from '../data/wordInput'
import type { PlanItem } from '../engine/dailyPlan'
import type { UserWordState, VocabularyEntry } from '../engine/types'
import { SessionScreen } from './Session'

describe('Session: "Unuttum" (I forgot) feature', () => {
  let container: HTMLDivElement
  let root: ReturnType<typeof createRoot>
  const onFinish = vi.fn()
  const onQuit = vi.fn()
  let entry: VocabularyEntry

  beforeEach(async () => {
    vi.clearAllMocks()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)

    entry = createEntry(
      { word: 'la maison', meaning: 'ev', example: 'La *maison* est grande.', exampleTranslation: 'Ev büyük.' },
      'fr',
      new Date(),
    )
    await db.vocabulary.clear()
    await db.vocabulary.put(entry)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
  })

  const mount = async (items: PlanItem[]) => {
    await act(async () => {
      root.render(
        <SessionScreen
          db={db}
          scheduler={scheduler}
          mode="normal"
          options={{}}
          vocabulary={[entry]}
          states={[] as UserWordState[]}
          mistakes={[]}
          items={items}
          seed={42}
          onFinish={onFinish}
          onQuit={onQuit}
        />,
      )
    })
  }

  it('renders "Unuttum" button on standard choice exercise', async () => {
    const items: PlanItem[] = [
      { entryId: entry.id, exerciseType: 'mc_meaning', kind: 'exercise', skill: 'recognition', reason: 'due' },
    ]
    await mount(items)

    const forgotBtn = container.querySelector('button.forgot-chip') as HTMLButtonElement
    expect(forgotBtn).not.toBeNull()
    expect(forgotBtn.textContent).toContain('Unuttum')
  })

  it('clicking "Unuttum" reveals the answer, counts as wrong, and provides friendly feedback', async () => {
    const items: PlanItem[] = [
      { entryId: entry.id, exerciseType: 'mc_meaning', kind: 'exercise', skill: 'recognition', reason: 'due' },
    ]
    await mount(items)

    const forgotBtn = container.querySelector('button.forgot-chip') as HTMLButtonElement
    expect(forgotBtn).not.toBeNull()

    await act(async () => {
      forgotBtn.click()
      await new Promise((r) => setTimeout(r, 50))
    })

    // Results feedback shows the reassuring forgot message
    expect(container.textContent).toContain('Bakarak öğrenmek de öğrenmektir: bu kelime birazdan bir kez daha gelecek.')

    // It is a lesson, not a mistake: its own sheet (not the red one), its own title, and one note, not two that repeat each other.
    expect(container.querySelector('.sheet.forgot')).not.toBeNull()
    expect(container.querySelector('.sheet.wrong')).toBeNull()
    expect(container.textContent).toContain('Unuttun, olur. İşte cevap:')
    expect(container.textContent).not.toContain('Olsun, doğrusu')
    expect(container.querySelector('.return-note')).toBeNull()
    expect(container.textContent).not.toContain('Yanlış dokundum')

    // Expected answer is revealed
    expect(container.textContent).toContain('ev')

    // "Unuttum" button is no longer present after answer is revealed
    expect(container.querySelector('button.forgot-chip')).toBeNull()

    // Continue button is available to proceed
    const continueBtn = Array.from(container.querySelectorAll('button')).find((b) => /Devam/.test(b.textContent ?? ''))
    expect(continueBtn).toBeDefined()
  })

  it('pressing Alt + U triggers "Unuttum"', async () => {
    const items: PlanItem[] = [
      { entryId: entry.id, exerciseType: 'mc_meaning', kind: 'exercise', skill: 'recognition', reason: 'due' },
    ]
    await mount(items)

    expect(container.querySelector('button.forgot-chip')).not.toBeNull()

    // Trigger Alt + U keyboard shortcut
    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, code: 'KeyU', altKey: true }))
      await new Promise((r) => setTimeout(r, 50))
    })

    // Same feedback as clicking
    expect(container.textContent).toContain('Bakarak öğrenmek de öğrenmektir: bu kelime birazdan bir kez daha gelecek.')
    expect(container.querySelector('button.forgot-chip')).toBeNull()
  })
})
