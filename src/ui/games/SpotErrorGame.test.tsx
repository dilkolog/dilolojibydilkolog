// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../data/instance'
import { SPOT_ERRORS } from '../../data/spotErrors'

vi.mock('../sounds', () => ({ sfx: { correct: vi.fn(), wrong: vi.fn(), levelUp: vi.fn(), near: vi.fn() } }))
const { SpotErrorGame } = await import('./SpotErrorGame')

let root: ReturnType<typeof createRoot> | undefined
beforeEach(async () => {
  await db.meta.delete('spot-error')
})
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
})

const wait = () => act(async () => void (await new Promise((r) => setTimeout(r, 40))))
const click = (el: Element | null | undefined) => act(async () => (el as HTMLElement).click())
const byText = (host: HTMLElement, text: string) =>
  [...host.querySelectorAll('button')].find((b) => b.textContent?.includes(text))

async function mount() {
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () =>
    root!.render(
      <SpotErrorGame
        language="fr"
        recordKey="spot-error:fr"
        onExit={() => {}}
      />,
    ),
  )
  await wait()
  return host
}

describe('SpotErrorGame', () => {
  it('starts round and reveals multiple choice options when faulty token is tapped', async () => {
    const host = await mount()
    expect(host.textContent).toContain('Hata Avcısı')

    await click(byText(host, 'Avı Başlat'))
    expect(host.textContent).toContain('1 /')

    // Find the faulty word from the active sentence
    const tokenButtons = host.querySelectorAll<HTMLButtonElement>('.spot-token')
    expect(tokenButtons.length).toBeGreaterThan(3)

    // Find which question is active
    const activeSentence = [...tokenButtons].map((b) => b.textContent?.trim()).join(' ')
    const q = SPOT_ERRORS.find((s) => s.language === 'fr' && s.sentence === activeSentence)
    expect(q).toBeTruthy()

    // Clicking an innocent token triggers hint
    const innocentIndex = (q!.errorIndex + 1) % tokenButtons.length
    await click(tokenButtons[innocentIndex])
    expect(host.textContent).toContain('Bu kelimede hata yok')

    // Clicking the actual faulty token opens options
    await click(tokenButtons[q!.errorIndex])
    const options = host.querySelectorAll('.spot-option-btn')
    expect(options.length).toBe(3)

    // Pick the correct option
    const correctBtn = [...options].find((b) => b.textContent?.includes(q!.correct))
    expect(correctBtn).toBeTruthy()
    await click(correctBtn)

    // Should show correct explanation
    expect(host.textContent).toContain('Harika! Doğru tespit')
    expect(host.textContent).toContain(q!.rule)

    // Check that db log was recorded
    const log = await db.getSpotErrorLog()
    expect(log[q!.id]).toMatchObject({ ok: 1, wrong: 0 })
  })
})
