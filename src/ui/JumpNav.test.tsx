// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import { JumpNav } from './JumpNav'

describe('JumpNav', () => {
  const groups: readonly (readonly [string, string])[] = [
    ['section-a', 'Genel'],
    ['section-b', 'Detaylar'],
    ['section-c', 'Ayarlar'],
  ]

  it('renders all section buttons and marks the initial one active', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(<JumpNav groups={groups} label="Bölüm gezintisi" />)
    })

    const buttons = container.querySelectorAll('button')
    expect(buttons).toHaveLength(3)
    expect(buttons[0]?.textContent).toBe('Genel')
    expect(buttons[0]?.getAttribute('aria-pressed')).toBe('true')
    expect(buttons[1]?.getAttribute('aria-pressed')).toBe('false')

    root.unmount()
    container.remove()
  })

  it('respects initialActive prop', async () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(<JumpNav groups={groups} label="Bölüm gezintisi" initialActive="section-b" />)
    })

    const buttons = container.querySelectorAll('button')
    expect(buttons[1]?.getAttribute('aria-pressed')).toBe('true')

    root.unmount()
    container.remove()
  })

  it('calls onPick and updates aria-pressed when clicked', async () => {
    const onPick = vi.fn()
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)

    await act(async () => {
      root.render(<JumpNav groups={groups} label="Bölüm gezintisi" onPick={onPick} />)
    })

    const buttons = container.querySelectorAll('button')
    await act(async () => {
      buttons[2]?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(onPick).toHaveBeenCalledWith('section-c')
    expect(buttons[2]?.getAttribute('aria-pressed')).toBe('true')
    expect(buttons[0]?.getAttribute('aria-pressed')).toBe('false')

    root.unmount()
    container.remove()
  })
})
