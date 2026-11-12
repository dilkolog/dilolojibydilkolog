// @vitest-environment happy-dom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

let asker: ((wrong: boolean) => Promise<string | null>) | null = null
vi.mock('../../data/adminApi', () => ({ setOwnerSecretAsker: (fn: typeof asker) => void (asker = fn) }))

const { OwnerSecretDialog } = await import('./OwnerSecretDialog')

let host: HTMLDivElement
let root: Root
beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  act(() => root.render(<OwnerSecretDialog />))
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
})

const type = (value: string) => {
  const input = host.querySelector('input')!
  const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  act(() => {
    set.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

describe('OwnerSecretDialog', () => {
  it('shows nothing until asked, then hands back what the owner typed', async () => {
    expect(host.querySelector('[role="dialog"]')).toBeNull()
    let answer!: Promise<string | null>
    act(() => void (answer = asker!(false)))
    expect(host.textContent).toContain('OWNER_STEP_SECRET')
    type('  gizli-deger  ')
    act(() => host.querySelector('form')!.requestSubmit())
    expect(await answer).toBe('gizli-deger')
    expect(host.querySelector('[role="dialog"]')).toBeNull()
  })

  it('says when the last one was wrong, and Vazgeç answers nothing', async () => {
    let answer!: Promise<string | null>
    act(() => void (answer = asker!(true)))
    expect(host.textContent).toContain('yanlıştı')
    act(() => [...host.querySelectorAll('button')].find((b) => b.textContent === 'Vazgeç')!.click())
    expect(await answer).toBeNull()
  })
})
