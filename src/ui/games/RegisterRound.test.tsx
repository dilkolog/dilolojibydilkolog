// @vitest-environment happy-dom
import 'fake-indexeddb/auto'
;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../../data/instance'
import { registerItems } from '../../data/register'

vi.mock('../sounds', () => ({ sfx: { correct: vi.fn(), wrong: vi.fn(), levelUp: vi.fn(), near: vi.fn() } }))
const { RegisterRound } = await import('./RegisterRound')

let root: ReturnType<typeof createRoot> | undefined
beforeEach(async () => {
  await db.meta.delete('register')
})
afterEach(() => {
  act(() => root?.unmount())
  document.body.innerHTML = ''
})

const wait = () => act(async () => void (await new Promise((r) => setTimeout(r, 40))))
const click = (el: Element | null | undefined) => act(async () => (el as HTMLElement).click())
const byText = (host: HTMLElement, text: string) => [...host.querySelectorAll('button')].find((b) => b.textContent?.includes(text))

async function mount() {
  const host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root!.render(<RegisterRound language="fr" onExit={() => {}} />))
  await wait()
  return host
}
const opt = (host: HTMLElement, text: string) => [...host.querySelectorAll<HTMLButtonElement>('.option')].find((o) => o.querySelector('.option-serif')?.textContent === text)
const current = (host: HTMLElement) => registerItems.find((i) => i.language === 'fr' && `“${i.tr}” demek istiyorsun` === host.querySelector('.word')?.textContent)!

describe('RegisterRound', () => {
  it('shows a situation and a thought, and the right way of saying it is logged and explained', async () => {
    const host = await mount()
    await click(byText(host, 'tura başla'))
    expect(host.textContent).toContain('1 / 8')
    const item = current(host)
    const situation = host.querySelector('.prompt-label')!.textContent
    const register = (situation!.includes('arkadaş') ? 'informal' : situation!.includes('mülakat') ? 'formal' : 'standard') as 'informal' | 'standard' | 'formal'
    expect(host.querySelectorAll('.option')).toHaveLength(3)
    await click(opt(host, item[register]))
    expect(host.textContent).toContain('Doğru')
    expect(host.querySelectorAll('.register-ladder li')).toHaveLength(3)
    expect((await db.getRegisterLog())[`${item.id}|${register}`]).toMatchObject({ ok: 1, wrong: 0 })
  })

  it('says which register a wrong choice was', async () => {
    const host = await mount()
    await click(byText(host, 'tura başla'))
    const item = current(host)
    const situation = host.querySelector('.prompt-label')!.textContent!
    const right = situation.includes('arkadaş') ? item.informal : situation.includes('mülakat') ? item.formal : item.standard
    await click([...host.querySelectorAll<HTMLButtonElement>('.option')].find((o) => o.querySelector('.option-serif')?.textContent !== right))
    expect(host.textContent).toContain('Bu ortama uymaz')
    expect(host.textContent).toMatch(/söyleyiş/)
    expect(host.querySelector('.register-target-badge')).not.toBeNull()
    expect(host.querySelector('.register-wrong-badge')).not.toBeNull()
  })

  it('renders a register preview ladder on the intro screen', async () => {
    const host = await mount()
    expect(host.querySelector('.register-preview-card')).not.toBeNull()
    expect(host.textContent).toContain('la bouffe')
    expect(host.textContent).toContain('la nourriture')
    expect(host.textContent).toContain('les mets')
  })
})
