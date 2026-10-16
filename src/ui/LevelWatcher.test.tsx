// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LevelWatcher } from './LevelWatcher'
import { markLevelSeen, seenLevel } from './levelSeen'
import type { GameState } from './game'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const mockGame = (level: number, title = 'Çaylak') =>
  ({
    level: {
      level,
      title,
      into: 10,
      needed: 100,
      progress: 0.1,
    },
  }) as unknown as GameState

describe('LevelWatcher', () => {
  let el: HTMLDivElement
  let root: ReturnType<typeof createRoot>

  beforeEach(() => {
    localStorage.clear()
    el = document.createElement('div')
    document.body.append(el)
    root = createRoot(el)
  })

  afterEach(() => {
    act(() => root.unmount())
    el.remove()
    vi.restoreAllMocks()
  })

  it('initializes seen level silently on first run', async () => {
    await act(async () => root.render(<LevelWatcher game={mockGame(2)} paused={false} />))
    expect(el.querySelector('.milestone-backdrop')).toBeNull()
    expect(seenLevel()).toBe(2)
  })

  it('celebrates when level increases above seen level', async () => {
    markLevelSeen(1)
    await act(async () => root.render(<LevelWatcher game={mockGame(2, 'Meraklı')} paused={false} />))
    expect(el.querySelector('.milestone-backdrop')).not.toBeNull()
    expect(el.textContent).toContain('Seviye 2!')
    expect(el.textContent).toContain('Meraklı')
    expect(seenLevel()).toBe(2)

    // Closes on Devam click
    const btn = el.querySelector<HTMLButtonElement>('.milestone-actions button.btn')
    expect(btn).not.toBeNull()
    await act(async () => btn?.click())
    expect(el.querySelector('.milestone-backdrop')).toBeNull()
  })

  it('stays quiet when paused (e.g. inside session or summary)', async () => {
    markLevelSeen(1)
    await act(async () => root.render(<LevelWatcher game={mockGame(2)} paused={true} />))
    expect(el.querySelector('.milestone-backdrop')).toBeNull()
  })
})
