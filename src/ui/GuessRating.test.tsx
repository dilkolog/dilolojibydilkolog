// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../data/instance'
import { GuessRating } from './GuessRating'

let root: ReturnType<typeof createRoot> | undefined
beforeEach(async () => {
  await db.meta.delete('deduction')
})
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
})

async function mount(onDone = vi.fn()) {
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root!.render(<GuessRating word="champignons" language="fr" onDone={onDone} />))
  return { host, onDone }
}
const wait = () => act(async () => void (await new Promise((r) => setTimeout(r, 40))))
const button = (host: HTMLElement, text: string) => [...host.querySelectorAll('button')].find((b) => b.textContent === text)!

describe('GuessRating', () => {
  it('keeps the rating as a count for the language, and closes', async () => {
    const { host, onDone } = await mount()
    expect(host.textContent).toContain('champignons')
    await act(async () => button(host, 'Tam bildim').click())
    await act(async () => button(host, 'Tam bildim').click())
    await wait()
    expect(onDone).toHaveBeenCalledTimes(2)
    expect((await db.getDeductionLog()).fr).toEqual({ exact: 2, close: 0, surprised: 0 })
  })

  it('can be skipped without a trace', async () => {
    const { host, onDone } = await mount()
    await act(async () => button(host, 'Geç').click())
    await wait()
    expect(onDone).toHaveBeenCalled()
    expect(await db.getDeductionLog()).toEqual({})
  })
})
