// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SETTINGS, type Settings } from '../data/db'
import type { ReviewEvent } from '../engine/types'
import { MemoryNudge } from './MemoryNudge'
import { setTried } from './memoryAdvice'

const events: ReviewEvent[] = []
vi.mock('../data/instance', () => ({
  db: { events: { count: async () => events.length }, allEvents: async () => events },
}))

const DAY = 86_400_000
/** `cards` cards, each answered on `steps` days a day apart: cards × (steps − 1) scored reviews. */
function history(cards: number, steps: number): ReviewEvent[] {
  const out: ReviewEvent[] = []
  for (let c = 0; c < cards; c++) {
    for (let s = 0; s < steps; s++) {
      out.push({ entryId: `w${c}`, skill: 'recognition', mode: 'normal', rating: 3, timestamp: new Date(Date.UTC(2026, 0, 1) + s * 2 * DAY) } as unknown as ReviewEvent)
    }
  }
  return out
}

let root: Root
let host: HTMLDivElement
const mount = async (settings: Settings = DEFAULT_SETTINGS) => {
  const open = vi.fn()
  await act(async () => {
    root.render(<MemoryNudge settings={settings} onOpen={open} />)
  })
  await act(async () => {
    await new Promise((r) => setTimeout(r, 20))
  })
  return open
}

beforeEach(() => {
  events.length = 0
  localStorage.clear()
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

describe('MemoryNudge', () => {
  it('says nothing with too few answers', async () => {
    events.push(...history(10, 5))
    await mount()
    expect(host.textContent).toBe('')
  })

  it('offers the first fit with enough answers, and opens Settings', async () => {
    events.push(...history(300, 5)) // 1200 scored reviews
    const open = await mount()
    expect(host.textContent).toContain('sana göre ayarlanabilir')
    act(() => host.querySelector<HTMLButtonElement>('.habit-nudge-main')!.click())
    expect(open).toHaveBeenCalledTimes(1)
  })

  it('stays quiet after a fit that kept the defaults', async () => {
    events.push(...history(300, 5))
    setTried(1200)
    await mount()
    expect(host.textContent).toBe('')
  })

  it('stays quiet while a recent personal model is in use', async () => {
    events.push(...history(300, 5))
    await mount({ ...DEFAULT_SETTINGS, fsrsWeights: [1], fsrsFit: { at: new Date().toISOString(), reviews: 1200, improvement: 0.05 } })
    expect(host.textContent).toBe('')
  })
})
