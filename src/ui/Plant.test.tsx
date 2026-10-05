// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { describe, expect, it } from 'vitest'
import type { Health } from '../engine/growth'
import { Plant } from './Plant'

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
