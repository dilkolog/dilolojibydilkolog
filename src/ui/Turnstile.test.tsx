// @vitest-environment happy-dom
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Turnstile } from './Turnstile'

let root: ReturnType<typeof createRoot> | undefined
let options: Record<string, unknown> | undefined
const fake = { render: vi.fn(), reset: vi.fn(), remove: vi.fn() }

beforeEach(() => {
  options = undefined
  fake.render.mockReset().mockImplementation((_el: HTMLElement, o: Record<string, unknown>) => {
    options = o
    return 'w1'
  })
  fake.reset.mockReset()
  fake.remove.mockReset()
  window.turnstile = fake
})
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
  delete window.turnstile
})

async function mount(round: number, onToken: (t: string | null) => void) {
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root!.render(<Turnstile siteKey="0x4AAA" round={round} onToken={onToken} />))
  return host
}

describe('Turnstile', () => {
  it('renders the check with the site key and hands its token over; an expired token is taken back', async () => {
    const tokens: (string | null)[] = []
    await mount(0, (t) => tokens.push(t))
    expect(fake.render).toHaveBeenCalledOnce()
    expect(options).toMatchObject({ sitekey: '0x4AAA', language: 'tr' })
    act(() => (options!.callback as (t: string) => void)('tok-1'))
    act(() => (options!['expired-callback'] as () => void)())
    expect(tokens).toEqual([null, 'tok-1', null])
  })

  it('a new round (after a try spent the token) resets the widget; leaving the form removes it', async () => {
    const tokens: (string | null)[] = []
    const onToken = (t: string | null) => tokens.push(t)
    await mount(0, onToken)
    await act(async () => root!.render(<Turnstile siteKey="0x4AAA" round={1} onToken={onToken} />))
    expect(fake.reset).toHaveBeenCalledWith('w1')
    expect(tokens.at(-1)).toBeNull()
    act(() => root!.unmount())
    root = undefined
    expect(fake.remove).toHaveBeenCalledWith('w1')
  })
})
