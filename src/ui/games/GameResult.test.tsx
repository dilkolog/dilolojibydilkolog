// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GameResult } from './GameResult'

let root: ReturnType<typeof createRoot> | undefined
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

const wait = () => act(async () => void (await new Promise((r) => setTimeout(r, 40))))

describe('GameResult', () => {
  it('renders victory celebration with burst, victory styling, and haptic trigger', async () => {
    const vibrateMock = vi.fn()
    Object.defineProperty(navigator, 'vibrate', {
      value: vibrateMock,
      configurable: true,
      writable: true,
    })

    const onAgain = vi.fn()
    const onExit = vi.fn()

    const host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)

    await act(async () => {
      root!.render(
        <GameResult
          title="Tebrikler!"
          headline="%100 Kusursuz Tur"
          accuracy={1.0}
          record={true}
          stats={[
            { label: 'Doğru', value: '12 / 12' },
            { label: 'Süre', value: '45 sn' },
          ]}
          onAgain={onAgain}
          onExit={onExit}
        />,
      )
    })
    await wait()

    expect(host.textContent).toContain('Tebrikler!')
    expect(host.textContent).toContain('%100 Kusursuz Tur')
    expect(host.textContent).toContain('12 / 12')
    expect(host.textContent).toContain('Tekrar oyna')
    expect(host.textContent).toContain('Oyunlara dön')

    // Victory card class
    const card = host.querySelector('.game-result-card.is-victory')
    expect(card).toBeTruthy()

    // Perfect ring class
    const ring = host.querySelector('.game-result-ring.is-perfect')
    expect(ring).toBeTruthy()

    // Confetti burst rendered
    expect(host.querySelector('.burst')).toBeTruthy()

    // Haptics triggered
    expect(vibrateMock).toHaveBeenCalled()

    // Button actions
    const againBtn = host.querySelector<HTMLButtonElement>('.btn')
    expect(againBtn).toBeTruthy()
    await act(async () => {
      againBtn!.click()
    })
    expect(onAgain).toHaveBeenCalled()
  })
})
