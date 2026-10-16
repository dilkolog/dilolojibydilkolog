// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../data/instance'

vi.mock('../sounds', () => ({ sfx: { correct: vi.fn(), wrong: vi.fn(), levelUp: vi.fn(), near: vi.fn() } }))
const { CollocationsGame } = await import('./CollocationsGame')

let root: ReturnType<typeof createRoot> | undefined
beforeEach(async () => {
  await db.meta.delete('collocations')
  document.body.innerHTML = '<div id="root"></div>'
  root = createRoot(document.getElementById('root')!)
})

afterEach(() => {
  act(() => root?.unmount())
  root = undefined
  vi.restoreAllMocks()
})

describe('CollocationsGame', () => {
  it('renders the intro phase and starts the round on click', async () => {
    await act(async () => {
      root!.render(
        <CollocationsGame
          language="fr"
          best={80}
          recordKey="collocations:fr"
          onExit={vi.fn()}
        />,
      )
    })

    const body = document.getElementById('root')!
    expect(body.textContent).toContain('Edat ve Kalıplar')
    expect(body.textContent).toContain('Rekorun: %80')

    const startBtn = Array.from(body.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Başla'),
    )
    expect(startBtn).toBeDefined()

    await act(async () => {
      startBtn?.click()
    })

    // Now in play phase
    expect(body.textContent).toContain('1 / 10')
    expect(body.textContent).toContain('___')

    // Find option buttons
    const options = Array.from(
      body.querySelectorAll('.colloc-option-btn'),
    ) as HTMLButtonElement[]
    expect(options).toHaveLength(4)

    // Click the first option
    await act(async () => {
      options[0]?.click()
    })

    // Feedback box should be visible
    expect(body.querySelector('.colloc-feedback-box')).toBeDefined()
    expect(body.textContent).toContain('Sonraki soru')
  })
})
