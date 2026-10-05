// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it, vi } from 'vitest'
import type { Health } from '../engine/growth'
import { GrowingPlant, Plant } from './Plant'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

async function show(props: { stage: number; health?: Health }[]) {
  const el = document.createElement('div')
  const root = createRoot(el)
  const svg = () => el.querySelector('svg')!
  await act(async () => root.render(<Plant {...props[0]} />))
  const seen = [svg().getAttribute('class')]
  for (const p of props.slice(1)) {
    await act(async () => root.render(<Plant {...p} />))
    seen.push(svg().getAttribute('class'))
  }
  await act(async () => root.unmount())
  return { seen, el }
}

describe('plant motion', () => {
  it('is still when first drawn', async () => {
    const { seen } = await show([{ stage: 3 }])
    expect(seen[0]).not.toMatch(/is-(grow|water)/)
  })

  it('grows into a new stage, and only forwards', async () => {
    const { seen } = await show([{ stage: 2 }, { stage: 3 }])
    expect(seen[1]).toContain('is-grow')
    const back = await show([{ stage: 3 }, { stage: 2 }])
    expect(back.seen[1]).not.toContain('is-grow')
  })

  it('perks up with a few drops when a thirsty plant is watered', async () => {
    const { seen } = await show([{ stage: 2, health: 'wilting' }, { stage: 2, health: 'fresh' }])
    expect(seen[1]).toContain('is-water')
    const dried = await show([{ stage: 2 }, { stage: 2, health: 'thirsty' }])
    expect(dried.seen[1]).not.toContain('is-water')
  })
})

describe('growing plant (the summary)', () => {
  it('shows the old stage, then grows into the new one after its delay', async () => {
    vi.useFakeTimers()
    const el = document.createElement('div')
    const root = createRoot(el)
    await act(async () => root.render(<GrowingPlant from={1} to={3} delay={600} size={40} />))
    const svg = () => el.querySelector('svg')!
    expect(svg().getAttribute('aria-label')).toContain('Tanıdık')
    expect(svg().getAttribute('class')).not.toContain('is-grow')
    await act(async () => void vi.advanceTimersByTime(650))
    expect(svg().getAttribute('class')).toContain('is-grow')
    expect(svg().querySelectorAll('.plant-leaf')).toHaveLength(4)
    await act(async () => root.unmount())
    vi.useRealTimers()
  })
})
