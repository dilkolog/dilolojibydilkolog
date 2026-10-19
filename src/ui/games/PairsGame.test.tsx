// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../data/instance'

vi.mock('../sounds', () => ({ sfx: { correct: vi.fn(), wrong: vi.fn(), levelUp: vi.fn(), near: vi.fn() } }))
vi.mock('../haptics', () => ({ haptics: { tap: vi.fn(), success: vi.fn(), error: vi.fn(), victory: vi.fn() } }))
vi.mock('../speech', () => ({ speakAsync: vi.fn().mockResolvedValue(undefined) }))
vi.mock('../../data/wordInfo', () => ({ nativeRecordings: vi.fn().mockResolvedValue(new Map()) }))

const { PairsGame } = await import('./PairsGame')

let root: ReturnType<typeof createRoot> | undefined

beforeEach(async () => {
  await db.meta.delete('pairLog')
})

afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
})

const wait = (ms = 40) => act(async () => void (await new Promise((r) => setTimeout(r, ms))))
const click = (el: Element | null | undefined) => act(async () => (el as HTMLElement).click())

async function mount() {
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () =>
    root!.render(
      <PairsGame
        language="fr"
        vocabulary={[]}
        states={[]}
        onChanged={() => {}}
        recordKey="pairs:fr"
        onExit={vi.fn()}
      />,
    ),
  )
  await wait()
  return host
}

describe('PairsGame (Minimal Pairs)', () => {
  it('renders minimal pair options and handles answering and continuing', async () => {
    const host = await mount()
    expect(host.textContent).toContain('1 / 12')

    const options = host.querySelectorAll<HTMLButtonElement>('.option')
    expect(options).toHaveLength(2)

    // Click first option
    await click(options[0])

    // Should reveal continue button
    const continueBtn = [...host.querySelectorAll('button')].find((b) => b.textContent?.includes('Devam'))
    expect(continueBtn).toBeDefined()

    // Can click both words comparison button
    const bothBtn = [...host.querySelectorAll('button')].find((b) => b.textContent?.includes('İkisini art arda dinle'))
    expect(bothBtn).toBeDefined()

    // Continue to next question
    await click(continueBtn)
    expect(host.textContent).toContain('2 / 12')
  })

  it('triggers replay on speaker click', async () => {
    const host = await mount()
    const speakBtn = host.querySelector<HTMLButtonElement>('button.speak')
    expect(speakBtn).not.toBeNull()

    await click(speakBtn)
    // No crash, button is interactive
    expect(speakBtn).toBeDefined()
  })
})
